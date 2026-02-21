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

        public string? event_id { get; set; } // เอาไว้บอกว่าข้อความนี้อยู่ห้องแชทไหน (ทริปไหน)
        public string? sender_id { get; set; } // ชื่อคนส่ง
        public string? message_text { get; set; }       // เนื้อหาข้อความ
        public DateTime timestamp { get; set; } // เวลาที่ส่ง
    }
}