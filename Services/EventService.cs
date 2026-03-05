using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Travello.Models;

namespace Travello.Services
{
    public class EventService
    {
        private readonly IMongoCollection<Event> _events;
        private readonly IMongoCollection<EventParticipant> _participants;
        private readonly IMongoCollection<User> _users;

        public EventService(IMongoClient client, IOptions<MongoDbSettings> settings)
        {
            var db = client.GetDatabase(settings.Value.DatabaseName);
            _events       = db.GetCollection<Event>("events");
            _participants = db.GetCollection<EventParticipant>("event_participants");
            _users        = db.GetCollection<User>("User");
        }

        
        // EVENT — READ


        public async Task<Event?> GetEventByIdAsync(string id)
        {
            var filter = Builders<Event>.Filter.Eq(e => e.Id, id);
            return await _events.Find(filter).FirstOrDefaultAsync();
        }

        
        // CLOSE REGISTRATION → set IsRegistrationClosed = true -> DB
        

        public async Task CloseRegistrationAsync(string eventId, string reason)
        {
            var filter = Builders<Event>.Filter.Eq(e => e.Id, eventId);
            var update  = Builders<Event>.Update
                .Set(e => e.IsRegistrationClosed, true)
                .Set(e => e.ClosingReason, reason);          // noti

            await _events.UpdateOneAsync(filter, update);
        }

        
        // PARTICIPANT — READ
        

        public async Task<EventParticipant?> GetParticipantAsync(string eventId, string userId)
        {
            var filter = Builders<EventParticipant>.Filter.And(
                Builders<EventParticipant>.Filter.Eq(p => p.EventId, eventId),
                Builders<EventParticipant>.Filter.Eq(p => p.UserId,  userId)
            );
            return await _participants.Find(filter).FirstOrDefaultAsync();
        }

        public async Task<List<EventParticipant>> GetParticipantsAsync(string eventId)
        {
            var filter = Builders<EventParticipant>.Filter.Eq(p => p.EventId, eventId);
            return await _participants.Find(filter).ToListAsync();
        }

        
        // PARTICIPANT — ADD (JOIN)
        

        public async Task AddParticipantAsync(string eventId, string userId, string status, string recruitAnswer)
        {
            var participant = new EventParticipant
            {
                EventId = eventId,
                UserId  = userId,
                Status  = status,   
                RecruitAnswer = recruitAnswer,
                JoinedAt = DateTime.UtcNow
            };

            await _participants.InsertOneAsync(participant);
        }
        
        // PARTICIPANT — REMOVE (LEAVE)

        public async Task RemoveParticipantAsync(string eventId, string userId)
        {
            var filter = Builders<EventParticipant>.Filter.And(
                Builders<EventParticipant>.Filter.Eq(p => p.EventId, eventId),
                Builders<EventParticipant>.Filter.Eq(p => p.UserId,  userId)
            );
            await _participants.DeleteOneAsync(filter);
        }

        // PARTICIPANT — UPDATE STATUS
        

        public async Task UpdateParticipantStatusAsync(string participantId, string newStatus)
        {
            var filter = Builders<EventParticipant>.Filter.Eq(p => p.Id, participantId);

            var updateDef = Builders<EventParticipant>.Update.Set(p => p.Status, newStatus);
            await _participants.UpdateOneAsync(filter, updateDef);
        }

        
        // USER — READ
        

        public async Task<User?> GetUserByIdAsync(string userId)
        {
            var filter = Builders<User>.Filter.Eq(u => u.Id, userId);
            return await _users.Find(filter).FirstOrDefaultAsync();
        }
    }
}