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
            var user = await _userCollection.Find(u => u.username == "ThaiTraveler03").FirstOrDefaultAsync();
            
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
                TempData["StatusMessage"] = "Update failed: Please check the errors below.";
                TempData["StatusType"] = "error";
                return View(updatedUser); 
            }

            var existingWithSameName = await _userCollection.Find(u => 
                u.username.ToLower() == updatedUser.username.ToLower() && 
                u.user_id != updatedUser.user_id).FirstOrDefaultAsync();

            if (existingWithSameName != null)
            {
                ModelState.AddModelError("username", "This username is already taken.");
                return View(updatedUser);
            }

            var existingUser = await _userCollection.Find(u => u.user_id == updatedUser.user_id).FirstOrDefaultAsync();
            if (existingUser == null) return NotFound();

            // --- NEW CLOUDINARY IMAGE HANDLING ---
            if (updatedUser.ProfileImageUpload != null && updatedUser.ProfileImageUpload.Length > 0)
            {
                try 
                {
                    // 1. Send the file to Cloudinary and get the URL back
                    // Note: Use your existing service method. If it's named specifically for events, 
                    // you might want to rename it to UploadImageAsync later.
                    string uploadedUrl = await _imageUploadService.UploadEventImageAsync(updatedUser.ProfileImageUpload, HttpContext.RequestAborted);
                    
                    // 2. Save the FULL URL string to your database
                    updatedUser.profile_img_path = uploadedUrl;
                }
                catch (Exception)
                {
                    TempData["StatusMessage"] = "Image upload failed.";
                    return View(updatedUser);
                }
            }
            else
            {
                // 3. Keep the old image URL if no new one was uploaded
                updatedUser.profile_img_path = existingUser.profile_img_path;
            }
            
            // --- Tag Handling ---
            if (updatedUser.user_tag != null)
            {
                updatedUser.user_tag = updatedUser.user_tag
                    .Select(t => t.Trim().ToUpper())
                    .Distinct()
                    .ToList();
            }

            // --- Final Save & Notification ---
            updatedUser.user_id = existingUser.user_id;
            updatedUser.event_id = existingUser.event_id;
            updatedUser.password_hash = existingUser.password_hash;

            try 
            {
                var filter = Builders<UserViewModel>.Filter.Eq(u => u.user_id, updatedUser.user_id);
                await _userCollection.ReplaceOneAsync(filter, updatedUser);

                TempData["StatusMessage"] = "Profile updated successfully!";
                TempData["StatusType"] = "success";
            }
            catch (Exception)
            {
                TempData["StatusMessage"] = "Something went wrong. Please try again.";
                TempData["StatusType"] = "error";
            }

            return RedirectToAction("EditProfile");
        }
    }
}