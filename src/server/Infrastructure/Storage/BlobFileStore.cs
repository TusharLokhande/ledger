using Azure;
using Azure.Storage.Blobs;
using Core.Features.Imports.Interfaces;
using Core.Features.Imports.Services;

namespace Infrastructure.Storage;

public class BlobFileStore : IFileStore
{
    private readonly BlobContainerClient _container;
    private bool _containerReady;

    public BlobFileStore(BlobServiceClient client)
    {
        _container = client.GetBlobContainerClient(ImportLimits.Container);
    }

    public async Task UploadAsync(string name, Stream content, CancellationToken cancellationToken = default)
    {
        if (!_containerReady)
        {
            await _container.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
            _containerReady = true;
        }
        await _container.GetBlobClient(name).UploadAsync(content, overwrite: true, cancellationToken);
    }

    public async Task<byte[]?> ReadAsync(string name, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _container.GetBlobClient(name).DownloadContentAsync(cancellationToken);
            return result.Value.Content.ToArray();
        }
        catch (RequestFailedException e) when (e.Status == 404)
        {
            return null;
        }
    }
}
