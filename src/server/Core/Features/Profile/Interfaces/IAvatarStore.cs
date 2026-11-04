namespace Core.Features.Profile.Interfaces;

/// <summary>User profile photos (Azure Blob Storage in Infrastructure).</summary>
public interface IAvatarStore
{
    /// <summary>Downloads the image at <paramref name="url"/> and stores it for the user. Returns the blob path; throws on failure.</summary>
    Task<string> CopyFromUrlAsync(Guid userId, string url, CancellationToken cancellationToken = default);

    /// <summary>Null when the blob doesn't exist.</summary>
    Task<(byte[] Content, string ContentType)?> ReadAsync(string path, CancellationToken cancellationToken = default);
}
