using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Travello.Models;
using Travello.Services;

namespace Travello.Controllers;

public class NotificationController : Controller
{
    private readonly INotificationService _notificationService;

    public NotificationController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> MyNotifications()
    {
        var userId = ResolveCurrentUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Json(Array.Empty<NotificationViewModel>());
        }

        var notifications = await _notificationService.GetByUserIdAsync(userId, HttpContext.RequestAborted);
        var response = notifications.Select(notification => new NotificationViewModel
        {
            Id = notification.Id ?? string.Empty,
            Time = ToRelativeTime(notification.CreatedAt),
            Title = notification.Title,
            Message = notification.Message,
            Reason = notification.Reason,
            Read = notification.Read,
            Status = string.IsNullOrWhiteSpace(notification.Status) ? "default" : notification.Status,
            ImageUrl = ResolveNotificationImageUrl(notification),
            Url = notification.Url ?? string.Empty
        }).ToList();

        return Json(response);
    }

    [HttpPost]
    public async Task<IActionResult> MarkAsRead([FromBody] MarkNotificationAsReadRequest request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.NotificationId))
        {
            return BadRequest();
        }

        var userId = ResolveCurrentUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        await _notificationService.MarkAsReadAsync(request.NotificationId, userId, HttpContext.RequestAborted);
        return Ok();
    }

    private string? ResolveCurrentUserId()
    {
        var sessionUserId = HttpContext.Session.GetString("UserId");
        return string.IsNullOrWhiteSpace(sessionUserId) ? null : sessionUserId.Trim();
    }

    private static string ToRelativeTime(DateTime createdAtUtc)
    {
        var utcCreatedAt = createdAtUtc.Kind == DateTimeKind.Utc
            ? createdAtUtc
            : DateTime.SpecifyKind(createdAtUtc, DateTimeKind.Utc);

        var elapsed = DateTime.UtcNow - utcCreatedAt;
        if (elapsed.TotalMinutes < 1)
        {
            return "Just now";
        }

        if (elapsed.TotalHours < 1)
        {
            return $"{Math.Max(1, (int)Math.Floor(elapsed.TotalMinutes))} minutes ago";
        }

        if (elapsed.TotalDays < 1)
        {
            return $"{Math.Max(1, (int)Math.Floor(elapsed.TotalHours))} hours ago";
        }

        if (elapsed.TotalDays < 7)
        {
            return $"{Math.Max(1, (int)Math.Floor(elapsed.TotalDays))} days ago";
        }

        var weeks = Math.Max(1, (int)Math.Floor(elapsed.TotalDays / 7));
        return $"{weeks} weeks ago";
    }

    private static string ResolveNotificationImageUrl(NotificationDocument notification)
    {
        if (!string.IsNullOrWhiteSpace(notification.ImageUrl))
        {
            return notification.ImageUrl;
        }

        if (!string.IsNullOrWhiteSpace(notification.LegacyImageUrl))
        {
            return notification.LegacyImageUrl;
        }

        return "/images/notification.png";
    }
}

public class MarkNotificationAsReadRequest
{
    public string NotificationId { get; set; } = string.Empty;
}
