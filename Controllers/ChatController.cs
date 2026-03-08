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
        private readonly IMongoCollection<UserModel> _usersCollection;
        private readonly IMongoCollection<Event> _eventsCollection;

        public ChatController(ChatService chatService, IMongoDatabase database)
        {
            _chatService = chatService;
            _usersCollection = database.GetCollection<UserModel>("User");
            _eventsCollection = database.GetCollection<Event>("events"); 
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
        public async Task<IActionResult> GetMyChatRooms()
        {
            string mockUserId = "69a9afc35f16b10cdb2b5079"; // Dear (ใช้ User ID เดียวกับ Index)
            
            var currentUser = await _usersCollection
                .Find(user => user.id == mockUserId)
                .FirstOrDefaultAsync();

            if (currentUser == null || currentUser.event_id == null || !currentUser.event_id.Any())
            {
                return Json(new { success = true, data = new List<ChatRoomModel>() });
            }

            List<string> myEventIds = currentUser.event_id;
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

            // 🌟 จัดเรียงใหม่สุดขึ้นบนสุด
            myChats = myChats.OrderByDescending(chat => chat.last_message_time).ToList();

            return Json(new { success = true, data = myChats });
        }
    }
}
