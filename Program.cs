using MongoDB.Driver;
using Microsoft.Extensions.Options;
using Travello.Models;
using Travello.Services;
using Travello.Hubs;
using Travello.DTOs;
using System.Net.WebSockets;
using System.Threading; // เผื่อไว้สำหรับ CancellationToken

LoadDotEnv(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSession(options => {
    options.IdleTimeout = TimeSpan.FromHours(2); // ตั้งเวลาหมดอายุ Session (เช่น 2 ชั่วโมง)
});

// Add services to the container.
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllersWithViews();
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.IdleTimeout = TimeSpan.FromHours(12);
});
var mongoSection = builder.Configuration.GetSection("MongoDBsettings");
builder.Services.Configure<MongoDbSettings>(options =>
{
    mongoSection.Bind(options);
    options.ConnectionString = builder.Configuration["MONGODB_CONNECTION_STRING"] ?? options.ConnectionString;
    options.DatabaseName = builder.Configuration["MONGODB_DATABASE_NAME"] ?? options.DatabaseName;
});

builder.Services.AddSingleton<IMongoClient>(serviceProvider =>
{
    var settings = serviceProvider.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    if (string.IsNullOrWhiteSpace(settings.ConnectionString))
        throw new InvalidOperationException("MongoDB connection string is missing.");
    return new MongoClient(settings.ConnectionString);
});

builder.Services.AddSingleton(serviceProvider =>
{
    var settings = serviceProvider.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    if (string.IsNullOrWhiteSpace(settings.DatabaseName))
        throw new InvalidOperationException("MongoDB database name is missing.");
    return serviceProvider.GetRequiredService<IMongoClient>().GetDatabase(settings.DatabaseName);
});

builder.Services.AddSingleton(serviceProvider =>
    serviceProvider.GetRequiredService<IMongoDatabase>().GetCollection<EventDocument>("events"));

builder.Services.AddSingleton<EventService>();

builder.Services.AddScoped<IImageUploadService, CloudinaryImageUploadService>();
builder.Services.AddControllersWithViews();
builder.Services.AddSingleton(serviceProvider =>
    serviceProvider.GetRequiredService<IMongoDatabase>().GetCollection<EditProfileViewModel>("User"));

builder.Services.AddSingleton(serviceProvider =>
    serviceProvider.GetRequiredService<IMongoDatabase>().GetCollection<NotificationDocument>("notifications"));
builder.Services.AddScoped<INotificationService, NotificationService>();



//Chat--------------------------------------------------------
builder.Services.AddScoped<ChatService>();

//Poll---------------------------------------------------------
builder.Services.AddScoped<PollService>();

//-------------------------------------------------------------

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

// app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseWebSockets();
app.UseRouting();
app.UseSession();
app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapHub<ChatHub>("/chatHub");

app.Map("/ws", async context =>
{
    if (context.WebSockets.IsWebSocketRequest)
    {
        var roomId = context.Request.Query["chat_room_id"].ToString();
        if (!string.IsNullOrEmpty(roomId))
        {
            // รับสาย
            using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
            
            // เอาสายนี้ไปเก็บไว้ในห้องแชทที่ระบุ
            Travello.Services.WebSocketManage.Rooms.AddOrUpdate(roomId, 
                new List<WebSocket> { webSocket }, 
                (key, existingList) => { existingList.Add(webSocket); return existingList; });

            // ถือสายรอไว้เรื่อยๆ จนกว่าหน้าเว็บจะปิดหนี (ดักฟังข้อความขยะเพื่อดึงเวลาไว้)
            var buffer = new byte[1024];
            var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            while (!result.CloseStatus.HasValue)
            {
                result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }
            
            // ถ้าหน้าเว็บปิดทิ้ง ก็เอาสายนี้ออกจากห้องแชท
            if (Travello.Services.WebSocketManage.Rooms.TryGetValue(roomId, out var sockets))
            {
                sockets.Remove(webSocket);
            }
            await webSocket.CloseAsync(result.CloseStatus.Value, result.CloseStatusDescription, CancellationToken.None);
        }
        else { context.Response.StatusCode = 400; }
    }
    else { context.Response.StatusCode = 400; }
});

app.Run();

static void LoadDotEnv(string path)
{
    if (!File.Exists(path))
    {
        return;
    }

    foreach (var rawLine in File.ReadAllLines(path))
    {
        var line = rawLine.Trim();
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
        {
            continue;
        }

        var separatorIndex = line.IndexOf('=');
        if (separatorIndex <= 0)
        {
            continue;
        }

        var key = line[..separatorIndex].Trim();
        var value = line[(separatorIndex + 1)..].Trim();
        if (string.IsNullOrWhiteSpace(key))
        {
            continue;
        }

        if ((value.StartsWith('"') && value.EndsWith('"')) || (value.StartsWith('\'') && value.EndsWith('\'')))
        {
            value = value[1..^1];
        }

        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}
