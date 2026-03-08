using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;

namespace Travello.Services // เปลี่ยน namespace ตามโปรเจกต์คุณนะ
{
    public static class WebSocketManage
    {
        // เก็บรายชื่อคนในห้องแชท: RoomID -> List ของ WebSockets
        public static ConcurrentDictionary<string, List<WebSocket>> Rooms = new();

        // ฟังก์ชันตะโกนบอกทุกคนในห้อง
        public static async Task BroadcastToRoom(string roomId, string message)
        {
            if (Rooms.TryGetValue(roomId, out var sockets))
            {
                var buffer = Encoding.UTF8.GetBytes(message);
                var arraySegment = new ArraySegment<byte>(buffer);

                sockets.RemoveAll(s => s.State != WebSocketState.Open);

                foreach (var socket in sockets)
                {
                    if (socket.State == WebSocketState.Open)
                    {
                        await socket.SendAsync(arraySegment, WebSocketMessageType.Text, true, CancellationToken.None);
                    }
                }
            }
        }
    }
}