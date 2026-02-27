using Microsoft.Data.Sqlite;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

var app = builder.Build();

InitializeDatabase(app.Environment.ContentRootPath, app.Logger);

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

static void InitializeDatabase(string contentRootPath, ILogger logger)
{
    var dbDirectory = Path.Combine(contentRootPath, "db");
    Directory.CreateDirectory(dbDirectory);

    var databasePath = Path.Combine(dbDirectory, "travello.db");
    var schemaPath = Path.Combine(dbDirectory, "schema.sql");

    if (!File.Exists(schemaPath))
    {
        logger.LogWarning("Schema file not found at {SchemaPath}. Skipping database initialization.", schemaPath);
        return;
    }

    var schemaSql = File.ReadAllText(schemaPath);

    using var connection = new SqliteConnection($"Data Source={databasePath};Foreign Keys=True");
    connection.Open();

    using var command = connection.CreateCommand();
    command.CommandText = schemaSql;
    command.ExecuteNonQuery();

    logger.LogInformation("SQLite database initialized at {DatabasePath}", databasePath);
}
