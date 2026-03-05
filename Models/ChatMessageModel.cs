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

        // 🌟 เติม ObjectId ให้ตัวเชื่อมทั้งสองตัว
        [BsonRepresentation(BsonType.ObjectId)]
        public string? event_id { get; set; } 
        
        [BsonRepresentation(BsonType.ObjectId)]
        public string? sender_id { get; set; } 
        
        public string? message_text { get; set; }       // เนื้อหาข้อความ
        
        public DateTime timestamp { get; set; } = DateTime.UtcNow; 
    }
}