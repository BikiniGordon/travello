using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http; 
using Microsoft.AspNetCore.Hosting;
using System;
using System.IO;
using System.Threading.Tasks;
using Travello.Models;
using Travello.Services; 
using Travello.DTOs;
using MongoDB.Driver;
using System.Reflection.Metadata;

namespace Travello.Controllers
{
    public class ChatMessageController : Controller
    {
        private readonly ChatService _chatService;
        private readonly IWebHostEnvironment _env;
        private readonly IMongoCollection<ChatRoomModel> _chatRooms;
        private readonly IMongoCollection<User> _user;
        private readonly IMongoCollection<PollModel> _poll;

        public ChatMessageController(ChatService chatService, IWebHostEnvironment env, IMongoDatabase database)
        {
            _chatRooms = database.GetCollection<ChatRoomModel>("chat_rooms");
            _user = database.GetCollection<User>("User");
            _poll = database.GetCollection<PollModel>("polls");
            _chatService = chatService;
            _env = env;
        }

        [HttpGet]
        public async Task<IActionResult> GetMessages(string chat_room_id)
        {
            List<ChatHistoryResponse> chatHistory = await _chatService.GetChatHistoryAsync(chat_room_id); //ดึงประวัติมา เราต้องเอาไปออก last_message ตรง chat-card
        
            return Json(new { success = true, data = chatHistory });
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromForm] ChatMessageModel newMessage, IFormFile imageFile, IFormFile documentFile)
        {
            var currentUserId = HttpContext.Session.GetString("UserId");
            var current_user_obj = await _user
                .Find(user => user.Id == currentUserId)
                .FirstOrDefaultAsync();
            var current_chat_room_id = newMessage.chat_room_id;
            var current_chat_room_obj = await _chatRooms
                .Find(chat_room => chat_room.id == current_chat_room_id)
                .FirstOrDefaultAsync();

            if (imageFile != null && imageFile.Length > 0)
            {
                string uploadsFolder = Path.Combine(_env.WebRootPath, "uploads", "chats");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                string uniqueFileName = Guid.NewGuid().ToString() + "_" + imageFile.FileName;
                string filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await imageFile.CopyToAsync(fileStream);
                }

                newMessage.image_url = "/uploads/chats/" + uniqueFileName;
                current_chat_room_obj.image_url = "/uploads/chats/" + uniqueFileName;
            }

            if (documentFile != null && documentFile.Length > 0)
            {
                string docUploadsFolder = Path.Combine(_env.WebRootPath, "uploads", "documents");
                if (!Directory.Exists(docUploadsFolder)) Directory.CreateDirectory(docUploadsFolder);

                string uniqueDocName = Guid.NewGuid().ToString() + "_" + documentFile.FileName;
                string docFilePath = Path.Combine(docUploadsFolder, uniqueDocName);

                using (var fileStream = new FileStream(docFilePath, FileMode.Create))
                {
                    await documentFile.CopyToAsync(fileStream);
                }

                newMessage.document_url = "/uploads/documents/" + uniqueDocName;
                current_chat_room_obj.document_url = "/uploads/documents/" + uniqueDocName;
                newMessage.document_name = documentFile.FileName; 
            }

            if (newMessage != null && (
                !string.IsNullOrEmpty(newMessage.message_text) || 
                !string.IsNullOrEmpty(newMessage.image_url) || 
                !string.IsNullOrEmpty(newMessage.document_url) ||
                !string.IsNullOrEmpty(newMessage.poll_id)))
            { 
                newMessage.sender_id = currentUserId;
                newMessage.sender_img = current_user_obj.ProfileImgPath;
                Console.WriteLine(newMessage.poll_id);
                newMessage.timestamp = DateTime.UtcNow;
                
                await _chatService.SaveMessageAsync(newMessage);

                string previewText = newMessage.message_text;

                if (string.IsNullOrEmpty(previewText)) 
                {
                    if (!string.IsNullOrEmpty(newMessage.image_url)) 
                    {
                        previewText = "Sent Photo";
                    } 
                    else if (!string.IsNullOrEmpty(newMessage.document_url)) 
                    {
                        previewText = "Sent File";
                    }
                    else if (!string.IsNullOrEmpty(newMessage.poll_id))
                    {
                        previewText = "Poll Create";
                    }
                }

                await _chatService.UpdateLastMessageAsync(
                    newMessage.chat_room_id, 
                    previewText,             
                    newMessage.timestamp
                );

                await Travello.Services.WebSocketManage.BroadcastToRoom(newMessage.chat_room_id, "NEW_MSG");
                
                return Json(new { success = true });
            }
            return Json(new { success = false });
        }
    }
}