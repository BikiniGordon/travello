using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using MongoDB.Driver;
using MongoDB.Bson;
using Travello.Models;

namespace Travello.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Privacy()
        {
            return View();
        }
        public async Task<IActionResult> Profile() 
        {
            // 1. เช็คว่าใครล็อกอินอยู่ (ดึง UserId จาก Session)
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                // ถ้ายังไม่ล็อกอิน ให้เด้งกลับไปหน้าแรกก่อน
                return RedirectToAction("Index", "Home");
            }

            // 2. ดึงข้อมูล "ข้อมูลส่วนตัว" จาก Collection "User"
            // (ใช้ EditProfileViewModel เป็นกล่องรับข้อมูล)
            var userCollection = _eventsCollection.Database.GetCollection<EditProfileViewModel>("User");
            var userProfile = await userCollection.Find(u => u.user_id == userId).FirstOrDefaultAsync();

            // 3. เอาข้อมูล User ยัดใส่กระเป๋า ViewBag ส่งไปหน้าเว็บ
            ViewBag.UserProfile = userProfile;

            // 4. ดึงข้อมูล "โพสต์กิจกรรม" (ใช้โค้ดเดิมที่ทำไว้เลยครับ)
            var eventsDocCollection = _eventsCollection.Database.GetCollection<EventDocument>("events");
            var dbPosts = await eventsDocCollection.Find(_ => true).ToListAsync();

            var viewModels = dbPosts.Select(db => new EventDetailViewModel
            {
                EventId = db.Id,
                EventTitle = string.IsNullOrWhiteSpace(db.EventTitle) ? "ไม่มีชื่อกิจกรรม" : db.EventTitle,
                Detail = string.IsNullOrWhiteSpace(db.Detail) ? "ไม่มีรายละเอียด" : db.Detail,
                CoverImage = string.IsNullOrWhiteSpace(db.EventImgPath) 
                    ? "https://img.freepik.com/free-photo/beautiful-tropical-beach-sea-with-coconut-palm-tree_74190-6843.jpg?w=740" 
                    : db.EventImgPath
            }).ToList();

            return View(viewModels);
        }
        
        private readonly IMongoCollection<EventModel> _eventsCollection;

        public HomeController(IMongoDatabase database)
        {
            _eventsCollection = database.GetCollection<EventModel>("events");
        }

        public async Task<IActionResult> Index(int page = 1, string? searchLocation = null, DateTime? searchDate = null, string[]? selectedTags = null) 
        {
            int page_size = 9;

            var filterBuilder = Builders<EventModel>.Filter;
            var filter = filterBuilder.Where(x => x.attendees_limit > x.attendees);

            if (!string.IsNullOrEmpty(searchLocation))
            {
                var regex = new MongoDB.Bson.BsonRegularExpression(searchLocation, "i");
                filter &= filterBuilder.Regex(x => x.location, regex);
            }

            if (searchDate.HasValue)
            {
                DateTime dateOnly = DateTime.SpecifyKind(searchDate.Value.Date, DateTimeKind.Unspecified);
                DateTime searchDayStart = searchDate.Value.Date;
                DateTime searchDayEnd = searchDate.Value.Date.AddDays(1).AddTicks(-1);

                filter &= filterBuilder.Lte(x => x.start_date, searchDayEnd);
                filter &= filterBuilder.Gte(x => x.end_date, searchDayStart);
            }

            if (selectedTags != null && selectedTags.Length > 0)
            {
                var tagFilters = selectedTags.Select(tag => 
                    filterBuilder.Regex("event_tag", new MongoDB.Bson.BsonRegularExpression($"^{tag}$", "i"))
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