using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;       // Required for Builders and ReplaceOne
using Travello.Models;
using Travello.Services;
using System.Security.Cryptography;
using System.Text;
using System.IO;            // Required for File handling

namespace Travello.Controllers
{
    public class UserController : Controller
    {
        private readonly IMongoCollection<EditProfileViewModel> _userCollection;
        private readonly IWebHostEnvironment _hostEnvironment;
        private readonly IImageUploadService _imageUploadService;

        public UserController(IMongoDatabase database, IWebHostEnvironment hostEnvironment, IImageUploadService imageUploadService)
        {
            _userCollection = database.GetCollection<EditProfileViewModel>("User");
            _hostEnvironment = hostEnvironment;
            _imageUploadService = imageUploadService;
        }

        // 1. This shows the empty form when you go to /User/CreateAccount
        [HttpGet]
        public IActionResult CreateAccount()
        {
            // Initialize the model with a default tag list so the View doesn't crash
            var model = new CreateAccountViewModel {
                user_tag = new List<string>()
            };
            return View(model);
        }

        // 2. This handles the "UPDATE" (Submit) button click
        [HttpPost]
        public async Task<IActionResult> CreateAccount(CreateAccountViewModel newUser, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                TempData["StatusMessage"] = "Create account failed, Check the fields below.";
                TempData["StatusType"] = "error";
                return View(newUser);
            }
            
            try
            {
                // FIX: Get a local reference typed to CreateAccountViewModel
                // This avoids the conversion error and doesn't break EditProfile
                var registrationCollection = _userCollection.Database.GetCollection<CreateAccountViewModel>("User");

                // 1. Duplicate check using the local reference
                var existingUser = await registrationCollection
                    .Find(u => u.username == newUser.username)
                    .FirstOrDefaultAsync(cancellationToken);

                if (existingUser != null)
                {
                    TempData["StatusMessage"] = "This username is already taken.";
                    TempData["StatusType"] = "error";

                    ModelState.AddModelError("username", "This username is already taken.");
                    return View(newUser);
                }

                // 2. NATIVE HASHING (No libraries)
                using (SHA256 sha256Hash = SHA256.Create())
                {
                    byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(newUser.password));
                    StringBuilder builder = new StringBuilder();
                    for (int i = 0; i < bytes.Length; i++)
                    {
                        builder.Append(bytes[i].ToString("x2"));
                    }
                    newUser.password = builder.ToString();
                }

                // 3. Image Upload logic stays the same... 
                if (newUser.ProfileImageUpload != null && newUser.ProfileImageUpload.Length > 0)
                {
                    newUser.profile_img_path = await _imageUploadService.UploadProfileImageAsync(newUser.ProfileImageUpload, cancellationToken);
                }

                // 4. Save to MongoDB using the local reference
                await registrationCollection.InsertOneAsync(newUser, null, cancellationToken);

                TempData["StatusMessage"] = "Account created successfully!";
                TempData["StatusType"] = "success";

                ModelState.Clear();

                var emptyModel = new CreateAccountViewModel {
                    user_tag = new List<string>()  
                };

                return View("CreateAccount", emptyModel);
            }
            catch (Exception)
            {
                ModelState.AddModelError("", "Something went wrong.");
                return View(newUser);
            }
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
        public async Task<IActionResult> EditProfile(EditProfileViewModel updatedUser)
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
                    
                    string uploadedUrl = await _imageUploadService.UploadProfileImageAsync(updatedUser.ProfileImageUpload, HttpContext.RequestAborted);
                    
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

            try 
            {
                var filter = Builders<EditProfileViewModel>.Filter.Eq(u => u.user_id, updatedUser.user_id);
                await _userCollection.ReplaceOneAsync(filter, updatedUser);
                
                HttpContext.Session.SetString("UserProfilePic", updatedUser.profile_img_path);
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

        [HttpPost]
        public async Task<IActionResult> Login(string username, string password)
        {
            try
            {
                // 1. Get the collection using the model that INCLUDES the password
                var fullUserCollection = _userCollection.Database.GetCollection<CreateAccountViewModel>("User");

                // 2. Fetch only the fields needed for login (Projection)
                var user = await fullUserCollection.Find(u => u.username == username)
                    .Project(u => new { u.username, u.password, u.user_id, u.profile_img_path })
                    .FirstOrDefaultAsync();

                if (user != null)
                {
                    // 3. Hash the input password to compare with DB
                    string hashedInputPassword;
                    using (SHA256 sha256Hash = SHA256.Create())
                    {
                        byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(password));
                        StringBuilder builder = new StringBuilder();
                        foreach (var b in bytes) builder.Append(b.ToString("x2"));
                        hashedInputPassword = builder.ToString();
                    }

                    // 4. Compare
                    if (user.password == hashedInputPassword)
                    {
                        HttpContext.Session.SetString("Username", user.username);
                        if (!string.IsNullOrEmpty(user.user_id))
                            HttpContext.Session.SetString("UserId", user.user_id);
                            var imgPath = !string.IsNullOrEmpty(user.profile_img_path) ? user.profile_img_path : "";
                            HttpContext.Session.SetString("UserProfilePic", imgPath);
                        
                        return Json(new { success = true });
                    }
                }

                return Json(new { success = false, message = "Invalid username or password." });
            }
            catch (Exception)
            {
                return Json(new { success = false, message = "An error occurred." });
            }
        }

        public IActionResult Logout()
        {
            HttpContext.Session.Clear(); // Removes everything from session
            return RedirectToAction("Index", "Home");
        }
    }
}