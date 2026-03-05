using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using MongoDB.Driver;
using MongoDB.Bson;
using Travello.Models;

namespace Travello.Controllers
{
    public class HomeController : Controller
    {
        private readonly IMongoCollection<EventModel> _eventsCollection;

        public IActionResult Privacy()
        {
            return View();
        }

        public HomeController(IMongoDatabase database)
        {
            _eventsCollection = database.GetCollection<EventModel>("Event");
        }

        public async Task<IActionResult> Index(int page = 1, string? searchLocation = null, DateTime? searchDate = null, string[]? selectedTags = null)
        {
            int page_size = 9;

            var filterBuilder = Builders<EventModel>.Filter;
            var filter = filterBuilder.Where(x => x.attendees_limit > x.attendees);

            if (!string.IsNullOrEmpty(searchLocation))
            {
                var regex = new BsonRegularExpression(searchLocation, "i");
                filter &= filterBuilder.Regex("location", regex);
            }

            if (searchDate.HasValue)
            {
                DateTime searchDayStart = searchDate.Value.Date;
                DateTime searchDayEnd = searchDate.Value.Date.AddDays(1).AddTicks(-1);

                filter &= filterBuilder.Lte(x => x.start_date, searchDayEnd);
                filter &= filterBuilder.Gte(x => x.end_date, searchDayStart);
            }

            if (selectedTags != null && selectedTags.Length > 0)
            {
                var tagFilters = selectedTags.Select(tag =>
                    filterBuilder.Regex("event_tag", new BsonRegularExpression($"^{tag}$", "i"))
                ).ToList();

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
                .Project(new BsonDocument { { "tagLower", new BsonDocument("$toLower", "$event_tag") } })
                .Group(new BsonDocument { { "_id", "$tagLower" }, { "count", new BsonDocument("$sum", 1) } })
                .Match(new BsonDocument("_id", new BsonDocument("$nin", new BsonArray(categories.Select(c => c.ToLower())))))
                .Sort(new BsonDocument("count", -1))
                .Limit(5)
                .ToListAsync();

            ViewBag.PopularTags = popularTagsAggregation.Select(t => t["_id"].AsString).ToList();

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
