using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using Travello.Models;
using System;
using MongoDB.Driver;

namespace Travello.Controllers
{
    public class ChatController : Controller
    {
        // ตัวแปรสำหรับต่อ Collection ของแชทฝั่งขวา
        private readonly IMongoCollection<ChatMessageModel> _messageCollection;

        public ChatController()
        {
            // เชื่อมต่อ MongoDB
            var client = new MongoClient("mongodb://localhost:27018");
            var database = client.GetDatabase("TravelloDB");
            
            // สร้าง/เรียกใช้ Collection ชื่อ "ChatMessages"
            _messageCollection = database.GetCollection<ChatMessageModel>("ChatMessages");
        }

        // ==========================================
        // ส่วนที่ 1: ฝั่งซ้าย (Chat List)
        // ==========================================
        public IActionResult Index()
        {
            // ตรงนี้ผมยังคง Mock ข้อมูลไว้นะครับ เพื่อให้คุณทำ UI ฝั่งซ้ายได้เลย 
            // (ถ้าอยากให้ดึงจาก DB ด้วย ก็เปลี่ยนเป็น _roomCollection.Find(_ => true).ToList() ได้ครับ)
            var chatList = new List<ChatRoomModel>
            {
                new ChatRoomModel { event_id = 1, chat_name = "ปีนเขาชิวรับแสงอาทิตย์หน้าหนาว", last_message_id = 1, user_id = 1},
                new ChatRoomModel { event_id = 2, chat_name = "ทริปดำน้ำเกาะเต่า", last_message_id = 2, user_id = 1},
                new ChatRoomModel { event_id = 3, chat_name = "แคมป์ปิ้งเขาใหญ่", last_message_id = 3,  user_id = 1},
                new ChatRoomModel { event_id = 4, chat_name = "ตะลุยคาเฟ่เชียงใหม่", last_message_id = 4, user_id = 1}
            };

            return View("Chat", chatList);
        }

        // ==========================================
        // ส่วนที่ 2: ฝั่งขวา (AJAX สำหรับ Chat Room)
        // ==========================================
        
        // 1. ดึงข้อความแชท (ค้นหาเฉพาะข้อความที่ RoomId ตรงกับห้องที่เลือก)
        [HttpGet]
        public IActionResult GetMessagesByEventId(string event_id)
        {
            // หาข้อความที่ roomId ตรงกัน และเรียงตามเวลาที่ส่ง
            var messages = _messageCollection
                            .Find(msg => msg.event_id == event_id)
                            .SortBy(msg => msg.timestamp)
                            .ToList();
                            
            return Json(messages);
        }

        // 2. บันทึกข้อความใหม่ลง Database
    }
}