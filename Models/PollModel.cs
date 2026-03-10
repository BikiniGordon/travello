using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models
{
    public class PollModel
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("event_id")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string EventId { get; set; } = string.Empty;

        [BsonElement("question")]
        public string Question { get; set; } = string.Empty;

        [BsonElement("options")]
        public List<PollOptionModel> Options { get; set; } = new();

        [BsonElement("deadline")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime Deadline { get; set; }

        [BsonElement("allow_multiple")]
        public bool AllowMultiple { get; set; }

        [BsonElement("anonymous")]
        public bool Anonymous { get; set; }

        [BsonElement("created_by")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string CreatedBy { get; set; } = string.Empty;

        [BsonElement("created_at")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonIgnore]
        public bool IsEnded => DateTime.UtcNow >= Deadline;
    }

    public class PollOptionModel
    {
        [BsonElement("text")]
        public string Text { get; set; } = string.Empty;

        [BsonElement("voters")]
        [BsonRepresentation(BsonType.ObjectId)]
        public List<string> Voters { get; set; } = new();
    }
}
