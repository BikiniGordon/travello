using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace Travello.Services;

public interface IImageUploadService
{
    Task<string?> UploadEventImageAsync(IFormFile? file, CancellationToken cancellationToken = default);
}

public class CloudinaryImageUploadService : IImageUploadService
{
    private readonly Cloudinary? _cloudinary;

    public CloudinaryImageUploadService(IConfiguration configuration)
    {
        var cloudName = configuration["CLOUDINARY_CLOUD_NAME"];
        var apiKey = configuration["CLOUDINARY_API_KEY"];
        var apiSecret = configuration["CLOUDINARY_API_SECRET"];

        if (!string.IsNullOrWhiteSpace(cloudName) &&
            !string.IsNullOrWhiteSpace(apiKey) &&
            !string.IsNullOrWhiteSpace(apiSecret))
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account)
            {
                Api = { Secure = true }
            };
        }
    }

    public async Task<string?> UploadEventImageAsync(IFormFile? file, CancellationToken cancellationToken = default)
    {
        if (_cloudinary is null || file is null || file.Length == 0)
        {
            return null;
        }

        await using var stream = file.OpenReadStream();

        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = "travello/events",
            Overwrite = false,
            UniqueFilename = true,
            UseFilename = false
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams, cancellationToken);

        if (uploadResult.Error is not null || string.IsNullOrWhiteSpace(uploadResult.SecureUrl?.ToString()))
        {
            return null;
        }

        return uploadResult.SecureUrl.ToString();
    }
}
