using System.Net.Cache;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Travello.Models;
using Travello.Services;

namespace Travello.Controllers
{
    public class PollController : Controller
    {
        private readonly PollService _pollService;
        private readonly IMongoCollection<UserModel> _usersCollection;
        private readonly IMongoCollection<EventDocument> _eventsCollection;
        private readonly IMongoCollection<ChatRoomModel> _chatRoomsCollection;
        private readonly IMongoCollection<ChatMessageModel> _messagesCollection;

        public PollController(PollService pollService, IMongoDatabase database)
        {
            _pollService = pollService;
            _usersCollection = database.GetCollection<UserModel>("User");
            _eventsCollection = database.GetCollection<EventDocument>("events");
            _chatRoomsCollection = database.GetCollection<ChatRoomModel>("chat_rooms");
            _messagesCollection = database.GetCollection<ChatMessageModel>("messages");
        }

        [HttpGet]
        public async Task<IActionResult> GetPollsByEventId(string event_id)
        {
            if (string.IsNullOrEmpty(event_id))
                return Json(new List<object>());

            var polls = await _pollService.GetPollsByEventIdAsync(event_id);

            var result = polls.Select(p =>
            {
                int totalVotes = p.Options.Sum(o => o.Voters.Count);
                int topVoteCount = p.Options.Count > 0 ? p.Options.Max(o => o.Voters.Count) : 0;
                var topOptions = p.Options.Where(o => o.Voters.Count == topVoteCount).ToList();

                bool hasVotes = totalVotes > 0 && topVoteCount > 0;
                bool isDraw = hasVotes && topOptions.Count > 1;
                string winnerLabel = !hasVotes
                    ? "No result"
                    : isDraw
                        ? "Draw"
                        : topOptions.FirstOrDefault()?.Text ?? string.Empty;

                int winnerPercent = hasVotes
                    ? (int)Math.Round(topVoteCount * 100.0 / totalVotes)
                    : 0;

                return new
                {
                    id = p.Id,
                    question = p.Question,
                    winner = winnerLabel,
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

            var userId = HttpContext.Session.GetString("UserId") ?? "";
            int totalVotes = poll.Options.Sum(o => o.Voters.Count);
            var eventDocument = await _eventsCollection.Find(e => e.Id == poll.EventId).FirstOrDefaultAsync();
            var canUpdateEventResult = !string.IsNullOrWhiteSpace(userId)
                && eventDocument != null
                && eventDocument.CreatedBy == userId;

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
                can_update_event_result = canUpdateEventResult,
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
        public async Task<IActionResult> UpdateEventResult([FromBody] UpdateEventResultRequest request)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Json(new { success = false, error = "Not logged in" });
            }

            if (string.IsNullOrWhiteSpace(request.PollId))
            {
                return Json(new { success = false, error = "poll_id required" });
            }

            var poll = await _pollService.GetPollByIdAsync(request.PollId);
            if (poll == null)
            {
                return Json(new { success = false, error = "Poll not found" });
            }

            var eventDocument = await _eventsCollection.Find(e => e.Id == poll.EventId).FirstOrDefaultAsync();
            if (eventDocument == null)
            {
                return Json(new { success = false, error = "Event not found" });
            }

            if (eventDocument.CreatedBy != userId)
            {
                return Json(new { success = false, error = "Only the event owner can update into event." });
            }

            if (!poll.IsEnded)
            {
                return Json(new { success = false, error = "Poll must be ended before updating result." });
            }

            await _pollService.SaveVoteResultForEndedPollAsync(poll);
            return Json(new
            {
                success = true,
                message = "Poll result updated into event.",
                event_id = poll.EventId
            });
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

            try 
            {
                var chatRoom = await _chatRoomsCollection.Find(c => c.event_id == request.EventId).FirstOrDefaultAsync();
                
                if (chatRoom != null)
                {
                    var newChatMessage = new ChatMessageModel
                    {
                        chat_room_id = chatRoom.id,
                        sender_id = userId,
                        message_text = "Poll Create",
                        timestamp = DateTime.UtcNow,
                        poll_id = poll.Id
                    };

                    await _messagesCollection.InsertOneAsync(newChatMessage);

                    var update = Builders<ChatRoomModel>.Update
                        .Set(r => r.last_message_id, newChatMessage.Id)
                        .Set(r => r.last_message_text, newChatMessage.message_text)
                        .Set(r => r.last_message_time, newChatMessage.timestamp); 
                    await _chatRoomsCollection.UpdateOneAsync(r => r.id == chatRoom.id, update);

                    await Travello.Services.WebSocketManage.BroadcastToRoom(chatRoom.id, "NEW_MSG");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending poll message to chat: {ex.Message}");
            }

            // -------------------------------------------------------------------

            return Json(new { success = true, poll_id = poll.Id });
        }

        [HttpPost]
        public async Task<IActionResult> Vote([FromBody] VoteRequest request)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
                return Json(new { success = false, error = "Not logged in" });

            // 1. เซฟผลโหวตลง DB
            await _pollService.VoteAsync(request.PollId, request.OptionIndex, userId);

            try 
            {
                var poll = await _pollService.GetPollByIdAsync(request.PollId);
                
                if (poll != null)
                {
                    var chatRoom = await _chatRoomsCollection.Find(c => c.event_id == poll.EventId).FirstOrDefaultAsync();
                    
                    if (chatRoom != null)
                    {
                        var updateMsg = Builders<ChatMessageModel>.Update.Set(m => m.timestamp, DateTime.UtcNow);
                        await _messagesCollection.UpdateManyAsync(m => m.poll_id == poll.Id, updateMsg);

                        var pollMessage = await _messagesCollection.Find(m => m.poll_id == poll.Id).FirstOrDefaultAsync();
                        if (pollMessage != null)
                        {
                            var updateRoom = Builders<ChatRoomModel>.Update.Set(r => r.last_message_id, pollMessage.Id);
                            await _chatRoomsCollection.UpdateOneAsync(r => r.id == chatRoom.id, updateRoom);
                        }

                        await Travello.Services.WebSocketManage.BroadcastToRoom(chatRoom.id, "NEW_MSG");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating chat after vote: {ex.Message}");
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

    public class UpdateEventResultRequest
    {
        public string PollId { get; set; } = string.Empty;
    }

    
}
}
