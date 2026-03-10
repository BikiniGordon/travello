using MongoDB.Driver;
using Travello.Models;
using Travello.DTOs;

namespace Travello.Services
{
    public class ChatService
    {
        private readonly IMongoCollection<ChatRoomModel> _chatRooms;
        private readonly IMongoCollection<ChatMessageModel> _messages;
        private readonly IMongoCollection<User> _users;
        private readonly IMongoCollection<PollModel> _pollCollection;


        public ChatService(IMongoDatabase database)
        {
        
            _chatRooms = database.GetCollection<ChatRoomModel>("chat_rooms");
            _messages = database.GetCollection<ChatMessageModel>("messages");
            _users = database.GetCollection<User>("User");
            _pollCollection = database.GetCollection<PollModel>("polls");
        }

        public async Task<List<ChatRoomModel>> GetUserChatsAsync(List<string> userEventIds)
        {
            var filter = Builders<ChatRoomModel>.Filter.In(chat => chat.event_id, userEventIds);
            return await _chatRooms.Find(filter).ToListAsync();
        }

        public async Task UpdateChatNameAsync(string chatid, string newChatName)
        {
            var update = Builders<ChatRoomModel>.Update.Set(chat => chat.chat_name, newChatName);
            
            await _chatRooms.UpdateOneAsync(chat => chat.id == chatid, update);
        }

        public async Task UpdateLastMessageAsync(string chatid, string messageText, DateTime timestamp)
        {
            var updateDef = Builders<ChatRoomModel>.Update
                .Set(r => r.last_message_text, messageText)
                .Set(r => r.last_message_time, timestamp);


            await _chatRooms.UpdateOneAsync(r => r.id == chatid, updateDef);
        }


        public async Task SaveMessageAsync(ChatMessageModel newMessage)
        {
            await _messages.InsertOneAsync(newMessage);
        }

        public async Task<List<ChatHistoryResponse>> GetChatHistoryAsync(string chat_room_id)
        {
            var messages = await _messages
                            .Find(msg => msg.chat_room_id == chat_room_id)
                            .SortBy(msg => msg.timestamp)
                            .ToListAsync();

            var senderIds = messages.Select(m => m.sender_id).Distinct().ToList();
            var users = await _users.Find(u => senderIds.Contains(u.Id)).ToListAsync();

            var chatHistory = messages.Select(msg => {
                var sender = users.FirstOrDefault(u => u.Id == msg.sender_id);

                return new ChatHistoryResponse {
                    message_text = msg.message_text,
                    image_url = msg.image_url,
                    document_url = msg.document_url, 
                    document_name = msg.document_name,
                    timestamp = msg.timestamp,
                    sender_id = msg.sender_id,
                    sender_name = sender != null ? sender.Username : "Unknown", 
                    sender_img = sender != null ? sender.ProfileImgPath : "/images/chat_img_background.svg" ,
                    poll_id = msg.poll_id
                };
            }).ToList();

            foreach (var chat in chatHistory)
            {
                if (!string.IsNullOrEmpty(chat.poll_id))
                {
                    chat.poll_data = await _pollCollection
                        .Find(p => p.Id == chat.poll_id)
                        .FirstOrDefaultAsync();
                }
                if (chat.poll_data != null)
                {
                    foreach (var option in chat.poll_data.Options)
                    {
                        if (option.Voters != null && option.Voters.Count > 0)
                        {
                            var votersData = await _users
                                .Find(u => option.Voters.Contains(u.Id)) 
                                .ToListAsync();

                            option.voter_profiles = votersData
                                .Select(u => string.IsNullOrEmpty(u.ProfileImgPath) ? "/images/chat_img_background.svg" : u.ProfileImgPath)
                                .ToList();
                        }
                    }
                }
            }
            return chatHistory;
        }
    }
}