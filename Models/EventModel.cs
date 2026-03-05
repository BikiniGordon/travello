using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models;

[BsonIgnoreExtraElements]
public class EventModel
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? id { get; set; }

    [BsonElement("event_title")]
    public string event_title { get; set; } = string.Empty;

    [BsonElement("detail")]
    public string? detail { get; set; }

    // [BsonElement("location")]
    // public List<string> location { get; set; } = new();

    [BsonElement("start_date")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? start_date { get; set; }

    [BsonElement("end_date")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? end_date { get; set; }

    [BsonElement("event_tag")]
    public List<string> event_tag { get; set; } = new();

    [BsonElement("attendees")]
    public int attendees { get; set; }

    [BsonElement("attendees_limit")]
    public int attendees_limit { get; set; }
}
