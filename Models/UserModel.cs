using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models
{
    [BsonIgnoreExtraElements] 
    public class UserModel
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? id { get; set; }

        public string? username { get; set; }
        public string? profile_img_path { get; set; }

        // 🌟 เปลี่ยนจาก List<int> เป็น List<string>
        [BsonRepresentation(BsonType.ObjectId)]
        public List<string> event_id { get; set; } = new List<string>(); 
    }
}