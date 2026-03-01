using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Travello.Models;

namespace Travello.Controllers
{
    public class HomeController : Controller
    {
        private readonly IMongoCollection<EventDocument> _eventsCollection;

        public HomeController(IMongoCollection<EventDocument> eventsCollection)
        {
            _eventsCollection = eventsCollection;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        public IActionResult CreateEvent()
        {
            return View("~/Views/Create_event/CreateEvent.cshtml");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateEvent(CreateEventInputModel input)
        {
            if (string.IsNullOrWhiteSpace(input.EventTitle))
            {
                ModelState.AddModelError(nameof(input.EventTitle), "Event title is required.");
                return View("~/Views/Create_event/CreateEvent.cshtml");
            }

            var tags = (input.TagsCsv ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!string.IsNullOrWhiteSpace(input.Category))
            {
                tags.Insert(0, input.Category);
            }

            var normalizedTags = tags
                .Where(tag => !string.IsNullOrWhiteSpace(tag))
                .Select(tag => tag.Trim().ToUpperInvariant())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var plannerRows = ParsePlannerRows(input.PlannerJson);
            var packingList = ParsePackingList(input.PackingListJson);

            DateTime? startDate = ParseDateTimeToUtc(input.StartDate, input.StartTime);
            DateTime? explicitEndDate = ParseDateTimeToUtc(input.EndDate, input.EndTime);
            DateTime? openDate = ParseDateToUtc(input.OpenDate);
            DateTime? itineraryEndDate = plannerRows
                .Select(row => ParseDateToUtc(row.DayDate))
                .Where(date => date.HasValue)
                .Select(date => date!.Value)
                .OrderByDescending(date => date)
                .FirstOrDefault();

            DateTime? endDate = explicitEndDate ?? itineraryEndDate ?? startDate;

            var itinerary = plannerRows
                .Where(row => !string.IsNullOrWhiteSpace(row.PlaceName))
                .Select(row =>
                {
                    var expenseItems = row.Expenses
                        .Where(expense => !string.IsNullOrWhiteSpace(expense.Name) || (expense.Amount.HasValue && expense.Amount.Value > 0))
                        .Select(expense => new ExpenseItemDocument
                        {
                            Name = expense.Name?.Trim() ?? string.Empty,
                            Amount = expense.Amount ?? 0
                        })
                        .ToList();

                    decimal? expenseTotal = expenseItems.Count > 0 ? expenseItems.Sum(expense => expense.Amount) : null;

                    return new ItineraryDocument
                    {
                        DayIndex = row.DayIndex,
                        DayLabel = string.IsNullOrWhiteSpace(row.DayLabel) ? null : row.DayLabel,
                        PlaceIndex = row.PlaceIndex,
                        DayDate = ParseDateToUtc(row.DayDate),
                        ActivityName = row.PlaceName?.Trim() ?? string.Empty,
                        ActivityTime = ParseDateToUtc(row.DayDate),
                        GoogleMapUrl = string.IsNullOrWhiteSpace(row.GoogleMapUrl) ? null : row.GoogleMapUrl,
                        Latitude = row.Latitude,
                        Longitude = row.Longitude,
                        Note = string.IsNullOrWhiteSpace(row.Note) ? null : row.Note,
                        Expense = expenseTotal,
                        ExpenseItems = expenseItems
                    };
                })
                .ToList();

            var locations = itinerary
                .Where(item => !string.IsNullOrWhiteSpace(item.ActivityName))
                .Select(item => new LocationDocument
                {
                    PlaceName = item.ActivityName,
                    Latitude = item.Latitude,
                    Longitude = item.Longitude
                })
                .ToList();

            if (locations.Count == 0 && !string.IsNullOrWhiteSpace(input.LocationName))
            {
                locations.Add(new LocationDocument
                {
                    PlaceName = input.LocationName,
                    Latitude = null,
                    Longitude = null
                });
            }

            var locationNames = locations
                .Select(location => location.PlaceName)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (locationNames.Count == 0 && !string.IsNullOrWhiteSpace(input.LocationName))
            {
                locationNames.Add(input.LocationName);
            }

            var eventDocument = new EventDocument
            {
                EventTitle = input.EventTitle,
                Detail = input.Detail,
                Location = locationNames,
                Locations = locations,
                StartDate = startDate,
                EndDate = endDate,
                OpenDate = openDate,
                EventTag = normalizedTags,
                EventImgPath = null,
                TripRules = input.TripRules,
                RecruitQuestion = input.RecruitQuestion,
                Attendees = 0,
                AttendeesLimit = input.AttendeesLimit,
                Itinerary = itinerary,
                PackingList = packingList,
                CreatedAt = DateTime.UtcNow
            };

            await _eventsCollection.InsertOneAsync(eventDocument);
            TempData["CreateEventSuccess"] = "Event created successfully.";

            return RedirectToAction(nameof(CreateEvent));
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        private static DateTime? ParseDateToUtc(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedDate))
            {
                return DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
            }

            return null;
        }

        private static DateTime? ParseDateTimeToUtc(string? dateValue, string? timeValue)
        {
            if (string.IsNullOrWhiteSpace(dateValue))
            {
                return null;
            }

            if (!DateTime.TryParse(dateValue, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedDate))
            {
                return null;
            }

            if (TimeOnly.TryParse(timeValue, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedTime))
            {
                parsedDate = parsedDate.Date.Add(parsedTime.ToTimeSpan());
            }
            else
            {
                parsedDate = parsedDate.Date;
            }

            return DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
        }

        private static List<PlannerRowInputModel> ParsePlannerRows(string? plannerJson)
        {
            if (string.IsNullOrWhiteSpace(plannerJson))
            {
                return new List<PlannerRowInputModel>();
            }

            try
            {
                return JsonSerializer.Deserialize<List<PlannerRowInputModel>>(plannerJson) ?? new List<PlannerRowInputModel>();
            }
            catch
            {
                return new List<PlannerRowInputModel>();
            }
        }

        private static List<string> ParsePackingList(string? packingListJson)
        {
            if (string.IsNullOrWhiteSpace(packingListJson))
            {
                return new List<string>();
            }

            try
            {
                return (JsonSerializer.Deserialize<List<string>>(packingListJson) ?? new List<string>())
                    .Where(item => !string.IsNullOrWhiteSpace(item))
                    .Select(item => item.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            catch
            {
                return new List<string>();
            }
        }
    }
}
