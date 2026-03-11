# Travello

Lightweight event planning and chat web app (ASP.NET Core + MongoDB).

## Quick overview
- Users can create and edit events, join event chats, create polls, vote, and receive notifications.
- Real-time chat/poll updates via WebSockets. Client-side JS handles dynamic UI, polls, notifications, and support both static and dynamic map.

## Tech stack
- ASP.NET Core (project: `Travello.csproj`)
- MongoDB for persistence
- Vanilla JavaScript in `wwwroot/js` for client UI
- WebSockets for real-time chat (see `Hubs/ChatHub.cs`)

## Run locally
1. Install .NET SDK (matching project target) and run a local MongoDB instance.
2. Configure `appsettings.Development.json` with your MongoDB connection details.
3. From repository root run:

```
dotnet build
dotnet run --project Travello.csproj
```

The app listens on the port configured in `Properties/launchSettings.json` (or the default Kestrel port).