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
            return await _polls.Find(p => p.EventId == eventId).ToListAsync();
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

            var winnerOption = poll.Options
                .OrderByDescending(option => option.Voters.Count)
                .FirstOrDefault();

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
                        Question = itemDoc.GetValue("question", string.Empty).AsString,
                        Answer = itemDoc.GetValue("answer", string.Empty).AsString
                    });
                }
            }

            var latestAnswer = winnerOption?.Text ?? string.Empty;
            var existingResult = voteResults.FirstOrDefault(result => result.Question == poll.Question);

            if (existingResult != null)
            {
                existingResult.Answer = latestAnswer;
            }
            else
            {
                voteResults.Add(new VoteResultDocument
                {
                    Question = poll.Question,
                    Answer = latestAnswer
                });
            }

            var voteResultArray = new BsonArray(voteResults.Select(result => new BsonDocument
            {
                { "question", result.Question },
                { "answer", result.Answer }
            }));

            var update = Builders<BsonDocument>.Update.Set("vote_result", voteResultArray);
            await _events.UpdateOneAsync(filter, update);
        }
    }
}
