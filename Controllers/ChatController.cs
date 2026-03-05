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
        // 🌟 1. เพิ่มตัวแปรเชื่อมต่อตาราง events
        private readonly IMongoCollection<EventModel> _eventsCollection;

        public ChatController(ChatService chatService, IMongoDatabase database)
        {
            _chatService = chatService;
            _usersCollection = database.GetCollection<UserModel>("User");
            // 🌟 2. ชี้ไปที่ตาราง events ใน Database
            _eventsCollection = database.GetCollection<EventModel>("events"); 
        }

        public async Task<IActionResult> Index()
        {
            // ดึง User จำลอง
            string mockUserId = "69a9afc35f16b10cdb2b5079"; // ใช้ ID ของ SameTest

            var currentUser = await _usersCollection
                .Find(user => user.id == mockUserId)
                .FirstOrDefaultAsync();

            if (currentUser == null || currentUser.event_id == null || !currentUser.event_id.Any())
            {
                return View(new List<ChatRoomModel>());
            }

            // ไปหาห้องแชททั้งหมด
            List<string> myEventIds = currentUser.event_id;
            List<ChatRoomModel> myChats = await _chatService.GetUserChatsAsync(myEventIds);

            // 🌟 3. พระเอกอยู่ตรงนี้: วนลูปเอา event_title มาใส่เป็นชื่อห้องแชท
            foreach (var chat in myChats)
            {
                if (chat.event_id != null)
                {
                    // ไปค้นหาทริปที่มี Id ตรงกับ event_id ของห้องแชทนี้
                    var eventInfo = await _eventsCollection
                        .Find(event_obj => event_obj.id == chat.event_id)
                        .FirstOrDefaultAsync();

                    // ถ้าเจอทริป ก็เอาชื่อทริปมาทับ chat_name เลย
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