using Microsoft.AspNetCore.SignalR;

namespace Travello.Hubs
{
    public class PollHub : Hub
    {
        public async Task JoinEventPolls(string eventId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"poll_{eventId}");
        }

        public async Task LeaveEventPolls(string eventId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"poll_{eventId}");
        }
    }
}
