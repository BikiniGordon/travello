using Microsoft.AspNetCore.Mvc;
using Travello.Models;
using Travello.Services;

namespace Travello.Controllers
{
    public class EventController : Controller
    {
        private readonly EventService _eventService;

        public EventController(EventService eventService)
        {
            _eventService = eventService;
        }

        // DETAIL PAGE

        public async Task<IActionResult> Detail(string id)
        {
            var ev = await _eventService.GetEventByIdAsync(id);
            if (ev == null) return NotFound();

            // var currentUserId = Request.Cookies["userId"];
            var currentUserId = "69a714e4cbab5148e804d87d"; // mock
            string userStatus = "none";

            if (ev.IsRegistrationClosed && currentUserId != ev.CreatorId)
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
            .Where(i => i.Latitude != 0 && i.Longitude != 0)
            .Select(i => new LocationViewModel
            {
                PlaceName = i.ActivityName,
                Latitude  = i.Latitude,
                Longitude = i.Longitude
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
                Category = ev.EventTag ?? new(),
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
                Additions        = new()
            };

            return View(model);
        }

        // GET ATTENDEES (modal)

        public async Task<JsonResult> GetAttendees(string id)
        {
            var currentUserId = "69a714e4cbab5148e804d87d"; // mock

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
            // var currentUserId = Request.Cookies["userId"];
            var currentUserId = "69a714e4cbab5148e804d87d"; // mock

            var ev = await _eventService.GetEventByIdAsync(id);
            if (ev == null) return NotFound();
            if (ev.IsRegistrationClosed) return BadRequest("Registration is closed");

            var existing = await _eventService.GetParticipantAsync(id, currentUserId);
            if (existing != null) return BadRequest("Already joined");

            var recruitAnswer = request.Answers.FirstOrDefault()?.Answer ?? "";
            await _eventService.AddParticipantAsync(id, currentUserId, "pending", recruitAnswer) ;

            return Ok();
        }

        // LEAVE 

        [HttpPost]
        public async Task<IActionResult> Leave(string id)
        {
            // var currentUserId = Request.Cookies["userId"];
            var currentUserId = "69a714e4cbab5148e804d87d"; // mock

            await _eventService.RemoveParticipantAsync(id, currentUserId);

            return Ok();
        }

        // END REGISTRATION 

        [HttpPost]
        public async Task<IActionResult> EndRegistration(string id, [FromBody] EndRegistrationDto request)
        {
            // var currentUserId = Request.Cookies["userId"];
            var currentUserId = "69a714e4cbab5148e804d87d"; // mock

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
            // id = participantId (p.Id จาก GetAttendees)
            await _eventService.UpdateParticipantStatusAsync(id, "approved");
            return Ok();
        }

        // REJECT ATTENDEE 

        [HttpPost]
        public async Task<IActionResult> RejectAttendee(string id)
        {
            await _eventService.UpdateParticipantStatusAsync(id, "rejected");
            return Ok();
        }

        // DELETE ATTENDEE 

        [HttpPost]
        public async Task<IActionResult> DeleteAttendee(string id)
        {
            await _eventService.UpdateParticipantStatusAsync(id, "rejected");
            return Ok();
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
}