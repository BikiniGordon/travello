using System.Runtime.CompilerServices;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models
{
    public class ChatModel
    {
        // [BsonID]
        // [BsonRepresentation(BsonType.ObjectId)]
        // public string? Id {get; set;}
        public int? event_id { get; set; }
        public int? user_id { get; set; }
        public string? chat_name { get; set; }
        public int? last_message_id { get; set; }
    }
}
