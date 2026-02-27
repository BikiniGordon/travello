using Microsoft.AspNetCore.Mvc;
using Travello.Models;

namespace Travello.Controllers
{
    public class EventController : Controller
    {
        public IActionResult Detail(int id)
        {
            //mock NO database yet
            var model = new EventDetailViewModel
            {
                EventId = id,
                EventTitle = "ปีนเขาชิวรับแสงอาทิตย์หน้าหนาว",
                Category = "ADVENTURE",
                HostName = "Dearja",
                HostProfileImage = "Ellipse 12.png",
                CoverImage = "cover.png",
                Detail = "Lorem ipsum dolor sit amet...",
                TripRules = "Lorem ipsum dolor sit amet...",
                ClosingDate = new DateTime(2026, 3, 20),
                StartDate = new DateTime(2026, 3, 20),
                EndDate = new DateTime(2026, 3, 26),
                Location = "Everest mountain",
                RemainingSlots = 10,
                AttendeeCount = 21,
                UserStatus = "approved", // none | pending | owner 
                TotalExpenses = 4280,

                PackingList = new List<string> { "คนรู้ใจ", "เสื้อกันหนาว", "รองเท้า" },

                Days = new List<DayViewModel>
                {
                    new DayViewModel
                    {
                        DayNumber = 1,
                        Places = new List<PlaceViewModel>
                        {
                            new PlaceViewModel
                            {
                                Name = "สวนลุม",
                                Description = "เจอกันเวลา 9 โมงเช้า",
                                Expenses = new List<ExpenseViewModel>
                                {
                                    new ExpenseViewModel { Name = "ค่าเดินทาง", Amount = 20 }
                                }
                            },
                            new PlaceViewModel
                            {
                                Name = "วัดอรุณ",
                                Description = "สวดมนต์เอาฤกษ์เอาชัย"
                            }
                        }
                    }
                },

                Attendees = new List<AttendeeViewModel>
                {
                    new AttendeeViewModel { Id=1, Name="Dearja", ProfileImage="pic.png", IsApproved=true },
                    new AttendeeViewModel { Id=2, Name="Tom",    ProfileImage="pic.png", IsApproved=true },
                    new AttendeeViewModel { Id=3, Name="Robin",  ProfileImage="pic.png", IsApproved=true },
                    new AttendeeViewModel { Id=4, Name="Sam",    ProfileImage="pic.png", IsApproved=false },
                },

                JoinQuestions = new List<JoinQuestionViewModel>
                {
                    new JoinQuestionViewModel { Id=1, QuestionText="ทำไมถึงอยากร่วมทริป?" }
                },

                Additions = new List<AdditionViewModel>
                {
                    new AdditionViewModel
                    {
                        Question = "What will we eat the morning of the trip?",
                        Answer = "Ramen"
                    }
                }
            };

            return View(model);
        }

        public JsonResult GetAttendees(int id)
        {
            var attendees = new[]
            {
                new { Id=1, Name="Dearja", ProfileImage="/images/pic.png", IsApproved=true  },
                new { Id=2, Name="Tom",    ProfileImage="/images/pic.png", IsApproved=true  },
                new { Id=3, Name="Robin",  ProfileImage="/images/pic.png", IsApproved=true  },
                new { Id=4, Name="Sam",    ProfileImage="/images/pic.png", IsApproved=false },
            };

            bool isOwner = false; // true

            return Json(new { isOwner, attendees });
        }
    }
}