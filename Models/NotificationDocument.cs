using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models;

[BsonIgnoreExtraElements]
public class NotificationDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("user_id")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("message")]
    public string Message { get; set; } = string.Empty;

    [BsonElement("reason")]
    [BsonIgnoreIfNull]
    public string? Reason { get; set; }

    [BsonElement("read")]
    public bool Read { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "default";

    [BsonElement("image_url")]
    [BsonIgnoreIfNull]
    public string? ImageUrl { get; set; }

    [BsonElement("imageUrl")]
    [BsonIgnoreIfNull]
    public string? LegacyImageUrl { get; set; }

    [BsonElement("url")]
    [BsonIgnoreIfNull]
    public string? Url { get; set; }

    [BsonElement("created_at")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class NotificationViewModel
{
    public string Id { get; set; } = string.Empty;
    public string Time { get; set; } = "Just now";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public bool Read { get; set; }
    public string Status { get; set; } = "default";
    public string ImageUrl { get; set; } = "/images/notification.png";
    public string Url { get; set; } = string.Empty;
}