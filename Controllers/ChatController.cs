using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Travello.Models;
using Travello.Services;

namespace Travello.Controllers
{
    public class ChatController : Controller
    {
        private readonly ChatService _chatService;
        private readonly IMongoCollection<UserModel> _usersCollection;
        private readonly IMongoCollection<EventModel> _eventsCollection;
        private readonly IMongoCollection<EventDocument> _eventDocumentsCollection;
        private readonly IMongoCollection<EventParticipant> _participantsCollection;
        private readonly IMongoCollection<ChatRoomModel> _chatRoomsCollection;

        public ChatController(ChatService chatService, IMongoDatabase database)
        {
            _chatService = chatService;
            _usersCollection = database.GetCollection<UserModel>("User");
            _eventsCollection = database.GetCollection<EventModel>("events");
            _eventDocumentsCollection = database.GetCollection<EventDocument>("events");
            _participantsCollection = database.GetCollection<EventParticipant>("event_participants");
            _chatRoomsCollection = database.GetCollection<ChatRoomModel>("chat_rooms");
        }

        public async Task<IActionResult> Index()
        {
            var currentUserId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(currentUserId))
            {
                return RedirectToAction("CreateAccount", "User");
            }

            var currentUser = await _usersCollection
                .Find(user => user.id == currentUserId)
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

                var mergedEventIds = (currentUser.event_id ?? new List<string>())
                    .Concat(participantEventIds)
                    .Concat(ownedEventIds.Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id!))
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Distinct()
                    .ToList();

                var hasMembershipChanges = currentUser.event_id == null
                    || currentUser.event_id.Count != mergedEventIds.Count
                    || currentUser.event_id.Except(mergedEventIds).Any();

                if (hasMembershipChanges)
                {
                    var update = Builders<UserModel>.Update.Set(user => user.event_id, mergedEventIds);
                    await _usersCollection.UpdateOneAsync(user => user.id == currentUserId, update);
                    currentUser.event_id = mergedEventIds;
                }
            }

            if (currentUser == null || currentUser.event_id == null || !currentUser.event_id.Any())
            {
                return View(new List<ChatRoomModel>());
            }

            List<string> myEventIds = currentUser.event_id;
            List<ChatRoomModel> myChats = await _chatService.GetUserChatsAsync(myEventIds);

            foreach (var chat in myChats)
            {
                if (chat.event_id != null)
                {
                    var eventInfo = await _eventsCollection
                        .Find(event_obj => event_obj.event_id == chat.event_id)
                        .FirstOrDefaultAsync();

                    if (eventInfo != null && chat.chat_name != eventInfo.event_title)
                    {
                        chat.chat_name = eventInfo.event_title;
                        await _chatService.UpdateChatNameAsync(chat.id!, eventInfo.event_title!);
                    }
                }
            }

            return View(myChats); 
        }
    }
}