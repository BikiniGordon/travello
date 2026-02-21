using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Travello.Models;
// using Travello.Services; (สมมติว่าคุณมี Service ไว้ต่อ MongoDB)

namespace Travello.Hubs
{
    public class ChatHub : Hub
    {
        // ฟังก์ชันนี้จะถูกเรียกจากหน้า HTML (JavaScript) เมื่อผู้ใช้กดปุ่ม "ส่ง"
        public async Task SendMessage(string event_id, string user_id, string message_text)
        {
            // 1. บันทึกข้อความลง MongoDB ก่อน (เพื่อให้ประวัติไม่หาย)
            var newMessage = new ChatMessageModel { 
                event_id = event_id, 
                sender_id = user_id, 
                message_text = message_text 
            };
            // _mongoService.InsertMessage(newMessage); // โค้ดบันทึกลง DB

            // 2. ส่งข้อความเด้งไปหา "ทุกคน" ที่อยู่ในห้องทริปเดียวกัน (roomId) แบบ Real-time
            await Clients.Group(event_id).SendAsync("ReceiveMessage", user_id, message_text);
        }

        // ฟังก์ชันสำหรับดึงผู้ใช้เข้า "กลุ่ม" (เพื่อให้คุยแยกห้องแชทได้)
        public async Task JoinRoom(string event_id)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, event_id);
        }
    }
}