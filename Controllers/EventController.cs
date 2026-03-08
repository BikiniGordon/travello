using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Travello.Models;
using Travello.Services;

namespace Travello.Controllers
{
    public class EventController : Controller
    {
        private readonly EventService _eventService;
        private readonly IMongoCollection<EventDocument> _eventsCollection;
        private readonly INotificationService _notificationService;

        public EventController(EventService eventService, IMongoDatabase database,INotificationService notificationService)
        {
            _eventService = eventService;
            _eventsCollection = database.GetCollection<EventDocument>("events");
            _notificationService = notificationService;
        }

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

            var plannerRows = ParsePlannerRows(input.PlannerJson);
            ValidatePlannerRowsGoogleMaps(plannerRows, ModelState);

            if (!ModelState.IsValid)
            {
                var firstError = GetFirstModelStateError(ModelState);
                TempData["CreateEventError"] = string.IsNullOrWhiteSpace(firstError)
                    ? "Please check the required fields and try again."
                    : firstError;
                return RedirectToAction(nameof(Edit), new { id });
            }

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
                CreatedBy = existingEvent.CreatedBy,
                IsRegistrationClosed = existingEvent.IsRegistrationClosed,  
                ClosingReason = existingEvent.ClosingReason
            };

            try
            {
                await _eventsCollection.ReplaceOneAsync(e => e.Id == id, updatedEvent);
                return RedirectToAction("Detail", "Event", new { id });
            }
            catch
            {
                TempData["CreateEventError"] = "Unable to update event right now. Please try again.";
                return RedirectToAction(nameof(Edit), new { id });
            }
        }


        // DETAIL PAGE

        public async Task<IActionResult> Detail(string id)
        {
            var ev = await _eventService.GetEventByIdAsync(id);
            if (ev == null) return NotFound();

            var currentUserId = HttpContext.Session.GetString("UserId") 
            ?? "69a714e4cbab5148e804d87d";
            
            string userStatus = "none";

            if (ev.IsRegistrationClosed && currentUserId == ev.CreatorId)
            {
                userStatus = "owner_closed";
            }
            else if (ev.IsRegistrationClosed)
            {
                userStatus = "closed";
            }

            else
            {
                var allParticipants = await _eventService.GetParticipantsAsync(id);

                if (!string.IsNullOrEmpty(currentUserId))
                {
                    if (currentUserId == ev.CreatorId)
                    {
                        userStatus = "owner";
                    }
                    else
                    {
                        var participant = await _eventService.GetParticipantAsync(id, currentUserId);
                        if (participant != null)
                        {
                            userStatus = participant.Status;
                        }
                    }
                }
            }

            var allParticipantsFull = await _eventService.GetParticipantsAsync(id);
            var approvedCount = allParticipantsFull.Count(p => p.Status == "approved");
            var pendingCount  = allParticipantsFull.Count(p => p.Status == "pending");
            var displayCount  = userStatus == "owner"
                ? approvedCount + pendingCount
                : approvedCount;

            var host = await _eventService.GetUserByIdAsync(ev.CreatorId);

            var attendeeViewModels = new List<AttendeeViewModel>();
            foreach (var p in allParticipantsFull.Where(p => p.Status == "approved" || p.Status == "pending"))
            {
                var user = await _eventService.GetUserByIdAsync(p.UserId);
                attendeeViewModels.Add(new AttendeeViewModel
                {
                    Id           = p.UserId,
                    Name         = user?.Username ?? p.UserId,
                    ProfileImage = user?.ProfileImgPath ?? "/images/pic.png",
                    IsApproved   = p.Status == "approved"
                });
            }

            var days = ev.Itinerary
                .GroupBy(i => i.DayIndex)
                .OrderBy(g => g.Key)
                .Select(g => new DayViewModel
                {
                    DayNumber = g.Key,
                    Places = g.OrderBy(i => i.PlaceIndex)
                              .Select(i => new PlaceViewModel
                              {
                                  Name        = i.ActivityName,
                                  Description = i.Note ?? "",
                                  Expenses    = i.ExpenseItems.Select(e => new ExpenseViewModel
                                  {
                                      Name   = e.Name,
                                      Amount = e.Amount
                                  }).ToList()
                              }).ToList()
                }).ToList();

            var locations = ev.Itinerary?
            .OrderBy(i => i.DayIndex).ThenBy(i => i.PlaceIndex)
            .Where(i => i.Latitude.HasValue && i.Longitude.HasValue)
            .Select(i => new LocationViewModel
            {
                PlaceName = i.ActivityName,
                Latitude  = i.Latitude ?? 0,
                Longitude = i.Longitude ?? 0
            }).ToList() ?? new();

            var joinQuestions = new List<JoinQuestionViewModel>();
            if (!string.IsNullOrEmpty(ev.RecruitQuestion))
            {
                joinQuestions.Add(new JoinQuestionViewModel
                {
                    Id           = 1,
                    QuestionText = ev.RecruitQuestion
                });
            }

            var totalExpenses = ev.Itinerary
            .SelectMany(i => i.ExpenseItems)
            .Sum(e => e.Amount);

            var model = new EventDetailViewModel
            {
                EventId          = id,
                EventTitle       = ev.EventTitle,
                Category         = ev.EventTag ?? new(),
                HostName         = host?.Username ?? "",
                HostProfileImage = host?.ProfileImgPath,
                CoverImage       = ev.EventImgPath ?? "",
                Detail           = ev.Detail ?? "",
                TripRules        = ev.TripRules ?? "",
                ClosingDate      = ev.OpenDate ?? DateTime.Now,
                StartDate        = ev.StartDate,
                EndDate          = ev.EndDate,
                Location         = ev.Location ?? "",
                RemainingSlots   = ev.AttendeesLimit - ev.Attendees,
                AttendeeCount    = displayCount,
                UserStatus       = userStatus,
                TotalExpenses    = totalExpenses,
                PackingList      = ev.PackingList ?? new(),
                Days             = days,
                Locations        = locations,
                Attendees        = attendeeViewModels,
                JoinQuestions    = joinQuestions,
                HostId           = ev.CreatorId,
                Additions = ev.VoteResult?.Select(v => new AdditionViewModel
                {
                    Question = v.Question,
                    Answer   = v.Answer
                }).ToList() ?? new()
            };

            return View(model);
        }

        // GET ATTENDEES (modal)

        public async Task<IActionResult> GetAttendees(string id)
        {
            var currentUserId = HttpContext.Session.GetString("UserId")
            ?? "69a714e4cbab5148e804d87d";

            var ev = await _eventService.GetEventByIdAsync(id);
            bool isOwner = currentUserId == ev?.CreatorId;

            var allParticipants = await _eventService.GetParticipantsAsync(id);
            var filtered = isOwner
                ? allParticipants.Where(p => p.Status == "approved" || p.Status == "pending")
                : allParticipants.Where(p => p.Status == "approved");

            var attendeesList = new List<object>();
            foreach (var p in filtered)
            {
                var user = await _eventService.GetUserByIdAsync(p.UserId);
                attendeesList.Add(new
                {
                    id           = p.Id,          
                    name         = user?.Username ?? p.UserId,
                    profileImage = user?.ProfileImgPath ?? "/images/pic.png",
                    isApproved   = p.Status == "approved",
                    recruitAnswer = isOwner ? (p.RecruitAnswer ?? "") : ""
                });
            }

            return Json(new { isOwner, attendees = attendeesList });
        }

        // JOIN -> ans q

        [HttpPost]
        public async Task<IActionResult> Join(string id, [FromBody] JoinRequestDto request)
        {
            var currentUserId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

            var ev = await _eventService.GetEventByIdAsync(id);
            if (ev == null) return NotFound();
            if (ev.IsRegistrationClosed) return BadRequest("Registration is closed");

            var existing = await _eventService.GetParticipantAsync(id, currentUserId);
            if (existing != null) return BadRequest("Already joined");

            var recruitAnswer = request.Answers.FirstOrDefault()?.Answer ?? "";
            await _eventService.AddParticipantAsync(id, currentUserId, "pending", recruitAnswer);

            var allParticipants = await _eventService.GetParticipantsAsync(id);
            var pendingCount = allParticipants.Count(p => p.Status == "pending");
            var limit = ev.AttendeesLimit;

            var remaining = limit - ev.Attendees;
            
            var threshold = (int)Math.Ceiling(limit * 0.5);

            if (limit > 0 && pendingCount == threshold)
            {
                await _notificationService.CreateNotificationAsync(new NotificationDocument
                {
                    UserId    = ev.CreatorId,
                    Title     = "Many requests are waiting!",
                    Message   = $"Event: {ev.EventTitle}",
                    Read      = false,
                    Status    = "pending_alert",
                    ImageUrl  = ev.EventImgPath ?? "/images/notification.png",
                    Url       = $"/Event/Detail/{id}",
                    CreatedAt = DateTime.UtcNow
                });
            }
            else if (remaining > 0 && pendingCount == remaining)
            {
                await _notificationService.CreateNotificationAsync(new NotificationDocument
                {
                    UserId    = ev.CreatorId,
                    Title     = "Slots are fully requested!",
                    Message   = $"Event: {ev.EventTitle}",
                    Read      = false,
                    Status    = "pending_full",
                    ImageUrl  = ev.EventImgPath ?? "/images/notification.png",
                    Url       = $"/Event/Detail/{id}",
                    CreatedAt = DateTime.UtcNow
                });
            }

            return Ok();
        }

        // LEAVE 

        [HttpPost]
        public async Task<IActionResult> Leave(string id)
        {
            // var currentUserId = Request.Cookies["userId"];
            var currentUserId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized(); // mock

            await _eventService.RemoveParticipantAsync(id, currentUserId);

            return Ok();
        }

        // END REGISTRATION 

        [HttpPost]
        public async Task<IActionResult> EndRegistration(string id, [FromBody] EndRegistrationDto request)
        {
            // var currentUserId = "69a714e4cbab5148e804d87d";
            var currentUserId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized(); // mock

            var ev = await _eventService.GetEventByIdAsync(id);
            if (ev == null) return NotFound();
            if (currentUserId != ev.CreatorId) return Forbid();

            await _eventService.CloseRegistrationAsync(id, request.Reason);

            return Ok();
        }

        // APPROVE ATTENDEE 

        [HttpPost]
        public async Task<IActionResult> ApproveAttendee(string id)
        {
            var participant = await _eventService.GetParticipantByIdAsync(id);
            if (participant != null)
            {
                var ev = await _eventService.GetEventByIdAsync(participant.EventId);
                await _notificationService.CreateNotificationAsync(new NotificationDocument
                {
                    UserId    = participant.UserId,
                    Title     = "Your request has been Approved.",
                    Message = $"Event: {ev?.EventTitle ?? ""}",
                    Read      = false,
                    Status    = "approved",
                    ImageUrl  = ev?.EventImgPath ?? "/images/notification.png",
                    Url       = $"/Event/Detail/{participant.EventId}",
                    CreatedAt = DateTime.UtcNow
                });
            }
            await _eventService.UpdateParticipantStatusAsync(id, "approved");
            return Ok();
        }

        [HttpPost]
        public async Task<IActionResult> RejectAttendee(string id)
        {
            var participant = await _eventService.GetParticipantByIdAsync(id);
            if (participant != null)
            {
                var ev = await _eventService.GetEventByIdAsync(participant.EventId);
                await _notificationService.CreateNotificationAsync(new NotificationDocument
                {
                    UserId    = participant.UserId,
                    Title     = "Your request has been Rejected.",
                    Message = $"Event: {ev?.EventTitle ?? ""}",
                    Read      = false,
                    Status    = "rejected",
                    ImageUrl  = ev?.EventImgPath ?? "/images/notification.png",
                    Url       = $"/Event/Detail/{participant.EventId}",
                    CreatedAt = DateTime.UtcNow
                });
            }
            await _eventService.UpdateParticipantStatusAsync(id, "rejected");
            return Ok();
        }

        [HttpPost]
        public async Task<IActionResult> DeleteAttendee(string id)
        {
            var participant = await _eventService.GetParticipantByIdAsync(id);
            if (participant != null)
            {
                var ev = await _eventService.GetEventByIdAsync(participant.EventId);
                await _notificationService.CreateNotificationAsync(new NotificationDocument
                {
                    UserId    = participant.UserId,
                    Title     = "Your request has been Rejected.",
                    Message = $"Event: {ev?.EventTitle ?? ""}",
                    Read      = false,
                    Status    = "rejected",
                    ImageUrl  = ev?.EventImgPath ?? "/images/notification.png",
                    Url       = $"/Event/Detail/{participant.EventId}",
                    CreatedAt = DateTime.UtcNow
                });
            }
            await _eventService.UpdateParticipantStatusAsync(id, "rejected");
            return Ok();
        }
        [HttpPost]
        public async Task<IActionResult> DeleteEvent([FromBody] DeleteEventRequest request)
        {
            var currentUserId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(currentUserId)) 
                return Json(new { success = false, message = "please login first" });

            var ev = await _eventService.GetEventByIdAsync(request.eventId);
            if (ev == null) 
                return Json(new { success = false, message = "please login first" });

            if (ev.CreatorId != currentUserId) 
                return Json(new { success = false, message = "you are not the owner of this event" });

            var allParticipants = await _eventService.GetParticipantsAsync(request.eventId);

            if (allParticipants != null && allParticipants.Any())
            {
                foreach (var p in allParticipants)
                {
                    if (p.UserId != currentUserId)
                    {
                        await _notificationService.CreateNotificationAsync(new NotificationDocument
                        {
                            UserId    = p.UserId,
                            Title     = "Event Cancelled",
                            Message   = $"กิจกรรม '{ev.EventTitle}' ถูกยกเลิกโดยผู้จัด",
                            Reason    = request.reason,
                            Read      = false,
                            Status    = "warning",
                            ImageUrl  = ev.EventImgPath ?? "/images/notification.png",
                            Url       = "#", 
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            await _eventsCollection.DeleteOneAsync(e => e.Id == request.eventId);
            return Json(new { success = true });
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
                    Latitude = item.Latitude ?? 0,
                    Longitude = item.Longitude ?? 0,
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

        private static void ValidatePlannerRowsGoogleMaps(IEnumerable<PlannerRowInputModel> plannerRows, ModelStateDictionary modelState)
        {
            foreach (var row in plannerRows ?? Enumerable.Empty<PlannerRowInputModel>())
            {
                if (string.IsNullOrWhiteSpace(row?.PlaceName))
                {
                    continue;
                }

                if (IsValidFullGoogleMapsUrl(row.GoogleMapUrl))
                {
                    continue;
                }

                modelState.AddModelError(nameof(CreateEventInputModel.PlannerJson), "Each itinerary place must use a full Google Maps link (with coordinates).");
                return;
            }
        }

        private static bool IsValidFullGoogleMapsUrl(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            if (!Uri.TryCreate(value.Trim(), UriKind.Absolute, out var parsedUri))
            {
                return false;
            }

            if (parsedUri.Scheme != Uri.UriSchemeHttp && parsedUri.Scheme != Uri.UriSchemeHttps)
            {
                return false;
            }

            var host = parsedUri.Host.ToLowerInvariant();
            var isGoogleHost = host == "google.com" || host.EndsWith(".google.com", StringComparison.Ordinal);
            if (!isGoogleHost)
            {
                return false;
            }

            if (!parsedUri.AbsolutePath.Contains("/maps", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var absoluteUrl = parsedUri.AbsoluteUri;
            var hasAtCoordinates = Regex.IsMatch(absoluteUrl, @"@-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?", RegexOptions.CultureInvariant);
            var hasBangCoordinates = Regex.IsMatch(absoluteUrl, @"!3d-?\d+(?:\.\d+)?!4d-?\d+(?:\.\d+)?", RegexOptions.CultureInvariant);
            return hasAtCoordinates || hasBangCoordinates;
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

    // ================================================================
    // DTOs
    // ================================================================

    public class JoinAnswerDto
    {
        public string QuestionId { get; set; }
        public string Answer     { get; set; }
    }

    public class JoinRequestDto
    {
        public List<JoinAnswerDto> Answers { get; set; } = new();
    }

    public class EndRegistrationDto
    {
        public string Reason { get; set; }
    }
    public class DeleteEventRequest
    {
        public string eventId { get; set; }
        public string reason { get; set; }
    }
}