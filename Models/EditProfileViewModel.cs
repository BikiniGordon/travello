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

        // 1. ตัวแปรลับหลังบ้าน: ให้ MongoDB โยน List<ObjectId> มาใส่ไว้ตรงนี้
        [BsonElement("event_id")]
        public List<ObjectId>? db_event_id { get; set; }

        // 2. ตัวแปรหน้าบ้าน: แบบดั้งเดิม (Classic C#) ไม่ใช้ LINQ
        [BsonIgnore]
        public List<string>? event_id 
        { 
            get 
            { 
                // สร้างกระเป๋า
                List<string> stringList = new List<string>();
                
                if (db_event_id != null) 
                {
                    // วนลูปหยิบ ObjectId มาแปลงเป็นข้อความทีละอัน
                    foreach (var id in db_event_id) 
                    {
                        stringList.Add(id.ToString());
                    }
                }
                return stringList;
            }
            set 
            { 
                List<ObjectId> objectIdList = new List<ObjectId>();
                
                if (value != null) 
                {
                    // วนลูปเช็คข้อความทีละอัน
                    foreach (var str in value) 
                    {
                        // ถ้ามันแปลงเป็น ObjectId ได้ ก็จับยัดใส่กระเป๋า
                        if (ObjectId.TryParse(str, out ObjectId parsedId)) 
                        {
                            objectIdList.Add(parsedId);
                        }
                    }
                }
                db_event_id = objectIdList;
            }
        }
        public string? profile_img_path { get; set; }
        
        [BsonRepresentation(BsonType.ObjectId)]
        public List<string> user_tag { get; set; } = new List<string>();

        [BsonIgnore]
        public IFormFile? ProfileImageUpload { get; set; }
    }
}