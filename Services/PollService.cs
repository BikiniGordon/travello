using MongoDB.Driver;
using MongoDB.Bson;
using Travello.Models;

namespace Travello.Services
{
    public class PollService
    {
        private readonly IMongoCollection<PollModel> _polls;
        private readonly IMongoCollection<BsonDocument> _events;

        public PollService(IMongoDatabase database)
        {
            _polls = database.GetCollection<PollModel>("polls");
            _events = database.GetCollection<BsonDocument>("events");
        }

        public async Task<List<PollModel>> GetPollsByEventIdAsync(string eventId)
        {
            var filter = Builders<PollModel>.Filter.Eq(p => p.EventId, eventId);
            var sort = Builders<PollModel>.Sort.Descending(p => p.CreatedAt);
            return await _polls.Find(filter).Sort(sort).ToListAsync();
        }

        public async Task<PollModel?> GetPollByIdAsync(string pollId)
        {
            return await _polls.Find(p => p.Id == pollId).FirstOrDefaultAsync();
        }

        public async Task CreatePollAsync(PollModel poll)
        {
            await _polls.InsertOneAsync(poll);
        }

        public async Task VoteAsync(string pollId, int optionIndex, string userId)
        {
            var poll = await GetPollByIdAsync(pollId);
            if (poll == null || poll.IsEnded) return;
            if (optionIndex < 0 || optionIndex >= poll.Options.Count) return;

            if (!poll.AllowMultiple)
            {
                // Remove user's vote from all options first
                for (int i = 0; i < poll.Options.Count; i++)
                {
                    var pullFilter = Builders<PollModel>.Filter.Eq(p => p.Id, pollId);
                    var pullUpdate = Builders<PollModel>.Update.Pull($"options.{i}.voters", userId);
                    await _polls.UpdateOneAsync(pullFilter, pullUpdate);
                }
            }

            // Add vote to selected option
            var filter = Builders<PollModel>.Filter.Eq(p => p.Id, pollId);
            var update = Builders<PollModel>.Update.AddToSet($"options.{optionIndex}.voters", userId);
            await _polls.UpdateOneAsync(filter, update);
        }

        public async Task SaveVoteResultForEndedPollAsync(PollModel poll)
        {
            if (poll == null || !poll.IsEnded || string.IsNullOrWhiteSpace(poll.EventId))
            {
                return;
            }

            if (!ObjectId.TryParse(poll.EventId, out var eventObjectId))
            {
                return;
            }

            int topVoteCount = poll.Options.Count > 0 ? poll.Options.Max(option => option.Voters.Count) : 0;
            var topOptions = poll.Options
                .Where(option => option.Voters.Count == topVoteCount)
                .ToList();

            var filter = Builders<BsonDocument>.Filter.Eq("_id", eventObjectId);
            var eventDocument = await _events
                .Find(filter)
                .Project(Builders<BsonDocument>.Projection.Include("vote_result"))
                .FirstOrDefaultAsync();

            if (eventDocument == null)
            {
                return;
            }

            var voteResults = new List<VoteResultDocument>();

            if (eventDocument.TryGetValue("vote_result", out var existingVoteResultValue))
            {
                if (existingVoteResultValue.IsBsonArray)
                {
                    foreach (var item in existingVoteResultValue.AsBsonArray)
                    {
                        if (!item.IsBsonDocument)
                        {
                            continue;
                        }

                        var itemDoc = item.AsBsonDocument;
                        voteResults.Add(new VoteResultDocument
                        {
                            PollId = itemDoc.GetValue("poll_id", string.Empty).AsString,
                            Question = itemDoc.GetValue("question", string.Empty).AsString,
                            Answer = itemDoc.GetValue("answer", string.Empty).AsString
                        });
                    }
                }
                else if (existingVoteResultValue.IsBsonDocument)
                {
                    var itemDoc = existingVoteResultValue.AsBsonDocument;
                    voteResults.Add(new VoteResultDocument
                    {
                        PollId = itemDoc.GetValue("poll_id", string.Empty).AsString,
                        Question = itemDoc.GetValue("question", string.Empty).AsString,
                        Answer = itemDoc.GetValue("answer", string.Empty).AsString
                    });
                }
            }

            var latestAnswer = topVoteCount <= 0
                ? "No result"
                : topOptions.Count > 1
                    ? $"Draw: {string.Join(", ", topOptions.Select(option => option.Text))}"
                    : topOptions.FirstOrDefault()?.Text ?? string.Empty;
            var normalizedQuestion = NormalizeQuestion(poll.Question);
            var pollId = poll.Id ?? string.Empty;
            var matchingResults = voteResults
                .Where(result => IsSameResultEntry(result, pollId, normalizedQuestion))
                .ToList();

            if (matchingResults.Count > 0)
            {
                foreach (var existingResult in matchingResults)
                {
                    existingResult.PollId = pollId;
                    existingResult.Question = poll.Question;
                    existingResult.Answer = latestAnswer;
                }
            }
            else
            {
                voteResults.Add(new VoteResultDocument
                {
                    PollId = pollId,
                    Question = poll.Question,
                    Answer = latestAnswer
                });
            }

            var voteResultArray = new BsonArray(voteResults.Select(result => new BsonDocument
            {
                { "poll_id", result.PollId ?? string.Empty },
                { "question", result.Question },
                { "answer", result.Answer }
            }));

            var update = Builders<BsonDocument>.Update.Set("vote_result", voteResultArray);
            await _events.UpdateOneAsync(filter, update);
        }

        private static bool IsSameResultEntry(VoteResultDocument result, string pollId, string normalizedQuestion)
        {
            var resultPollId = result.PollId?.Trim() ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(pollId) && string.Equals(resultPollId, pollId, StringComparison.Ordinal))
            {
                return true;
            }

            var resultQuestion = NormalizeQuestion(result.Question);
            return !string.IsNullOrWhiteSpace(normalizedQuestion)
                && string.Equals(resultQuestion, normalizedQuestion, StringComparison.OrdinalIgnoreCase);
        }

        private static string NormalizeQuestion(string? question)
        {
            if (string.IsNullOrWhiteSpace(question))
            {
                return string.Empty;
            }

            return question.Trim();
        }
    }
}
