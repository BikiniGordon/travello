using System.Diagnostics.Contracts;
using System.Runtime.CompilerServices;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models
{
    public class ChatRoomModel
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? id {get; set;}

        [BsonRepresentation(BsonType.ObjectId)]
        public string? event_id { get; set; }
        public string? chat_name { get; set; } //เดี๋ยวปรับเป็นชื่อ event ดึงชื่อมาจาก class event
        [BsonIgnore] 
        public string? event_location { get; set; }
        [BsonIgnore] 
        public DateTime start_date { get; set; }
        [BsonIgnore] 
        public DateTime end_date { get; set; }
        [BsonIgnore]
        public string? event_img_path { get; set; }
        [BsonRepresentation(BsonType.ObjectId)]
        public string? last_message_id { get; set; }
        public string? last_message_text { get; set; } 
        public DateTime? last_message_time { get; set; }
        public string? image_url { get; set; }
        public string? document_url { get; set; }
        [BsonRepresentation(BsonType.ObjectId)]
        public string? poll_id { get; set; }
    }
}

// user มี event_id ของตัวเอง chat มี event_id เหมือนกันเอามา map กันว่าอันไหนตรงกันแล้วดึงมาจาก database แล้วเอาขึ้นมาโชว์ของ user นั้น