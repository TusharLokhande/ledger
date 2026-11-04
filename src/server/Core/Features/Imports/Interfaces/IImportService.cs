using Core.Common;
using Core.Features.Imports.Dto;

namespace Core.Features.Imports.Interfaces;

public interface IImportService
{
    Task<Result<ImportFile>> GetTemplateAsync(CancellationToken cancellationToken = default);
    Task<Result<ImportBatchDto>> UploadAsync(string fileName, long length, Stream content, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<ImportBatchDto>>> ListAsync(CancellationToken cancellationToken = default);
    Task<Result<ImportFile>> GetErrorFileAsync(Guid id, CancellationToken cancellationToken = default);
}
