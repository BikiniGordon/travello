using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Travello.Models;
using Travello.Services; // 🌟 อย่าลืม using Services ด้วยนะครับ

namespace Travello.Controllers
{
    public class ChatMessageController : Controller
    {
        private readonly ChatService _chatService;

        public ChatMessageController(ChatService chatService)
        {
            _chatService = chatService;
            var currentUserId = HttpContext.Session.GetString("UserId");
        }

        [HttpGet]
        public async Task<IActionResult> GetMessages(string chat_room_id, string sender_id)
        {
            return Json(new { message = "เดี๋ยวมาทำต่อ" });
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] ChatMessageModel newMessage)
        {
            Console.WriteLine(currentUserId);
            if (newMessage != null && !string.IsNullOrEmpty(newMessage.message_text))
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