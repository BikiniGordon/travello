using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http; 
using Microsoft.AspNetCore.Hosting;
using System;
using System.IO;
using System.Threading.Tasks;
using Travello.Models;
using Travello.Services; 
using Travello.DTOs;

namespace Travello.Controllers
{
    public class ChatMessageController : Controller
    {
        private readonly ChatService _chatService;
        private readonly IWebHostEnvironment _env;

        public ChatMessageController(ChatService chatService, IWebHostEnvironment env)
        {
            _chatService = chatService;
            _env = env;
        }

        [HttpGet]
        public async Task<IActionResult> GetMessages(string chat_room_id)
        {
            List<ChatHistoryResponse> chatHistory = await _chatService.GetChatHistoryAsync(chat_room_id);
        
            return Json(new { success = true, data = chatHistory });
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromForm] ChatMessageModel newMessage, IFormFile imageFile)
        {
            var currentUserId = HttpContext.Session.GetString("UserId");
            Console.WriteLine(currentUserId);

            if (imageFile != null && imageFile.Length > 0)
            {
                // สร้างโฟลเดอร์ uploads/chats ถ้ายังไม่มี
                string uploadsFolder = Path.Combine(_env.WebRootPath, "uploads", "chats");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                // ตั้งชื่อไฟล์ใหม่ให้ไม่ซ้ำกัน (เช่น 5f8a..._image.jpg)
                string uniqueFileName = Guid.NewGuid().ToString() + "_" + imageFile.FileName;
                string filePath = Path.Combine(uploadsFolder, uniqueFileName);

                // ก๊อปปี้ไฟล์ไปวางในโฟลเดอร์
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await imageFile.CopyToAsync(fileStream);
                }

                newMessage.image_url = "/uploads/chats/" + uniqueFileName;
            }

            if (newMessage != null && (!string.IsNullOrEmpty(newMessage.message_text) || !string.IsNullOrEmpty(newMessage.image_url)))
            {
                newMessage.sender_id = "69a9afc35f16b10cdb2b5079";
                newMessage.timestamp = DateTime.UtcNow;
                
                await _chatService.SaveMessageAsync(newMessage);
                
                return Json(new { success = true });
            }
            return Json(new { success = false });
        }
    }
}