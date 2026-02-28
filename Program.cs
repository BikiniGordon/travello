using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Get the settings from appsettings.json
var mongoSettings = builder.Configuration.GetSection("MongoDBSettings");

// Register the Client (The connection to Atlas)
builder.Services.AddSingleton<IMongoClient>(sp => 
    new MongoClient(mongoSettings.GetValue<string>("ConnectionString")));

// Register the Database (The specific DB inside Atlas)
builder.Services.AddScoped(sp => {
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase(mongoSettings.GetValue<string>("DatabaseName"));
});

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
