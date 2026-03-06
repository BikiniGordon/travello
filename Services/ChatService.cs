using MongoDB.Driver;
using Travello.Models;

namespace Travello.Services
{
    public class ChatService
    {
        private readonly IMongoCollection<ChatRoomModel> _chatRooms;

        public ChatService(IMongoDatabase database)
        {
            // ชี้ไปที่ Collection ชื่อ "chat_rooms" ใน MongoDB
            _chatRooms = database.GetCollection<ChatRoomModel>("chat_rooms");
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

        // เพิ่มฟังก์ชันนี้ต่อท้ายฟังก์ชันเดิมใน ChatService.cs
        public async Task SaveMessageAsync(ChatMessageModel newMessage)
        {
            // บันทึกข้อความลง Collection "messages"
            await _messages.InsertOneAsync(newMessage);
        }
    }
}