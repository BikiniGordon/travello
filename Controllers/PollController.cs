using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver;
using Travello.Hubs;
using Travello.Models;
using Travello.Services;

namespace Travello.Controllers
{
    public class PollController : Controller
    {
        private readonly PollService _pollService;
        private readonly IHubContext<PollHub> _pollHub;
        private readonly IMongoCollection<UserModel> _usersCollection;

        public PollController(PollService pollService, IHubContext<PollHub> pollHub, IMongoDatabase database)
        {
            _pollService = pollService;
            _pollHub = pollHub;
            _usersCollection = database.GetCollection<UserModel>("User");
        }

        [HttpGet]
        public async Task<IActionResult> GetPollsByEventId(string event_id)
        {
            if (string.IsNullOrEmpty(event_id))
                return Json(new List<object>());

            var polls = await _pollService.GetPollsByEventIdAsync(event_id);

            var endedPollSaveTasks = polls
                .Where(p => p.IsEnded)
                .Select(p => _pollService.SaveVoteResultForEndedPollAsync(p));
            await Task.WhenAll(endedPollSaveTasks);

            var result = polls.Select(p =>
            {
                int totalVotes = p.Options.Sum(o => o.Voters.Count);
                var winnerOption = p.Options.OrderByDescending(o => o.Voters.Count).FirstOrDefault();
                int winnerPercent = totalVotes > 0 && winnerOption != null
                    ? (int)Math.Round(winnerOption.Voters.Count * 100.0 / totalVotes)
                    : 0;

                return new
                {
                    id = p.Id,
                    question = p.Question,
                    winner = winnerOption?.Text ?? "",
                    percent = winnerPercent,
                    time_left = p.IsEnded ? "Ended" : GetTimeLeft(p.Deadline),
                    is_ended = p.IsEnded
                };
            });

            return Json(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetPollDetail(string poll_id)
        {
            if (string.IsNullOrEmpty(poll_id))
                return Json(new { error = "poll_id required" });

            var poll = await _pollService.GetPollByIdAsync(poll_id);
            if (poll == null)
                return Json(new { error = "Poll not found" });

            if (poll.IsEnded)
            {
                await _pollService.SaveVoteResultForEndedPollAsync(poll);
            }

            var userId = HttpContext.Session.GetString("UserId") ?? "";
            int totalVotes = poll.Options.Sum(o => o.Voters.Count);

            var allVoterIds = poll.Options
                .SelectMany(option => option.Voters)
                .Where(voterId => !string.IsNullOrWhiteSpace(voterId))
                .Distinct()
                .ToList();

            var voterProfilesById = new Dictionary<string, string>(StringComparer.Ordinal);
            if (allVoterIds.Count > 0)
            {
                var voters = await _usersCollection
                    .Find(user => user.id != null && allVoterIds.Contains(user.id))
                    .ToListAsync();

                foreach (var voter in voters)
                {
                    if (string.IsNullOrWhiteSpace(voter.id))
                    {
                        continue;
                    }

                    voterProfilesById[voter.id] = string.IsNullOrWhiteSpace(voter.profile_img_path)
                        ? "/images/pic.png"
                        : voter.profile_img_path!;
                }
            }

            var result = new
            {
                id = poll.Id,
                question = poll.Question,
                is_ended = poll.IsEnded,
                time_left = poll.IsEnded ? "Ended" : GetTimeLeft(poll.Deadline),
                allow_multiple = poll.AllowMultiple,
                anonymous = poll.Anonymous,
                options = poll.Options.Select(o => new
                {
                    text = o.Text,
                    percent = totalVotes > 0 ? (int)Math.Round(o.Voters.Count * 100.0 / totalVotes) : 0,
                    voters_count = o.Voters.Count,
                    voter_profiles = poll.Anonymous
                        ? Array.Empty<string>()
                        : o.Voters.Select(voterId =>
                            voterProfilesById.TryGetValue(voterId, out var profilePath)
                                ? profilePath
                                : "/images/pic.png"
                        ),
                    voted = o.Voters.Contains(userId)
                })
            };

            return Json(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePollRequest request)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
                return Json(new { success = false, error = "Not logged in" });

            if (string.IsNullOrEmpty(request.EventId) || string.IsNullOrEmpty(request.Question))
                return Json(new { success = false, error = "Missing event_id or question" });

            if (request.Options == null || request.Options.Count < 2)
                return Json(new { success = false, error = "At least 2 options required" });

            var poll = new PollModel
            {
                EventId = request.EventId,
                Question = request.Question,
                Options = request.Options.Select(o => new PollOptionModel { Text = o }).ToList(),
                Deadline = request.Deadline,
                AllowMultiple = request.AllowMultiple,
                Anonymous = request.Anonymous,
                CreatedBy = userId
            };

            await _pollService.CreatePollAsync(poll);

            // Broadcast to all clients viewing this event's polls
            await _pollHub.Clients.Group($"poll_{request.EventId}").SendAsync("PollCreated", poll.Id);

            return Json(new { success = true, poll_id = poll.Id });
        }

        [HttpPost]
        public async Task<IActionResult> Vote([FromBody] VoteRequest request)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
                return Json(new { success = false, error = "Not logged in" });

            await _pollService.VoteAsync(request.PollId, request.OptionIndex, userId);

            // Get the poll to find its event_id for broadcasting
            var poll = await _pollService.GetPollByIdAsync(request.PollId);
            if (poll != null)
            {
                await _pollHub.Clients.Group($"poll_{poll.EventId}").SendAsync("PollUpdated", request.PollId);
            }

            return Json(new { success = true });
        }

        private static string GetTimeLeft(DateTime deadline)
        {
            var diff = deadline - DateTime.UtcNow;
            if (diff.TotalDays >= 1) return $"{(int)diff.TotalDays} days";
            if (diff.TotalHours >= 1) return $"{(int)diff.TotalHours} hours";
            if (diff.TotalMinutes >= 1) return $"{(int)diff.TotalMinutes} min";
            return "< 1 min";
        }
    }

    public class CreatePollRequest
    {
        public string EventId { get; set; } = string.Empty;
        public string Question { get; set; } = string.Empty;
        public List<string> Options { get; set; } = new();
        public DateTime Deadline { get; set; }
        public bool AllowMultiple { get; set; }
        public bool Anonymous { get; set; }
    }

    public class VoteRequest
    {
        public string PollId { get; set; } = string.Empty;
        public int OptionIndex { get; set; }
    }
}
