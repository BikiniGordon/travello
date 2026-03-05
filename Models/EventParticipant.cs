using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models
{
    public class EventParticipant
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("event_id")]
        public string EventId { get; set; }

        [BsonElement("user_id")]
        public string UserId { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "pending";

        [BsonElement("joined_at")]
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("recruit_answer")]
        public string RecruitAnswer { get; set; }

        // [BsonElement("joinedAt")]
        // public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    }

    // public class ParticipantAnswer
    // {
    //     [BsonElement("questionId")]
    //     public string QuestionId { get; set; } = "";

    //     [BsonElement("answer")]
    //     public string Answer { get; set; } = "";
    // }
}