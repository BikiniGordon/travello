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
        public async Task<List<ChatRoomModel>> GetUserChatsAsync(List<int> userEventIds)
        {
            // ค้นหาห้องแชทที่มี event_id อยู่ในลิสต์ที่ส่งมา
            var filter = Builders<ChatRoomModel>.Filter.In(chat => chat.event_id, userEventIds);
            return await _chatRooms.Find(filter).ToListAsync();
        }
    }
}