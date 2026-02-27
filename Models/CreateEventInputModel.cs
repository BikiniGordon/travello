using System.ComponentModel.DataAnnotations;

namespace Travello.Models;

public class CreateEventInputModel
{
    [Required]
    [StringLength(200)]
    public string EventTitle { get; set; } = string.Empty;

    public string? Detail { get; set; }

    [Range(1, 100000)]
    public int? AttendeesLimit { get; set; }

    [StringLength(100)]
    public string? Category { get; set; }

    public string? RecruitQuestion { get; set; }

    public string? StartDate { get; set; }

    public string? StartTime { get; set; }

    public string? ClosingDate { get; set; }

    public string? LocationName { get; set; }

    public string? TripRules { get; set; }

    public string? SelectedTagsCsv { get; set; }

    public string? PlannerJson { get; set; }

    public string? PackItemsCsv { get; set; }

    public string? Latitude { get; set; }

    public string? Longitude { get; set; }
}
