using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;
using System;

namespace Travello.Models
{   
    [BsonIgnoreExtraElements]
    public class EventModel
    {
        [BsonId] 
        [BsonRepresentation(BsonType.ObjectId)]
        public string? event_id { get; set; }

        public string event_title { get; set; } = null!; 
        
        public string location { get; set; } = null!;
        
        public DateTime? start_date { get; set; } = null!; 
        public DateTime? end_date { get; set; } = null!; 
        
        public List<string> event_tag { get; set; } = new List<string>(); 
        public string? event_img_path { get; set; } 

        public int attendees { get; set; }
        public int attendees_limit { get; set; }
        public bool isRegistrationClosed { get; set; }

        [BsonIgnore]
        public int event_attendees_remaining => attendees_limit - attendees;
    }
}