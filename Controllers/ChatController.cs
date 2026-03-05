// using Microsoft.AspNetCore.Mvc;
// using System.Collections.Generic;
// using Travello.Models;
// using System;
// using MongoDB.Driver;

// namespace Travello.Controllers
// {
//     public class ChatController : Controller
//     {
//         private readonly IMongoCollection<ChatMessageModel> _messageCollection;

//         public ChatController()
//         {
//             var client = new MongoClient("mongodb://localhost:27018");
//             var database = client.GetDatabase("TravelloDB");
//             _messageCollection = database.GetCollection<ChatMessageModel>("ChatMessages");
//         }

//         public IActionResult Index()
//         {
//             // เดี๋ยวดึง chat จาก event_id ของ user มาแสดง
//             var chatList = new List<ChatRoomModel>
//             {
//                 new ChatRoomModel { event_id = 1, chat_name = "ปีนเขาชิวรับแสงอาทิตย์หน้าหนาว", last_message_id = 1, user_id = 1},
//                 new ChatRoomModel { event_id = 2, chat_name = "ทริปดำน้ำเกาะเต่า", last_message_id = 2, user_id = 1},
//                 new ChatRoomModel { event_id = 3, chat_name = "แคมป์ปิ้งเขาใหญ่", last_message_id = 3,  user_id = 1},
//                 new ChatRoomModel { event_id = 4, chat_name = "ตะลุยคาเฟ่เชียงใหม่", last_message_id = 4, user_id = 1}
//             };

//             return View("Index", chatList);
//         }
//     }
// }


using Microsoft.AspNetCore.Mvc;
using Travello.Models;
using Travello.Services;

namespace Travello.Controllers
{
    public class ChatController : Controller
    {
        private readonly ChatService _chatService;

        // รับ ChatService เข้ามาใช้งาน
        public ChatController(ChatService chatService)
        {
            _chatService = chatService;
        }

        public async Task<IActionResult> Index()
        {
            // 1. จำลองว่าดึง user_id ของคนที่ล็อกอินอยู่ (ของจริงอาจจะดึงจาก Session หรือ Cookie)
            int currentUserId = 1; 

            // 2. จำลองว่าไป Query มาแล้วพบว่า User คนนี้เข้าร่วมทริป (event_id) เบอร์ 101 และ 105
            List<int> myEventIds = new List<int> { 101, 105 };

            // 3. สั่งให้ Service ไปดึงห้องแชทของ 2 ทริปนี้มาจาก MongoDB
            List<ChatRoomModel> myChats = await _chatService.GetUserChatsAsync(myEventIds);

            // 4. โยนข้อมูลแชทที่ได้ ไปแสดงผลที่หน้า View (หน้า HTML)
            return View(myChats); 
        }
    }
}