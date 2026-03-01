using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace Travello.Models;

public class CreateEventInputModel
{
    public string EventTitle { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public int? AttendeesLimit { get; set; }
    public string? Category { get; set; }
    public string? TagsCsv { get; set; }
    public string? RecruitQuestion { get; set; }
    public string? StartDate { get; set; }
    public string? StartTime { get; set; }
    public string? EndDate { get; set; }
    public string? EndTime { get; set; }
    public string? OpenDate { get; set; }
    public string? LocationName { get; set; }
    public string? TripRules { get; set; }
    public string? PlannerJson { get; set; }
    public string? PackingListJson { get; set; }
}

public class EventDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("event_title")]
    public string EventTitle { get; set; } = string.Empty;

    [BsonElement("detail")]
    public string? Detail { get; set; }

    [BsonElement("location")]
    public List<string> Location { get; set; } = new();

    [BsonElement("locations")]
    public List<LocationDocument> Locations { get; set; } = new();

    [BsonElement("start_date")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? StartDate { get; set; }

    [BsonElement("end_date")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? EndDate { get; set; }

    [BsonElement("open_date")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? OpenDate { get; set; }

    [BsonElement("event_tag")]
    public List<string> EventTag { get; set; } = new();

    [BsonElement("event_img_path")]
    public string? EventImgPath { get; set; }

    [BsonElement("trip_rules")]
    public string? TripRules { get; set; }

    [BsonElement("recruit_question")]
    public string? RecruitQuestion { get; set; }

    [BsonElement("attendees")]
    public int Attendees { get; set; }

    [BsonElement("attendees_limit")]
    public int? AttendeesLimit { get; set; }

    [BsonElement("itinerary")]
    public List<ItineraryDocument> Itinerary { get; set; } = new();

    [BsonElement("packing_list")]
    public List<string> PackingList { get; set; } = new();

    [BsonElement("created_at")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class LocationDocument
{
    [BsonElement("place_name")]
    public string PlaceName { get; set; } = string.Empty;

    [BsonElement("latitude")]
    public double? Latitude { get; set; }

    [BsonElement("longitude")]
    public double? Longitude { get; set; }
}

public class ItineraryDocument
{
    [BsonElement("day_index")]
    public int? DayIndex { get; set; }

    [BsonElement("day_label")]
    public string? DayLabel { get; set; }

    [BsonElement("place_index")]
    public int? PlaceIndex { get; set; }

    [BsonElement("day_date")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? DayDate { get; set; }

    [BsonElement("activity_name")]
    public string ActivityName { get; set; } = string.Empty;

    [BsonElement("activity_time")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? ActivityTime { get; set; }

    [BsonElement("google_map_url")]
    public string? GoogleMapUrl { get; set; }

    [BsonElement("latitude")]
    public double? Latitude { get; set; }

    [BsonElement("longitude")]
    public double? Longitude { get; set; }

    [BsonElement("note")]
    public string? Note { get; set; }

    [BsonElement("expense")]
    public decimal? Expense { get; set; }

    [BsonElement("expense_items")]
    public List<ExpenseItemDocument> ExpenseItems { get; set; } = new();
}

public class ExpenseItemDocument
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("amount")]
    public decimal Amount { get; set; }
}

public class PlannerRowInputModel
{
    [JsonPropertyName("dayIndex")]
    public int? DayIndex { get; set; }

    [JsonPropertyName("dayLabel")]
    public string? DayLabel { get; set; }

    [JsonPropertyName("placeIndex")]
    public int? PlaceIndex { get; set; }

    [JsonPropertyName("placeName")]
    public string? PlaceName { get; set; }

    [JsonPropertyName("dayDate")]
    public string? DayDate { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }

    [JsonPropertyName("googleMapUrl")]
    public string? GoogleMapUrl { get; set; }

    [JsonPropertyName("latitude")]
    public double? Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double? Longitude { get; set; }

    [JsonPropertyName("expenses")]
    public List<ExpenseRowInputModel> Expenses { get; set; } = new();
}

public class ExpenseRowInputModel
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("amount")]
    public decimal? Amount { get; set; }
}
