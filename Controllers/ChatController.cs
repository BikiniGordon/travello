using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System.Linq;
using Travello.Models;
using Travello.Services;

namespace Travello.Controllers
{
    public class ChatController : Controller
    {
        private readonly ChatService _chatService;
        private readonly IMongoCollection<User> _usersCollection;
        private readonly IMongoCollection<Event> _eventsCollection;
        private readonly IMongoCollection<EventDocument> _eventDocumentsCollection;
        private readonly IMongoCollection<EventParticipant> _participantsCollection;
        private readonly IMongoCollection<ChatRoomModel> _chatRoomsCollection;
        private readonly IMongoCollection<PollModel> _pollCollection;

        public ChatController(ChatService chatService, IMongoDatabase database)
        {
            _chatService = chatService;
            _usersCollection = database.GetCollection<User>("User");
            _eventsCollection = database.GetCollection<Event>("events");
            _eventDocumentsCollection = database.GetCollection<EventDocument>("events");
            _participantsCollection = database.GetCollection<EventParticipant>("event_participants");
            _chatRoomsCollection = database.GetCollection<ChatRoomModel>("chat_rooms");
            _pollCollection = database.GetCollection<PollModel>("polls");
        }

        public async Task<IActionResult> Index()
        {
            var currentUserId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(currentUserId))
            {
                return RedirectToAction("User", "CreateAccount");
            }

            var currentUser = await _usersCollection
                .Find(user => user.Id == currentUserId)
                .FirstOrDefaultAsync();

            if (currentUser != null)
            {
                var participantEventIds = await _participantsCollection
                    .Find(participant => participant.UserId == currentUserId)
                    .Project(participant => participant.EventId)
                    .ToListAsync();

                var ownedEventIds = await _eventDocumentsCollection
                    .Find(eventDocument => eventDocument.CreatedBy == currentUserId)
                    .Project(eventDocument => eventDocument.Id)
                    .ToListAsync();

                var mergedEventIds = (currentUser.EventId ?? new List<string>())
                    .Concat(participantEventIds)
                    .Concat(ownedEventIds.Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id!))
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Distinct()
                    .ToList();

                var hasMembershipChanges = currentUser.EventId == null
                    || currentUser.EventId.Count != mergedEventIds.Count
                    || currentUser.EventId.Except(mergedEventIds).Any();

                if (hasMembershipChanges)
                {
                    var update = Builders<User>.Update.Set(user => user.EventId, mergedEventIds);
                    await _usersCollection.UpdateOneAsync(user => user.Id == currentUserId, update);
                    currentUser.EventId = mergedEventIds;
                }
            }

            if (currentUser == null || currentUser.EventId == null || !currentUser.EventId.Any())
            {
                return View(new List<ChatRoomModel>());
            }

            List<string> myEventIds = currentUser.EventId;
            List<ChatRoomModel> myChats = await _chatService.GetUserChatsAsync(myEventIds);

            foreach (var chat in myChats)
            {
                if (chat.event_id != null)
                {
                    var eventInfo = await _eventsCollection
                        .Find(event_obj => event_obj.Id == chat.event_id)
                        .FirstOrDefaultAsync();

                    if (eventInfo != null)
                    {
                        chat.event_location = eventInfo.Location;
                        chat.start_date = eventInfo.StartDate;
                        chat.end_date = eventInfo.EndDate;
                        chat.event_img_path = eventInfo.EventImgPath;

                        if (chat.chat_name != eventInfo.EventTitle)
                        {
                            chat.chat_name = eventInfo.EventTitle;
                            await _chatService.UpdateChatNameAsync(chat.id!, eventInfo.EventTitle!);
                        }
                    }
                }
            }
            myChats = myChats.OrderByDescending(chat => chat.last_message_time).ToList();
            return View(myChats);
        }

        [HttpGet]
        public async Task<IActionResult> GetMyChatRooms(string? search = null)
        {
            string currentUserId = HttpContext.Session.GetString("UserId");

            var filterBuilder = Builders<ChatRoomModel>.Filter; 
            var filter = filterBuilder.Empty;

            if (!string.IsNullOrEmpty(search))
            {
            
                var safeSearch = System.Text.RegularExpressions.Regex.Escape(search);
                
                var regex = new MongoDB.Bson.BsonRegularExpression(safeSearch, "i");
                filter &= filterBuilder.Regex(x => x.chat_name, regex);
            }

            var chatRooms = await _chatRoomsCollection.Find(filter).ToListAsync();

            var currentUser = await _usersCollection
                .Find(user => user.Id == currentUserId)
                .FirstOrDefaultAsync();

            if (currentUser == null || currentUser.EventId == null || !currentUser.EventId.Any())
            {
                return Json(new { success = true, data = new List<ChatRoomModel>() });
            }

            List<string> myEventIds = currentUser.EventId;
            List<ChatRoomModel> myChats = await _chatService.GetUserChatsAsync(myEventIds);

            foreach (var chat in myChats)
            {
                if (chat.event_id != null)
                {
                    var eventInfo = await _eventsCollection
                        .Find(event_obj => event_obj.Id == chat.event_id)
                        .FirstOrDefaultAsync();

                    if (eventInfo != null)
                    {
                        chat.chat_name = eventInfo.EventTitle;
                        chat.event_img_path = eventInfo.EventImgPath;
                        chat.event_location = eventInfo.Location;
                        chat.start_date = eventInfo.StartDate;
                        chat.end_date = eventInfo.EndDate;
                    }
                }
            }

            if (!string.IsNullOrEmpty(search))
            {
                myChats = myChats
                    .Where(c => c.chat_name != null && c.chat_name.Contains(search, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            myChats = myChats.OrderByDescending(chat => chat.last_message_time).ToList();

            return Json(new { success = true, data = myChats });

        }
    }
}
