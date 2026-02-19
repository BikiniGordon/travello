using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using Travello.Models;
using MongoDB.Driver;

namespace Travello.Controllers
{
    public class ChatController : Controller
    {
        public IActionResult Chat()
        {
            var mock_chat = new List<ChatModel>
            {
                new ChatModel
                {
                    event_id = 1,
                    user_id = 1,
                    chat_name = "ปีนเขาชิวรับแสงอาทิตย์หน้าหนาว",
                    last_message_id = 1
                },
                new ChatModel
                {
                    event_id = 2,
                    user_id = 1,
                    chat_name = "ปีนเขาชิวรับแสงอาทิตย์หน้าหนาว",
                    last_message_id = 2
                },
                new ChatModel
                {
                    event_id = 3,
                    user_id = 1,
                    chat_name = "ปีนเขาชิวรับแสงอาทิตย์หน้าหนาว",
                    last_message_id = 3
                },
                new ChatModel
                {
                    event_id = 4,
                    user_id = 1,
                    chat_name = "ปีนเขาชิวรับแสงอาทิตย์หน้าหนาว",
                    last_message_id = 4
                }
            };
            return View(mock_chat);
        }
    }
}