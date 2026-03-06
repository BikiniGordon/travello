using MongoDB.Driver;
using Travello.Models;

namespace Travello.Services
{
    public class PollService
    {
        private readonly IMongoCollection<PollModel> _polls;

        public PollService(IMongoDatabase database)
        {
            _polls = database.GetCollection<PollModel>("polls");
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
    }
}
