using MongoDB.Driver;
using Microsoft.Extensions.Options;
using Travello.Models;
using Travello.Services;

void LoadDotEnv(string path)
{
    if (!File.Exists(path)) return;

    foreach (var line in File.ReadAllLines(path))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;

        var parts = line.Split('=', 2);
        if (parts.Length != 2) continue;

        var key = parts[0].Trim();
        var value = parts[1].Trim();
        Environment.SetEnvironmentVariable(key, value);
    }
}

LoadDotEnv(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession();
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

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();
app.UseSession();

app.UseSession();

app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();