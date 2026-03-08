using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models
{
    [BsonIgnoreExtraElements]
    public class ChatRoomModel
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? id {get; set;}

        [BsonRepresentation(BsonType.ObjectId)]
        public string? event_id { get; set; }
        public string? chat_name { get; set; } //เดี๋ยวปรับเป็นชื่อ event ดึงชื่อมาจาก class event
        [BsonRepresentation(BsonType.ObjectId)]
        public string? last_message_id { get; set; }
        public string? last_message_text { get; set; }
    }
}

// user มี event_id ของตัวเอง chat มี event_id เหมือนกันเอามา map กันว่าอันไหนตรงกันแล้วดึงมาจาก database แล้วเอาขึ้นมาโชว์ของ user นั้น