using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Travello.Models;

namespace Travello.Controllers
{
    public class EventController : Controller
    {
        private readonly IMongoCollection<EventDocument> _eventsCollection;

        private static readonly JsonSerializerOptions PlannerJsonSerializerOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private static readonly HashSet<string> KnownCategories = new(StringComparer.OrdinalIgnoreCase)
        {
            "CAMPING",
            "PHOTOGRAPHY",
            "RELAX",
            "SHOPPING",
            "ADVENTURE"
        };

        public EventController(IMongoDatabase database)
        {
            _eventsCollection = database.GetCollection<EventDocument>("events");
        }

        [HttpGet("/Event/Edit/{id}")]
        public async Task<IActionResult> Edit(string id)
        {
            var currentUserId = HttpContext.Session.GetString("UserId");
            var currentUsername = HttpContext.Session.GetString("Username");
            if (string.IsNullOrWhiteSpace(currentUserId))
            {
                TempData["AuthPromptMessage"] = "Please log in before editing an event.";
                TempData["OpenLoginModal"] = "true";
                return RedirectToAction("Index", "Home");
            }

            if (!ObjectId.TryParse(id, out _))
            {
                TempData["CreateEventError"] = "Invalid event id.";
                return RedirectToAction("Index", "Home");
            }

            var existingEvent = await _eventsCollection.Find(e => e.Id == id).FirstOrDefaultAsync();
            if (existingEvent is null)
            {
                TempData["CreateEventError"] = "Event not found.";
                return RedirectToAction("Index", "Home");
            }

            if (!CanEditEvent(existingEvent, currentUserId, currentUsername))
            {
                TempData["CreateEventError"] = "You do not have permission to edit this event.";
                return RedirectToAction("Index", "Home");
            }

            var model = MapEventToInputModel(existingEvent);
            ViewData["InitialPlannerJson"] = JsonSerializer.Serialize(ToPlannerRows(existingEvent.Itinerary), PlannerJsonSerializerOptions);
            ViewData["InitialPackingListJson"] = JsonSerializer.Serialize(existingEvent.PackingList ?? new List<string>(), PlannerJsonSerializerOptions);
            ViewData["InitialPhotoUrl"] = existingEvent.EventImgPath ?? string.Empty;

            return View("~/Views/Event/Edit.cshtml", model);
        }

        [HttpPost("/Event/Edit/{id}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(string id, CreateEventInputModel input)
        {
            var currentUserId = HttpContext.Session.GetString("UserId");
            var currentUsername = HttpContext.Session.GetString("Username");
            if (string.IsNullOrWhiteSpace(currentUserId))
            {
                TempData["AuthPromptMessage"] = "Please log in before editing an event.";
                TempData["OpenLoginModal"] = "true";
                return RedirectToAction("Index", "Home");
            }

            if (!ObjectId.TryParse(id, out _))
            {
                TempData["CreateEventError"] = "Invalid event id.";
                return RedirectToAction("Index", "Home");
            }

            var existingEvent = await _eventsCollection.Find(e => e.Id == id).FirstOrDefaultAsync();
            if (existingEvent is null)
            {
                TempData["CreateEventError"] = "Event not found.";
                return RedirectToAction("Index", "Home");
            }

            if (!CanEditEvent(existingEvent, currentUserId, currentUsername))
            {
                TempData["CreateEventError"] = "You do not have permission to edit this event.";
                return RedirectToAction("Index", "Home");
            }

            input.EventId = id;

            if (string.IsNullOrWhiteSpace(input.Detail))
            {
                ModelState.AddModelError(nameof(input.Detail), "Detail is required.");
            }

            if (string.IsNullOrWhiteSpace(input.TripRules))
            {
                ModelState.AddModelError(nameof(input.TripRules), "Trip rules are required.");
            }

            if (!ModelState.IsValid)
            {
                var firstError = GetFirstModelStateError(ModelState);
                TempData["CreateEventError"] = string.IsNullOrWhiteSpace(firstError)
                    ? "Please check the required fields and try again."
                    : firstError;
                return RedirectToAction(nameof(Edit), new { id });
            }

            var plannerRows = ParsePlannerRows(input.PlannerJson);
            var packingList = ParsePackingList(input.PackingListJson);

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

            var updatedEvent = new EventDocument
            {
                Id = existingEvent.Id,
                EventTitle = existingEvent.EventTitle,
                Detail = input.Detail,
                Location = existingEvent.Location,
                StartDate = existingEvent.StartDate,
                EndDate = existingEvent.EndDate,
                OpenDate = existingEvent.OpenDate,
                EventTag = existingEvent.EventTag,
                EventImgPath = existingEvent.EventImgPath,
                TripRules = input.TripRules,
                RecruitQuestion = existingEvent.RecruitQuestion,
                Attendees = existingEvent.Attendees,
                AttendeesLimit = existingEvent.AttendeesLimit,
                Itinerary = itinerary,
                PackingList = packingList,
                CreatedAt = existingEvent.CreatedAt,
                CreatedBy = existingEvent.CreatedBy
            };

            try
            {
                await _eventsCollection.ReplaceOneAsync(e => e.Id == id, updatedEvent);
                TempData["CreateEventSuccess"] = "Event updated successfully.";
                return RedirectToAction(nameof(Edit), new { id });
            }
            catch
            {
                TempData["CreateEventError"] = "Unable to update event right now. Please try again.";
                return RedirectToAction(nameof(Edit), new { id });
            }
        }

        public IActionResult Detail(int id)
        {
            //mock NO database yet
            var model = new EventDetailViewModel
            {
                EventId = id,
                EventTitle = "ปีนเขาชิวรับแสงอาทิตย์หน้าหนาว",
                Category = "ADVENTURE",
                HostName = "Dearja",
                HostProfileImage = "Ellipse 12.png",
                CoverImage = "cover.png",
                Detail = "Lorem ipsum dolor sit amet...",
                TripRules = "Lorem ipsum dolor sit amet...",
                ClosingDate = new DateTime(2026, 3, 20),
                StartDate = new DateTime(2026, 3, 20),
                EndDate = new DateTime(2026, 3, 26),
                Location = "Everest mountain",
                RemainingSlots = 10,
                AttendeeCount = 21,
                UserStatus = "approved", // none | pending | owner 
                TotalExpenses = 4280,

                PackingList = new List<string> { "คนรู้ใจ", "เสื้อกันหนาว", "รองเท้า" },

                Days = new List<DayViewModel>
                {
                    new DayViewModel
                    {
                        DayNumber = 1,
                        Places = new List<PlaceViewModel>
                        {
                            new PlaceViewModel
                            {
                                Name = "สวนลุม",
                                Description = "เจอกันเวลา 9 โมงเช้า",
                                Expenses = new List<ExpenseViewModel>
                                {
                                    new ExpenseViewModel { Name = "ค่าเดินทาง", Amount = 20 }
                                }
                            },
                            new PlaceViewModel
                            {
                                Name = "วัดอรุณ",
                                Description = "สวดมนต์เอาฤกษ์เอาชัย"
                            }
                        }
                    }
                },

                Attendees = new List<AttendeeViewModel>
                {
                    new AttendeeViewModel { Id=1, Name="Dearja", ProfileImage="pic.png", IsApproved=true },
                    new AttendeeViewModel { Id=2, Name="Tom",    ProfileImage="pic.png", IsApproved=true },
                    new AttendeeViewModel { Id=3, Name="Robin",  ProfileImage="pic.png", IsApproved=true },
                    new AttendeeViewModel { Id=4, Name="Sam",    ProfileImage="pic.png", IsApproved=false },
                },

                JoinQuestions = new List<JoinQuestionViewModel>
                {
                    new JoinQuestionViewModel { Id=1, QuestionText="ทำไมถึงอยากร่วมทริป?" }
                },

                Additions = new List<AdditionViewModel>
                {
                    new AdditionViewModel
                    {
                        Question = "What will we eat the morning of the trip?",
                        Answer = "Ramen"
                    }
                }
            };

            return View(model);
        }

        public JsonResult GetAttendees(int id)
        {
            var attendees = new[]
            {
                new { Id=1, Name="Dearja", ProfileImage="/images/pic.png", IsApproved=true  },
                new { Id=2, Name="Tom",    ProfileImage="/images/pic.png", IsApproved=true  },
                new { Id=3, Name="Robin",  ProfileImage="/images/pic.png", IsApproved=true  },
                new { Id=4, Name="Sam",    ProfileImage="/images/pic.png", IsApproved=false },
            };

            bool isOwner = false; // true

            return Json(new { isOwner, attendees });
        }

        private static CreateEventInputModel MapEventToInputModel(EventDocument eventDocument)
        {
            var (category, tags) = SplitCategoryAndTags(eventDocument.EventTag);

            return new CreateEventInputModel
            {
                EventId = eventDocument.Id,
                PhotoLink = eventDocument.EventImgPath,
                EventTitle = eventDocument.EventTitle,
                Detail = eventDocument.Detail,
                AttendeesLimit = eventDocument.AttendeesLimit,
                Category = category,
                TagsCsv = string.Join(',', tags),
                RecruitQuestion = eventDocument.RecruitQuestion,
                StartDate = eventDocument.StartDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                StartTime = eventDocument.StartDate?.ToString("HH:mm", CultureInfo.InvariantCulture),
                EndDate = eventDocument.EndDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                EndTime = eventDocument.EndDate?.ToString("HH:mm", CultureInfo.InvariantCulture),
                OpenDate = eventDocument.OpenDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                LocationName = eventDocument.Location,
                TripRules = eventDocument.TripRules,
                PlannerJson = JsonSerializer.Serialize(ToPlannerRows(eventDocument.Itinerary), PlannerJsonSerializerOptions),
                PackingListJson = JsonSerializer.Serialize(eventDocument.PackingList ?? new List<string>(), PlannerJsonSerializerOptions)
            };
        }

        private static (string? Category, List<string> Tags) SplitCategoryAndTags(IEnumerable<string>? eventTags)
        {
            var normalized = (eventTags ?? Enumerable.Empty<string>())
                .Where(tag => !string.IsNullOrWhiteSpace(tag))
                .Select(tag => tag.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var category = normalized.FirstOrDefault(tag => KnownCategories.Contains(tag));
            var tags = normalized
                .Where(tag => !string.Equals(tag, category, StringComparison.OrdinalIgnoreCase))
                .ToList();

            return (category, tags);
        }

        private static List<PlannerRowInputModel> ToPlannerRows(IEnumerable<ItineraryDocument>? itinerary)
        {
            return (itinerary ?? Enumerable.Empty<ItineraryDocument>())
                .OrderBy(item => item.DayIndex ?? int.MaxValue)
                .ThenBy(item => item.PlaceIndex ?? int.MaxValue)
                .Select(item => new PlannerRowInputModel
                {
                    DayIndex = item.DayIndex,
                    DayLabel = item.DayLabel,
                    PlaceIndex = item.PlaceIndex,
                    PlaceName = item.ActivityName,
                    DayDate = item.DayDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Note = item.Note,
                    GoogleMapUrl = item.GoogleMapUrl,
                    Latitude = item.Latitude,
                    Longitude = item.Longitude,
                    Expenses = (item.ExpenseItems ?? new List<ExpenseItemDocument>())
                        .Select(expense => new ExpenseRowInputModel
                        {
                            Name = expense.Name,
                            Amount = expense.Amount
                        })
                        .ToList()
                })
                .ToList();
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

        private static bool CanEditEvent(EventDocument eventDocument, string? currentUserId, string? currentUsername)
        {
            var createdBy = eventDocument.CreatedBy?.Trim();
            if (string.IsNullOrWhiteSpace(createdBy))
            {
                return false;
            }

            var normalizedUserId = currentUserId?.Trim();
            var normalizedUsername = currentUsername?.Trim();

            if (!string.IsNullOrWhiteSpace(normalizedUserId) &&
                string.Equals(createdBy, normalizedUserId, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // Backward compatibility: older events may store creator username instead of user id.
            if (!string.IsNullOrWhiteSpace(normalizedUsername) &&
                string.Equals(createdBy, normalizedUsername, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            return false;
        }
    }
}