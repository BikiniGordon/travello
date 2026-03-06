using MongoDB.Driver;
using Travello.Models;
using Travello.DTOs;

namespace Travello.Services
{
    public class ChatService
    {
        private readonly IMongoCollection<ChatRoomModel> _chatRooms;
        private readonly IMongoCollection<ChatMessageModel> _messages;
        private readonly IMongoCollection<UserModel> _users;

        public ChatService(IMongoDatabase database)
        {
            // ชี้ไปที่ Collection ชื่อ "chat_rooms" ใน MongoDB
            _chatRooms = database.GetCollection<ChatRoomModel>("chat_rooms");
            _messages = database.GetCollection<ChatMessageModel>("messages");
            _users = database.GetCollection<UserModel>("users");
        }

        // ฟังก์ชันดึงห้องแชทตาม List ของ event_id ที่ user เข้าร่วม
        public async Task<List<ChatRoomModel>> GetUserChatsAsync(List<string> userEventIds)
        {
            // ค้นหาห้องแชทที่มี event_id อยู่ในลิสต์ที่ส่งมา
            var filter = Builders<ChatRoomModel>.Filter.In(chat => chat.event_id, userEventIds);
            return await _chatRooms.Find(filter).ToListAsync();
        }

        public async Task UpdateChatNameAsync(string chatid, string newChatName)
        {
            // สร้างคำสั่ง "Set" ค่า chat_name ใหม่
            var update = Builders<ChatRoomModel>.Update.Set(chat => chat.chat_name, newChatName);
            
            // สั่งอัปเดตลงตาราง chat_rooms โดยหาจาก Id ของห้องแชท
            await _chatRooms.UpdateOneAsync(chat => chat.id == chatid, update);
        }

        public async Task SaveMessageAsync(ChatMessageModel newMessage)
        {
            await _messages.InsertOneAsync(newMessage);
        }

        public async Task<List<ChatHistoryResponse>> GetChatHistoryAsync(string chat_room_id)
        {
            // 1. ดึงข้อความ
            var messages = await _messages
                            .Find(msg => msg.chat_room_id == chat_room_id)
                            .SortBy(msg => msg.timestamp)
                            .ToListAsync();

            // 2. ดึงข้อมูล User
            var senderIds = messages.Select(m => m.sender_id).Distinct().ToList();
            var users = await _users.Find(u => senderIds.Contains(u.id)).ToListAsync();

            // 3. ประกอบร่างใส่ลงใน DTO (ไม่ใช้ object เปล่าๆ แล้ว)
            var chatHistory = messages.Select(msg => {
                var sender = users.FirstOrDefault(u => u.id == msg.sender_id);

                return new ChatHistoryResponse {
                    message_text = msg.message_text,
                    timestamp = msg.timestamp,
                    sender_id = msg.sender_id,
                    sender_name = sender != null ? sender.username : "Unknown", 
                    sender_img = sender != null ? sender.profile_img_path : "/images/chat_img_background.svg" 
                };
            }).ToList();

            return chatHistory;
        }
    }
}