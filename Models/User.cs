using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models
{
    [BsonIgnoreExtraElements]
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("username")]
        public string Username { get; set; }

        [BsonElement("password")]
        public string PasswordHash { get; set; }

        [BsonElement("first_name")]
        public string FirstName { get; set; }

        [BsonElement("last_name")]
        public string LastName { get; set; }

        [BsonElement("gender")]
        public string Gender { get; set; }

        [BsonElement("date_of_birth")]
        public DateTime DateOfBirth { get; set; }

        [BsonElement("about_me")]
        public string? AboutMe { get; set; }

        [BsonElement("profile_img_path")]
        public string? ProfileImgPath { get; set; }

        [BsonElement("user_tag")]
        public List<string> UserTag { get; set; } = new();

        [BsonElement("event_id")]
        [BsonRepresentation(BsonType.ObjectId)]
        public List<string> EventId { get; set; } = new();
    }
}