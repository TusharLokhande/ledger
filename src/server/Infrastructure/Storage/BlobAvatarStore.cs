using System.Text.RegularExpressions;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Core.Features.Profile.Interfaces;

namespace Infrastructure.Storage;

public partial class BlobAvatarStore : IAvatarStore
{
    private readonly HttpClient _http;
    private readonly BlobContainerClient _container;

    public BlobAvatarStore(HttpClient http, BlobServiceClient client)
    {
        _http = http;
        _container = client.GetBlobContainerClient("avatars");
    }

    public async Task<string> CopyFromUrlAsync(Guid userId, string url, CancellationToken cancellationToken = default)
    {
        // Google photo URLs end in a size suffix like "=s96-c"; ask for 256px instead.
        using var response = await _http.GetAsync(SizeSuffix().Replace(url, "=s256-c"), cancellationToken);
        response.EnsureSuccessStatusCode();

        await _container.CreateIfNotExistsAsync(cancellationToken: cancellationToken);

        var path = $"{userId}.jpg";
        await using var content = await response.Content.ReadAsStreamAsync(cancellationToken);
        await _container.GetBlobClient(path).UploadAsync(content, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg" },
        }, cancellationToken);
        return path;
    }

    public async Task<(byte[] Content, string ContentType)?> ReadAsync(string path, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _container.GetBlobClient(path).DownloadContentAsync(cancellationToken);
            return (result.Value.Content.ToArray(), result.Value.Details.ContentType ?? "image/jpeg");
        }
        catch (RequestFailedException e) when (e.Status == 404)
        {
            return null;
        }
    }

    [GeneratedRegex(@"=s\d+-c$")]
    private static partial Regex SizeSuffix();
}
