using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Travello.Models;
using Travello.Services;

namespace Travello.Controllers
{
    public class CreateEventController : Controller
    {
        private readonly IMongoCollection<EventDocument> _eventsCollection;
        private readonly IImageUploadService _imageUploadService;

        public CreateEventController(IMongoDatabase database, IImageUploadService imageUploadService)
        {
            _eventsCollection = database.GetCollection<EventDocument>("events");
            _imageUploadService = imageUploadService;
        }

        public IActionResult Index()
        {
            var createdByUserId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrWhiteSpace(createdByUserId))
            {
                TempData["AuthPromptMessage"] = "Please log in before creating an event.";
                TempData["OpenLoginModal"] = "true";
                return RedirectToAction("Index", "Home");
            }

            return View("~/Views/Create_event/CreateEvent.cshtml");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Index(CreateEventInputModel input)
        {
            var createdByUserId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrWhiteSpace(createdByUserId))
            {
                TempData["CreateEventError"] = "Please log in before creating an event.";
                return RedirectToAction(nameof(Index), "CreateEvent");
            }

            var attendeesLimitRaw = Request.Form[nameof(input.AttendeesLimit)].ToString();
            int? attendeesLimit = null;
            const long maxImageSizeBytes = 10 * 1024 * 1024;

            if (input.UploadPhoto is { Length: > 0 })
            {
                if (!input.UploadPhoto.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                {
                    ModelState.AddModelError("UploadPhoto", "Upload photo must be an image file.");
                }

                if (input.UploadPhoto.Length > maxImageSizeBytes)
                {
                    ModelState.AddModelError("UploadPhoto", "Upload photo must be 10 MB or smaller.");
                }
            }

            var normalizedPhotoLink = input.PhotoLink?.Trim();
            if (!string.IsNullOrWhiteSpace(normalizedPhotoLink) && !IsValidHttpUrl(normalizedPhotoLink))
            {
                ModelState.AddModelError(nameof(input.PhotoLink), "Photo link must be a valid http:// or https:// URL.");
            }

            if (string.IsNullOrWhiteSpace(input.EventTitle))
            {
                ModelState.AddModelError(nameof(input.EventTitle), "Event title is required.");
            }

            if (string.IsNullOrWhiteSpace(input.Detail))
            {
                ModelState.AddModelError(nameof(input.Detail), "Detail is required.");
            }

            if (string.IsNullOrWhiteSpace(attendeesLimitRaw))
            {
                ModelState.AddModelError(nameof(input.AttendeesLimit), "Maximum number of attendees is required.");
            }
            else if (!int.TryParse(attendeesLimitRaw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedAttendeesLimit))
            {
                ModelState.AddModelError(nameof(input.AttendeesLimit), "Maximum number of attendees must be a valid number.");
            }
            else if (parsedAttendeesLimit < 0)
            {
                ModelState.AddModelError(nameof(input.AttendeesLimit), "Maximum number of attendees must be zero or greater.");
            }
            else
            {
                attendeesLimit = parsedAttendeesLimit;
                input.AttendeesLimit = parsedAttendeesLimit;
            }

            if (string.IsNullOrWhiteSpace(input.StartDate))
            {
                ModelState.AddModelError(nameof(input.StartDate), "Start date is required.");
            }

            if (string.IsNullOrWhiteSpace(input.StartTime))
            {
                ModelState.AddModelError(nameof(input.StartTime), "Start time is required.");
            }

            if (string.IsNullOrWhiteSpace(input.EndDate))
            {
                ModelState.AddModelError(nameof(input.EndDate), "End date is required.");
            }

            if (string.IsNullOrWhiteSpace(input.EndTime))
            {
                ModelState.AddModelError(nameof(input.EndTime), "End time is required.");
            }

            if (string.IsNullOrWhiteSpace(input.OpenDate))
            {
                ModelState.AddModelError(nameof(input.OpenDate), "Registration open date is required.");
            }

            if (string.IsNullOrWhiteSpace(input.LocationName))
            {
                ModelState.AddModelError(nameof(input.LocationName), "Location is required.");
            }

            if (string.IsNullOrWhiteSpace(input.TripRules))
            {
                ModelState.AddModelError(nameof(input.TripRules), "Trip rules are required.");
            }

            DateTime? startDate = ParseDateTimeToUtc(input.StartDate, input.StartTime);
            DateTime? explicitEndDate = ParseDateTimeToUtc(input.EndDate, input.EndTime);
            DateTime? openDate = ParseDateToUtc(input.OpenDate);

            if (!string.IsNullOrWhiteSpace(input.StartDate) &&
                !string.IsNullOrWhiteSpace(input.StartTime) &&
                !startDate.HasValue)
            {
                ModelState.AddModelError(nameof(input.StartDate), "Start date and time are invalid.");
            }

            if (!string.IsNullOrWhiteSpace(input.EndDate) &&
                !string.IsNullOrWhiteSpace(input.EndTime) &&
                !explicitEndDate.HasValue)
            {
                ModelState.AddModelError(nameof(input.EndDate), "End date and time are invalid.");
            }

            if (startDate.HasValue && explicitEndDate.HasValue && startDate.Value >= explicitEndDate.Value)
            {
                ModelState.AddModelError(nameof(input.EndDate), "End date and time must be after start date and time.");
            }

            if (!string.IsNullOrWhiteSpace(input.OpenDate) && !openDate.HasValue)
            {
                ModelState.AddModelError(nameof(input.OpenDate), "Registration open date is invalid.");
            }

            if (openDate.HasValue && startDate.HasValue && openDate.Value.Date >= startDate.Value.Date)
            {
                ModelState.AddModelError(nameof(input.OpenDate), "Registration open date must be before the start date.");
            }

            if (!ModelState.IsValid)
            {
                var firstError = GetFirstModelStateError(ModelState);
                TempData["CreateEventError"] = string.IsNullOrWhiteSpace(firstError)
                    ? "Please check the required fields and try again."
                    : firstError;
                return RedirectToAction(nameof(Index), "CreateEvent");
            }

            string? uploadedImageUrl = null;
            if (input.UploadPhoto is { Length: > 0 })
            {
                try
                {
                    uploadedImageUrl = await _imageUploadService.UploadEventImageAsync(input.UploadPhoto, HttpContext.RequestAborted);
                }
                catch
                {
                    uploadedImageUrl = null;
                }
            }

            var eventImagePath = !string.IsNullOrWhiteSpace(uploadedImageUrl)
                ? uploadedImageUrl
                : normalizedPhotoLink;

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

            var locationName = input.LocationName?.Trim() ?? string.Empty;

            var eventDocument = new EventDocument
            {
                EventTitle = input.EventTitle,
                Detail = input.Detail,
                Location = locationName,
                StartDate = startDate,
                EndDate = endDate,
                OpenDate = openDate,
                EventTag = normalizedTags,
                EventImgPath = eventImagePath,
                TripRules = input.TripRules,
                RecruitQuestion = input.RecruitQuestion,
                Attendees = 0,
                AttendeesLimit = attendeesLimit,
                Itinerary = itinerary,
                PackingList = packingList,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdByUserId
            };

            try
            {
                await _eventsCollection.InsertOneAsync(eventDocument);
                TempData["CreateEventSuccess"] = "Event created successfully.";
                return RedirectToAction(nameof(Index), "CreateEvent");
            }
            catch
            {
                TempData["CreateEventError"] = "Unable to create event right now. Please try again.";
                return RedirectToAction(nameof(Index), "CreateEvent");
            }
        }

        private static string? GetFirstModelStateError(ModelStateDictionary modelState)
        {
            return modelState.Values
                .SelectMany(value => value.Errors)
                .Select(error => error.ErrorMessage)
                .FirstOrDefault(message => !string.IsNullOrWhiteSpace(message));
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

        private static bool IsValidHttpUrl(string value)
        {
            if (!Uri.TryCreate(value, UriKind.Absolute, out var parsedUri))
            {
                return false;
            }

            return parsedUri.Scheme == Uri.UriSchemeHttp || parsedUri.Scheme == Uri.UriSchemeHttps;
        }
    }
}
