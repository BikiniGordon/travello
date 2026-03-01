using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Travello.Models;

LoadDotEnv(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
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
    {
        throw new InvalidOperationException(
            "MongoDB connection string is missing. Set MongoDBsettings:ConnectionString via user-secrets or MongoDBsettings__ConnectionString / MONGODB_CONNECTION_STRING environment variable.");
    }

    return new MongoClient(settings.ConnectionString);
});
builder.Services.AddSingleton(serviceProvider =>
{
    var settings = serviceProvider.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    if (string.IsNullOrWhiteSpace(settings.DatabaseName))
    {
        throw new InvalidOperationException(
            "MongoDB database name is missing. Set MongoDBsettings:DatabaseName via user-secrets or MongoDBsettings__DatabaseName / MONGODB_DATABASE_NAME environment variable.");
    }

    return serviceProvider.GetRequiredService<IMongoClient>().GetDatabase(settings.DatabaseName);
});
builder.Services.AddSingleton(serviceProvider =>
    serviceProvider.GetRequiredService<IMongoDatabase>().GetCollection<EventDocument>("events"));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


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
