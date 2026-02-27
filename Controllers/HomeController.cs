using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Travello.Models;

namespace Travello.Controllers
{
    public class HomeController : Controller
    {
        private readonly IWebHostEnvironment _environment;

        public HomeController(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        public IActionResult CreateEvent()
        {
            return View("~/Views/Create_event/CreateEvent.cshtml");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult CreateEvent(CreateEventInputModel input)
        {
            if (!ModelState.IsValid)
            {
                return View("~/Views/Create_event/CreateEvent.cshtml");
            }

            try
            {
                var dbPath = Path.Combine(_environment.ContentRootPath, "db", "travello.db");
                using var connection = new SqliteConnection($"Data Source={dbPath};Foreign Keys=True");
                connection.Open();

                using var transaction = connection.BeginTransaction();

                var creatorId = EnsureDefaultUser(connection, transaction);
                var eventId = InsertEvent(connection, transaction, creatorId, input);

                InsertLocation(connection, transaction, eventId, input);
                InsertEventTags(connection, transaction, eventId, input.SelectedTagsCsv);
                InsertItinerary(connection, transaction, eventId, input.PlannerJson);

                transaction.Commit();

                return RedirectToAction("Detail", "Event", new { id = eventId });
            }
            catch (Exception ex)
            {
                ModelState.AddModelError(string.Empty, $"Unable to create event: {ex.Message}");
                return View("~/Views/Create_event/CreateEvent.cshtml");
            }
        }

        private static long EnsureDefaultUser(SqliteConnection connection, SqliteTransaction transaction)
        {
            using var ensureUser = connection.CreateCommand();
            ensureUser.Transaction = transaction;
            ensureUser.CommandText = @"
                INSERT INTO Users (username, created_at)
                SELECT 'system', CURRENT_TIMESTAMP
                WHERE NOT EXISTS (SELECT 1 FROM Users LIMIT 1);";
            ensureUser.ExecuteNonQuery();

            using var selectUser = connection.CreateCommand();
            selectUser.Transaction = transaction;
            selectUser.CommandText = "SELECT user_id FROM Users ORDER BY user_id LIMIT 1;";
            var result = selectUser.ExecuteScalar();
            return result is long id ? id : 1;
        }

        private static long InsertEvent(SqliteConnection connection, SqliteTransaction transaction, long creatorId, CreateEventInputModel input)
        {
            using var insertEvent = connection.CreateCommand();
            insertEvent.Transaction = transaction;
            insertEvent.CommandText = @"
                INSERT INTO Event
                    (creator_id, attendees_limit, event_title, detail, trip_rules, recruit_question, closing_date, start_date, end_date)
                VALUES
                    (@creator_id, @attendees_limit, @event_title, @detail, @trip_rules, @recruit_question, @closing_date, @start_date, @end_date);";

            var startDateTime = CombineDateAndTime(input.StartDate, input.StartTime);
            insertEvent.Parameters.AddWithValue("@creator_id", creatorId);
            insertEvent.Parameters.AddWithValue("@attendees_limit", (object?)input.AttendeesLimit ?? DBNull.Value);
            insertEvent.Parameters.AddWithValue("@event_title", input.EventTitle);
            insertEvent.Parameters.AddWithValue("@detail", (object?)input.Detail ?? DBNull.Value);
            insertEvent.Parameters.AddWithValue("@trip_rules", (object?)input.TripRules ?? DBNull.Value);
            insertEvent.Parameters.AddWithValue("@recruit_question", (object?)input.RecruitQuestion ?? DBNull.Value);
            insertEvent.Parameters.AddWithValue("@closing_date", (object?)input.ClosingDate ?? DBNull.Value);
            insertEvent.Parameters.AddWithValue("@start_date", (object?)startDateTime ?? DBNull.Value);
            insertEvent.Parameters.AddWithValue("@end_date", (object?)startDateTime ?? DBNull.Value);
            insertEvent.ExecuteNonQuery();

            using var lastIdCommand = connection.CreateCommand();
            lastIdCommand.Transaction = transaction;
            lastIdCommand.CommandText = "SELECT last_insert_rowid();";
            var idValue = lastIdCommand.ExecuteScalar();

            return idValue is long id ? id : 0;
        }

        private static void InsertLocation(SqliteConnection connection, SqliteTransaction transaction, long eventId, CreateEventInputModel input)
        {
            if (string.IsNullOrWhiteSpace(input.LocationName))
            {
                return;
            }

            using var insertLocation = connection.CreateCommand();
            insertLocation.Transaction = transaction;
            insertLocation.CommandText = @"
                INSERT INTO Location (event_id, place_name, latitude, longitude)
                VALUES (@event_id, @place_name, @latitude, @longitude);";

            insertLocation.Parameters.AddWithValue("@event_id", eventId);
            insertLocation.Parameters.AddWithValue("@place_name", input.LocationName);
            insertLocation.Parameters.AddWithValue("@latitude", TryParseDouble(input.Latitude));
            insertLocation.Parameters.AddWithValue("@longitude", TryParseDouble(input.Longitude));
            insertLocation.ExecuteNonQuery();
        }

        private static void InsertEventTags(SqliteConnection connection, SqliteTransaction transaction, long eventId, string? selectedTagsCsv)
        {
            if (string.IsNullOrWhiteSpace(selectedTagsCsv))
            {
                return;
            }

            var tags = selectedTagsCsv
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(tag => tag.ToLowerInvariant())
                .Distinct()
                .ToList();

            foreach (var tag in tags)
            {
                using var upsertTag = connection.CreateCommand();
                upsertTag.Transaction = transaction;
                upsertTag.CommandText = "INSERT OR IGNORE INTO Tags (tag_name) VALUES (@tag_name);";
                upsertTag.Parameters.AddWithValue("@tag_name", tag);
                upsertTag.ExecuteNonQuery();

                using var selectTagId = connection.CreateCommand();
                selectTagId.Transaction = transaction;
                selectTagId.CommandText = "SELECT tag_id FROM Tags WHERE tag_name = @tag_name LIMIT 1;";
                selectTagId.Parameters.AddWithValue("@tag_name", tag);
                var tagIdResult = selectTagId.ExecuteScalar();
                if (tagIdResult is not long tagId)
                {
                    continue;
                }

                using var mapTag = connection.CreateCommand();
                mapTag.Transaction = transaction;
                mapTag.CommandText = "INSERT OR IGNORE INTO EventTags (event_id, tag_id) VALUES (@event_id, @tag_id);";
                mapTag.Parameters.AddWithValue("@event_id", eventId);
                mapTag.Parameters.AddWithValue("@tag_id", tagId);
                mapTag.ExecuteNonQuery();
            }
        }

        private static void InsertItinerary(SqliteConnection connection, SqliteTransaction transaction, long eventId, string? plannerJson)
        {
            if (string.IsNullOrWhiteSpace(plannerJson))
            {
                return;
            }

            using var document = JsonDocument.Parse(plannerJson);
            if (document.RootElement.ValueKind != JsonValueKind.Array)
            {
                return;
            }

            foreach (var item in document.RootElement.EnumerateArray())
            {
                if (!item.TryGetProperty("placeName", out var placeNameElement))
                {
                    continue;
                }

                var placeName = placeNameElement.GetString();
                if (string.IsNullOrWhiteSpace(placeName))
                {
                    continue;
                }

                decimal? expenseValue = null;
                if (item.TryGetProperty("expenseTotal", out var expenseElement) && expenseElement.ValueKind == JsonValueKind.Number)
                {
                    expenseValue = expenseElement.GetDecimal();
                }

                string? activityTime = null;
                if (item.TryGetProperty("dayDate", out var dayDateElement) && dayDateElement.ValueKind == JsonValueKind.String)
                {
                    activityTime = dayDateElement.GetString();
                }

                using var insertItinerary = connection.CreateCommand();
                insertItinerary.Transaction = transaction;
                insertItinerary.CommandText = @"
                    INSERT INTO Itinerary (event_id, activity_name, expense, activity_time)
                    VALUES (@event_id, @activity_name, @expense, @activity_time);";
                insertItinerary.Parameters.AddWithValue("@event_id", eventId);
                insertItinerary.Parameters.AddWithValue("@activity_name", placeName);
                insertItinerary.Parameters.AddWithValue("@expense", (object?)expenseValue ?? DBNull.Value);
                insertItinerary.Parameters.AddWithValue("@activity_time", (object?)activityTime ?? DBNull.Value);
                insertItinerary.ExecuteNonQuery();
            }
        }

        private static string? CombineDateAndTime(string? date, string? time)
        {
            if (string.IsNullOrWhiteSpace(date))
            {
                return null;
            }

            if (!DateTime.TryParse(date, out var parsedDate))
            {
                return date;
            }

            if (TimeSpan.TryParse(time, out var parsedTime))
            {
                parsedDate = parsedDate.Date.Add(parsedTime);
            }

            return parsedDate.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
        }

        private static object TryParseDouble(string? value)
        {
            if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number))
            {
                return number;
            }

            return DBNull.Value;
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
