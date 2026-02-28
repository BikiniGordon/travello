using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using MongoDB.Driver;
using MongoDB.Bson;
using Travello.Models;

namespace Travello.Controllers
{
    public class HomeController : Controller
    {
        // public IActionResult Index()
        // {
        //     return View();
        // }

        public IActionResult Privacy()
        {
            return View();
        }
        
        private readonly IMongoCollection<EventModel> _eventsCollection;

        // The Constructor: This pulls the database connection from Program.cs
        public HomeController(IMongoDatabase database)
        {
            // "Event" is the name of the Collection in your MongoDB Atlas
            _eventsCollection = database.GetCollection<EventModel>("Event");
        }

        public async Task<IActionResult> Index(int page = 1, string? searchLocation = null, DateTime? searchDate = null, string[]? selectedTags = null) 
        {
            int page_size = 9;

            var filterBuilder = Builders<EventModel>.Filter;
            var filter = filterBuilder.Where(x => x.attendees_limit > x.attendees);

            // 1. Filter by Location
            // We use the string "location" to avoid C# List vs String conflicts
            if (!string.IsNullOrEmpty(searchLocation))
            {
                var regex = new MongoDB.Bson.BsonRegularExpression(searchLocation, "i");
                filter &= filterBuilder.Regex("location", regex); 
            }

            // 2. Filter by Date (Event is active during the searched date)
            if (searchDate.HasValue)
            {
                DateTime dateOnly = DateTime.SpecifyKind(searchDate.Value.Date, DateTimeKind.Unspecified);
                DateTime searchDayStart = searchDate.Value.Date; // 00:00:00
                DateTime searchDayEnd = searchDate.Value.Date.AddDays(1).AddTicks(-1); // 23:59:59

                // Logic: Event must start before the day ends AND end after the day begins
                filter &= filterBuilder.Lte(x => x.start_date, searchDayEnd);
                filter &= filterBuilder.Gte(x => x.end_date, searchDayStart);
            }

            if (selectedTags != null && selectedTags.Length > 0)
            {
                var tagFilters = selectedTags.Select(tag => 
                    filterBuilder.Regex("event_tag", new MongoDB.Bson.BsonRegularExpression($"^{tag}$", "i"))
                ).ToList();

                // Combine them with OR: "Show event if event_tag matches TagA OR TagB (Case Insensitive)"
                filter &= filterBuilder.Or(tagFilters);
            }

            var events = await _eventsCollection.Find(filter)
                .Skip((page - 1) * page_size)
                .Limit(page_size)
                .ToListAsync();

            long totalEvents = await _eventsCollection.CountDocumentsAsync(filter);
            
            ViewBag.CurrentPage = page;
            ViewBag.TotalPages = (int)Math.Ceiling((double)totalEvents / page_size);
            if (ViewBag.TotalPages < 1) ViewBag.TotalPages = 1;

            var categories = new[] { "CAMPING", "PHOTOGRAPHY", "RELAX", "SHOPPING", "ADVENTURE" };

            var popularTagsAggregation = await _eventsCollection.Aggregate()
                .Unwind(x => x.event_tag)
                // Convert to lowercase during the grouping stage for true case insensitivity
                .Project(new BsonDocument { { "tagLower", new BsonDocument("$toLower", "$event_tag") } })
                .Group(new BsonDocument { { "_id", "$tagLower" }, { "count", new BsonDocument("$sum", 1) } })
                .Match(new BsonDocument("_id", new BsonDocument("$nin", new BsonArray(categories.Select(c => c.ToLower())))))
                .Sort(new BsonDocument("count", -1))
                .Limit(5)
                .ToListAsync();

            ViewBag.PopularTags = popularTagsAggregation.Select(t => t["_id"].AsString).ToList();

            // AJAX Check for HomePage.js compatibility
            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                return PartialView("_DataWrapper", events);
            }

            return View(events);
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
