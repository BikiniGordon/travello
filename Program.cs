using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Travello.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDBsettings"));
builder.Services.AddSingleton<IMongoClient>(serviceProvider =>
{
    var settings = serviceProvider.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    return new MongoClient(settings.ConnectionString);
});
builder.Services.AddSingleton(serviceProvider =>
{
    var settings = serviceProvider.GetRequiredService<IOptions<MongoDbSettings>>().Value;
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
