using MongoDB.Driver;
using Travello.Models;

namespace Travello.Services;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationDocument>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task MarkAsReadAsync(string notificationId, string userId, CancellationToken cancellationToken = default);
    Task CreateNotificationAsync(NotificationDocument notification, CancellationToken cancellationToken = default);
}

public class NotificationService : INotificationService
{
    private readonly IMongoCollection<NotificationDocument> _notificationsCollection;

    public NotificationService(IMongoCollection<NotificationDocument> notificationsCollection)
    {
        _notificationsCollection = notificationsCollection;
    }

    public async Task<IReadOnlyList<NotificationDocument>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return [];
        }

        var normalizedUserId = userId.Trim();
        var filter = Builders<NotificationDocument>.Filter.Eq("user_id", normalizedUserId);
        var sort = Builders<NotificationDocument>.Sort.Descending(notification => notification.CreatedAt);

        var notifications = await _notificationsCollection
            .Find(filter)
            .Sort(sort)
            .Limit(100)
            .ToListAsync(cancellationToken);

        return notifications;
    }

    public async Task MarkAsReadAsync(string notificationId, string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(notificationId) || string.IsNullOrWhiteSpace(userId))
        {
            return;
        }

        var normalizedUserId = userId.Trim();

        var filter = Builders<NotificationDocument>.Filter.And(
            Builders<NotificationDocument>.Filter.Eq(notification => notification.Id, notificationId),
            Builders<NotificationDocument>.Filter.Eq("user_id", normalizedUserId));

        var update = Builders<NotificationDocument>.Update.Set(notification => notification.Read, true);

        await _notificationsCollection.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);
    }

    public async Task CreateNotificationAsync(NotificationDocument notification, CancellationToken cancellationToken = default)
    {
        await _notificationsCollection.InsertOneAsync(notification, cancellationToken: cancellationToken);
    }

}