using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace Travello.Models
{
    [BsonIgnoreExtraElements]
    public class EditProfileViewModel
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? user_id { get; set; }
        
        [Required(ErrorMessage = "Username can't be empty.")]
        [Display(Name = "Username")]
        [StringLength(16, MinimumLength = 2, ErrorMessage = "Username must be between 2 and 16 characters.")]
        public string username { get; set; } = null!;

        public string? password { get; set; }

        [Required(ErrorMessage = "First name can't be empty.")]
        [Display(Name = "First name")]
        [RegularExpression(@"^[A-Za-z]+$", ErrorMessage = "First name can only contain letters (A-Z, a-z).")]
        [StringLength(64, MinimumLength = 2, ErrorMessage = "First name must be between 2 and 64 characters.")]
        public string? first_name { get; set; }

        [Required(ErrorMessage = "Last name can't be empty.")]
        [Display(Name = "Last name")]
        [RegularExpression(@"^[A-Za-z]+$", ErrorMessage = "Last name can only contain letters (A-Z, a-z).")]
        [StringLength(128, MinimumLength = 2, ErrorMessage = "Last name must be between 2 and 128 characters.")]
        public string? last_name { get; set; }
        public string? gender { get; set; }
        
        [BsonElement("date_of_birth")]
        public DateTime? date_of_birth { get; set; }
        public string? about_me { get; set; }
        public List<string>? event_id { get; set; } = new List<string>();
        public string? profile_img_path { get; set; }
        public List<string> user_tag { get; set; } = new List<string>();

        [BsonIgnore]
        public IFormFile? ProfileImageUpload { get; set; }
    }
}