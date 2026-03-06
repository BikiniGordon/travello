using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Travello.Models;
using Travello.Services; 
using Travello.DTOs;

namespace Travello.Controllers
{
    public class ChatMessageController : Controller
    {
        private readonly ChatService _chatService;

        public ChatMessageController(ChatService chatService)
        {
            _chatService = chatService;
        }
        [HttpGet]
        public async Task<IActionResult> GetMessages(string chat_room_id)
        {
            List<ChatHistoryResponse> chatHistory = await _chatService.GetChatHistoryAsync(chat_room_id);
        
            return Json(new { success = true, data = chatHistory });
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] ChatMessageModel newMessage)
        {
            var currentUserId = HttpContext.Session.GetString("UserId");
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