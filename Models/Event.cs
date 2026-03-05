using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Travello.Models
{
    public class Event
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("event_title")]
        public string EventTitle { get; set; }

        [BsonElement("detail")]
        public string Detail { get; set; }

        [BsonElement("location")]
        public List<string> Location { get; set; }

        [BsonElement("locations")]
        public List<LocationData> Locations { get; set; }

        [BsonElement("start_date")]
        public DateTime StartDate { get; set; }

        [BsonElement("end_date")]
        public DateTime EndDate { get; set; }

        [BsonElement("open_date")]
        public DateTime? OpenDate { get; set; }

        [BsonElement("event_tag")]
        public List<string> EventTag { get; set; }

        [BsonElement("event_img_path")]
        public string? EventImgPath { get; set; }

        [BsonElement("trip_rules")]
        public string? TripRules { get; set; }

        [BsonElement("recruit_question")]
        public string RecruitQuestion { get; set; }

        [BsonElement("attendees")]
        public int Attendees { get; set; }

        [BsonElement("attendees_limit")]
        public int AttendeesLimit { get; set; }

        [BsonElement("itinerary")]
        public List<ItineraryItem> Itinerary { get; set; }

        [BsonElement("packing_list")]
        public List<string> PackingList { get; set; }

        [BsonElement("created_at")]
        public DateTime CreatedAt { get; set; }

        [BsonElement("creator_id")]
        public string CreatorId { get; set; }

        [BsonElement("isRegistrationClosed")]
        public bool IsRegistrationClosed { get; set; } = false;

        [BsonElement("closingReason")]
        public string? ClosingReason { get; set; }
    }

    public class LocationData
    {
        [BsonElement("place_name")]
        public string PlaceName { get; set; }

        [BsonElement("latitude")]
        public double Latitude { get; set; }

        [BsonElement("longitude")]
        public double Longitude { get; set; }
    }

    public class ItineraryItem
    {
        [BsonElement("day_index")]
        public int DayIndex { get; set; }

        [BsonElement("day_label")]
        public string DayLabel { get; set; }

        [BsonElement("place_index")]
        public int PlaceIndex { get; set; }

        [BsonElement("day_date")]
        public DateTime? DayDate { get; set; }

        [BsonElement("activity_name")]
        public string ActivityName { get; set; }

        [BsonElement("activity_time")]
        public DateTime? ActivityTime { get; set; }

        [BsonElement("google_map_url")]
        public string? GoogleMapUrl { get; set; }

        [BsonElement("latitude")]
        public double Latitude { get; set; }

        [BsonElement("longitude")]
        public double Longitude { get; set; }

        [BsonElement("note")]
        public string? Note { get; set; }

        [BsonElement("expense")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal? Expense { get; set; }

        [BsonElement("expense_items")]
        public List<ExpenseItem> ExpenseItems { get; set; } = new();
    }

    public class ExpenseItem
    {
        [BsonElement("name")]
        public string Name { get; set; }

        [BsonElement("amount")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal Amount { get; set; }
    }
}