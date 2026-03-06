using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Travello.Models;
using Travello.Services;
using System.Security.Cryptography;
using System.Text;

namespace Travello.Controllers
{
    public class UserController : Controller
    {
        private readonly IMongoCollection<EditProfileViewModel> _userCollection;
        private readonly IImageUploadService _imageUploadService;

        public UserController(IMongoDatabase database, IImageUploadService imageUploadService)
        {
            _userCollection = database.GetCollection<EditProfileViewModel>("User");
            _imageUploadService = imageUploadService;
        }

        [HttpGet]
        public IActionResult CreateAccount()
        {
            var model = new CreateAccountViewModel {
                user_tag = new List<string>()
            };
            return View(model);
        }

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
                var registrationCollection = _userCollection.Database.GetCollection<CreateAccountViewModel>("User");

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

                if (newUser.ProfileImageUpload != null && newUser.ProfileImageUpload.Length > 0)
                {
                    newUser.profile_img_path = await _imageUploadService.UploadProfileImageAsync(newUser.ProfileImageUpload, cancellationToken);
                }

                newUser.event_id = new List<string>();

                await registrationCollection.InsertOneAsync(newUser, null, cancellationToken);

                TempData["StatusMessage"] = "Account created successfully!";
                TempData["StatusType"] = "success";
                return RedirectToAction("CreateAccount");
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
            var loggedInUserId = HttpContext.Session.GetString("UserId");

            if (string.IsNullOrEmpty(loggedInUserId))
            {
                return RedirectToAction("Index", "Home");
            }

            var user = await _userCollection.Find(u => u.user_id == loggedInUserId).FirstOrDefaultAsync();
            
            if (user == null)
            {
                return NotFound("User profile not found in database.");
            }

            return View(user);
        }

        [HttpPost]
        public async Task<IActionResult> EditProfile(EditProfileViewModel updatedUser)
        {

            var loggedInUserId = HttpContext.Session.GetString("UserId");
    
            if (string.IsNullOrEmpty(loggedInUserId) || updatedUser.user_id != loggedInUserId)
            {
                return Unauthorized();
            }
            
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
                updatedUser.profile_img_path = existingUser.profile_img_path;
            }
            
            if (updatedUser.user_tag != null)
            {
                updatedUser.user_tag = updatedUser.user_tag
                    .Select(t => t.Trim().ToUpper())
                    .Distinct()
                    .ToList();
            }

            updatedUser.user_id = existingUser.user_id;
            updatedUser.password = existingUser.password; 
            updatedUser.event_id = existingUser.event_id;

            try 
            {
                var filter = Builders<EditProfileViewModel>.Filter.Eq(u => u.user_id, updatedUser.user_id);
                await _userCollection.ReplaceOneAsync(filter, updatedUser);
                
                HttpContext.Session.SetString("UserProfilePic", updatedUser.profile_img_path ?? "");
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
                var fullUserCollection = _userCollection.Database.GetCollection<CreateAccountViewModel>("User");

                var user = await fullUserCollection.Find(u => u.username == username)
                    .Project(u => new { u.username, u.password, u.user_id, u.profile_img_path })
                    .FirstOrDefaultAsync();

                if (user != null)
                {
                    string hashedInputPassword;
                    using (SHA256 sha256Hash = SHA256.Create())
                    {
                        byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(password));
                        StringBuilder builder = new StringBuilder();
                        foreach (var b in bytes) builder.Append(b.ToString("x2"));
                        hashedInputPassword = builder.ToString();
                    }

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
            HttpContext.Session.Clear();
            return RedirectToAction("Index", "Home");
        }
    }
}