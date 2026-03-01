using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;       // Required for Builders and ReplaceOne
using Travello.Models;
using System.IO;            // Required for File handling

namespace Travello.Controllers
{
    public class UserController : Controller
    {
        private readonly IMongoCollection<UserViewModel> _userCollection;
        private readonly IWebHostEnvironment _hostEnvironment;

        public UserController(IMongoDatabase database, IWebHostEnvironment hostEnvironment)
        {
            _userCollection = database.GetCollection<UserViewModel>("User");
            _hostEnvironment = hostEnvironment;
        }

        [HttpGet]
        public async Task<IActionResult> EditProfile()
        {
            // Temporarily hardcode a username that actually EXISTS in your Atlas collection FIX REQUIRED HERE BUDDY
            var user = await _userCollection.Find(u => u.username == "ThaiTraveler01").FirstOrDefaultAsync();
            
            if (user == null)
            {
                // If it still can't find it, create a dummy one so the page doesn't crash
                return Content("Error: User 'ThaiTraveler01' not found in MongoDB. Please check Atlas.");
            }

            return View(user);
        }

        [HttpPost]
        public async Task<IActionResult> EditProfile(UserViewModel updatedUser)
        {

            if (!ModelState.IsValid)
            {
                return View(updatedUser); 
            }

            var existingWithSameName = await _userCollection.Find(u => 
                u.username.ToLower() == updatedUser.username.ToLower() && 
                u.user_id != updatedUser.user_id).FirstOrDefaultAsync();

            if (existingWithSameName != null)
            {
                // This adds a specific error to the 'username' field
                ModelState.AddModelError("username", "This username is already taken.");
                return View(updatedUser);
            }
            // 1. Fetch the original record to prevent losing non-editable data
            var existingUser = await _userCollection.Find(u => u.user_id == updatedUser.user_id).FirstOrDefaultAsync();
            if (existingUser == null) return NotFound();

            // 2. Handle the Image Upload
            if (updatedUser.ProfileImageUpload != null)
            {
            // --- PART 1: SAVE NEW IMAGE ---
            string folder = "images/profiles/";
            string uploadsFolder = Path.Combine(_hostEnvironment.WebRootPath, folder);
            if (!string.IsNullOrEmpty(existingUser.profile_img_path) && 
                !existingUser.profile_img_path.Contains("default.png"))
            {
                string oldPath = Path.Combine(_hostEnvironment.WebRootPath, existingUser.profile_img_path.TrimStart('/'));
                if (System.IO.File.Exists(oldPath))
                {
                    System.IO.File.Delete(oldPath);
                }
            }

            // Create the folder on your laptop if it's missing
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            string fileName = Guid.NewGuid().ToString() + "_" + updatedUser.ProfileImageUpload.FileName;
            string serverPath = Path.Combine(uploadsFolder, fileName);

            using (var fileStream = new FileStream(serverPath, FileMode.Create))
            {
                await updatedUser.ProfileImageUpload.CopyToAsync(fileStream);
            }
            
            // Set the NEW path for MongoDB
            updatedUser.profile_img_path = "/" + folder + fileName;
            }
            else
            {
                // --- PART 2: KEEP OLD IMAGE ---
                // This prevents the database from being updated with a NULL image path
                updatedUser.profile_img_path = existingUser.profile_img_path;
            }
            
            if (updatedUser.user_tag != null)
            {
                updatedUser.user_tag = updatedUser.user_tag
                    .Select(t => t.Trim().ToUpper()) // Force uppercase
                    .Distinct()                      // Remove any accidental duplicates
                    .ToList();
            }
            // 3. Keep data that wasn't in the form (like tags or IDs)
            updatedUser.user_id = existingUser.user_id;
            updatedUser.event_id = existingUser.event_id;
            updatedUser.password_hash = existingUser.password_hash;
            // 4. Update MongoDB
            var filter = Builders<UserViewModel>.Filter.Eq(u => u.user_id, updatedUser.user_id);
            await _userCollection.ReplaceOneAsync(filter, updatedUser);

            return RedirectToAction("EditProfile");
        }
    }
}