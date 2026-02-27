using System.Runtime.CompilerServices;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models
{
    public class ChatRoomModel
    {
        // [BsonID]
        // [BsonRepresentation(BsonType.ObjectId)]
        // public string? Id {get; set;}
        public int? event_id { get; set; }
        public int? user_id { get; set; }
        public string? chat_name { get; set; } //เดี๋ยวปรับเป็นชื่อ event ดึงชื่อมาจาก class event
        public int? last_message_id { get; set; }
    }
}

// user มี event_id ของตัวเอง chat มี event_id เหมือนกันเอามา map กันว่าอันไหนตรงกันแล้วดึงมาจาก database แล้วเอาขึ้นมาโชว์ของ user นั้น