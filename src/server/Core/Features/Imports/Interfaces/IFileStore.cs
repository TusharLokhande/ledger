namespace Core.Features.Imports.Interfaces;

/// <summary>Stores import files (Azure Blob Storage in Infrastructure).</summary>
public interface IFileStore
{
    Task UploadAsync(string name, Stream content, CancellationToken cancellationToken = default);
    /// <summary>Null when the file doesn't exist.</summary>
    Task<byte[]?> ReadAsync(string name, CancellationToken cancellationToken = default);
}
