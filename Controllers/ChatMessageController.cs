using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using Travello.Models;

namespace Travello.Controllers
{
    public class ChatMessageController : Controller
    {
        private readonly IMongoCollection<ChatMessageModel> _messageCollection;

        public ChatMessageController()
        {
            // เชื่อมต่อ MongoDB (ใช้พอร์ต 27018 ที่เรารันผ่าน Docker ไว้)
            var client = new MongoClient("mongodb://localhost:27018");
            var database = client.GetDatabase("TravelloDB");
            
            // ใช้ Collection ชื่อ ChatMessages
            _messageCollection = database.GetCollection<ChatMessageModel>("ChatMessages");
        }

        // ==========================================
        // 1. Action สำหรับดึงข้อความ (AJAX GET)
        // ==========================================
        [HttpGet]
        public IActionResult GetMessages(string eventId)
        {
            // ดึงข้อมูลจาก MongoDB โดยกรองเอาเฉพาะ event_id ที่ตรงกับห้องแชท
            // และเรียงลำดับจากเก่าไปใหม่ตาม timestamp
            var messages = _messageCollection
                            .Find(msg => msg.event_id == eventId)
                            .SortBy(msg => msg.timestamp)
                            .ToList();
                            
            return Json(messages);
        }

        // ==========================================
        // 2. Action สำหรับรับข้อความใหม่ (AJAX POST)
        // ==========================================
        [HttpPost]
        public IActionResult SendMessage([FromBody] ChatMessageModel newMessage)
        {
            if (newMessage != null && !string.IsNullOrEmpty(newMessage.message_text))
            {
                // ประทับเวลา ณ วินาทีที่ส่ง
                newMessage.timestamp = DateTime.Now;
                
                // บันทึกลง MongoDB
                _messageCollection.InsertOne(newMessage);
                
                return Json(new { success = true });
            }
            return Json(new { success = false });
        }
    }
}