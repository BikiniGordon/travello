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

        public ChatController(ChatService chatService, IMongoDatabase database)
        {
            _chatService = chatService;
            _usersCollection = database.GetCollection<UserModel>("User");
            _eventsCollection = database.GetCollection<EventModel>("events"); 
        }

        public async Task<IActionResult> Index()
        {
            string mockUserId = "69a9afc35f16b10cdb2b5079"; // Dear
            // string mockUserId = "69a9d2663daa971a33606eae"; // Dear_02

            var currentUser = await _usersCollection
                .Find(user => user.id == mockUserId)
                .FirstOrDefaultAsync();

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
                        .Find(event_obj => event_obj.id == chat.event_id)
                        .FirstOrDefaultAsync();

                    if (eventInfo != null && chat.chat_name != eventInfo.event_title)
                    {
                        chat.chat_name = eventInfo.event_title;
                        var event_location = eventInfo.location;
                        await _chatService.UpdateChatNameAsync(chat.id!, eventInfo.event_title!);
                    }
                }
            }

            return View(myChats); 
        }
    }
}