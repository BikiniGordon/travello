using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace Travello.Models
{
    public class ChatMessageModel
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }
        [BsonRepresentation(BsonType.ObjectId)]
        public string? chat_room_id { get; set; } 
        [BsonRepresentation(BsonType.ObjectId)]
        public string? sender_id { get; set; } 
        public string? message_text { get; set; } 
        public string? image_url { get; set; }
        public DateTime timestamp { get; set; } = DateTime.UtcNow; 
    }
}