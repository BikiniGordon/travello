using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using Travello.Models;

namespace Travello.Controllers
{
    public class EditProfileController : Controller
    {
        public IActionResult EditProfile()
        {
            return View();
        }
    }
}
