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
        private readonly IMongoCollection<EventModel> _eventsCollection;
        private readonly IMongoDatabase _database;
                

        public HomeController(IMongoDatabase database)
        {
            _eventsCollection = database.GetCollection<EventModel>("events");
            _database = database;
        }

        public async Task<IActionResult> Index(int page = 1, string? searchLocation = null, DateTime? searchDate = null, string[]? selectedTags = null) 
        {
            int page_size = 9;

            var filterBuilder = Builders<EventModel>.Filter;
            var filter = filterBuilder.Where(x => x.attendees_limit > x.attendees && !x.isRegistrationClosed);

            if (!string.IsNullOrEmpty(searchLocation))
            {
                var regex = new MongoDB.Bson.BsonRegularExpression(searchLocation, "i");
                filter &= filterBuilder.Regex(x => x.location, regex);
            }

            if (searchDate.HasValue)
            {
                var pureDate = searchDate.Value.Date; 
    
                DateTime searchDayStart = DateTime.SpecifyKind(pureDate, DateTimeKind.Utc);
                DateTime searchDayEnd = searchDayStart.AddDays(1);

                filter &= filterBuilder.Lt(x => x.start_date, searchDayEnd);
                filter &= filterBuilder.Gt(x => x.end_date, searchDayStart);
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
                .Sort(new BsonDocument { 
                    { "count", -1 }, 
                    { "_id", 1 } 
                })
                .Limit(5)
                .ToListAsync();

            ViewBag.PopularTags = popularTagsAggregation.Select(t => t["_id"].AsString).ToList();

            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                Response.Headers["Vary"] = "X-Requested-With";
                return PartialView("_DataWrapper", events);
            }

            return View(events);
        }

        public async Task<IActionResult> Profile() 
        {

            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return RedirectToAction("Index", "Home");
            }

        
            var userCollection = _eventsCollection.Database.GetCollection<EditProfileViewModel>("User");
            var userProfile = await userCollection.Find(u => u.user_id == userId)
                .Project(u => new EditProfileViewModel 
                {
                    user_id = u.user_id,
                    username = u.username,
                    first_name = u.first_name,
                    last_name = u.last_name,
                    about_me = u.about_me,
                    profile_img_path = u.profile_img_path,
                    user_tag = u.user_tag 
                })
                .FirstOrDefaultAsync();

            
            ViewBag.UserProfile = userProfile;
            ViewBag.IsOwner = true;

    
            var eventsDocCollection = _eventsCollection.Database.GetCollection<EventDocument>("events");
            var dbPosts = await eventsDocCollection.Find(e => e.CreatedBy == userId).ToListAsync();

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
        [HttpGet("/Home/UserProfile/{id}")]
        public async Task<IActionResult> UserProfile(string id)
        {
            var currentUserId = HttpContext.Session.GetString("UserId");

            
            if (id == currentUserId)
            {
                return RedirectToAction("Profile", "Home");
            }

            
            var userCollection = _database.GetCollection<EditProfileViewModel>("User");
            var userProfile = await userCollection.Find(u => u.user_id == id)
                .Project(u => new EditProfileViewModel 
                {
                    user_id = u.user_id,
                    username = u.username,
                    first_name = u.first_name,
                    last_name = u.last_name,
                    about_me = u.about_me,
                    profile_img_path = u.profile_img_path,
                    user_tag = u.user_tag
                })
                .FirstOrDefaultAsync();

            if (userProfile == null) return NotFound("ไม่พบผู้ใช้งานนี้");

     
            ViewBag.UserProfile = userProfile;
            ViewBag.IsOwner = false; 
            
            var me = await userCollection.Find(u => u.user_id == currentUserId).FirstOrDefaultAsync();
            ViewBag.MyJoinedEvents = me?.event_id ?? new List<string>();

            var eventsDocCollection = _database.GetCollection<EventDocument>("events");
            var dbPosts = await eventsDocCollection.Find(e => e.CreatedBy == id).ToListAsync();

            var viewModels = dbPosts.Select(db => new EventDetailViewModel
            {
                EventId = db.Id,
                EventTitle = string.IsNullOrWhiteSpace(db.EventTitle) ? "ไม่มีชื่อกิจกรรม" : db.EventTitle,
                Detail = string.IsNullOrWhiteSpace(db.Detail) ? "ไม่มีรายละเอียด" : db.Detail,
                CoverImage = string.IsNullOrWhiteSpace(db.EventImgPath) 
                    ? "https://img.freepik.com/free-photo/beautiful-tropical-beach-sea-with-coconut-palm-tree_74190-6843.jpg?w=740" 
                    : db.EventImgPath
            }).ToList();

            return View("Profile", viewModels);
        }
        public class DeleteTagRequestProfile
        {
            public string tag { get; set; }
        }
        [HttpPost]
        public async Task<IActionResult> DeleteTag([FromBody] DeleteTagRequestProfile request)
        {
            var currentUserId = HttpContext.Session.GetString("UserId");
            var usersCollection = _database.GetCollection<EditProfileViewModel>("User"); 

            string cleanTag = request.tag.Trim().ToUpper();

            var update = Builders<EditProfileViewModel>.Update.Pull(u => u.user_tag, cleanTag);
            var result = await usersCollection.UpdateOneAsync(u => u.user_id == currentUserId, update);

            if (result.ModifiedCount > 0) {
                return Json(new { success = true }); 
            } else if (result.MatchedCount > 0) {
                return Json(new { success = false, message = $"Found ID but can't find '{cleanTag}' in the system" });
            } else {
                return Json(new { success = false, message = "User ID not found in the database" });
            }
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}