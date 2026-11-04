using Core.Common;
using Core.Common.Interfaces;
using Core.Features.Imports.Dto;
using Core.Features.Imports.Interfaces;
using Core.Features.Transactions.Services;
using Core.Interfaces.Repository;
using Core.Interfaces.UnitOfWork;
using Domain.Entity;
using Domain.Enums;

namespace Core.Features.Imports.Services;

public class ImportService : IImportService
{
    private readonly IRepository<ImportBatches> _batches;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IFileStore _files;
    private readonly IImportJobQueue _queue;
    private readonly IImportTemplateBuilder _templateBuilder;
    private readonly TransactionRules _rules;

    public ImportService(IRepository<ImportBatches> batches, IUnitOfWork unitOfWork, ICurrentUserService currentUser,
        IFileStore files, IImportJobQueue queue, IImportTemplateBuilder templateBuilder, TransactionRules rules)
    {
        _batches = batches;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _files = files;
        _queue = queue;
        _templateBuilder = templateBuilder;
        _rules = rules;
    }

    private Guid UserId => _currentUser.UserId!.Value;

    public async Task<Result<ImportFile>> GetTemplateAsync(CancellationToken cancellationToken = default)
    {
        var context = await _rules.LoadContextAsync(UserId, cancellationToken);
        var accounts = context.Accounts.Values.Select(a => a.Name).Order().ToList();
        var categories = context.Categories.Values.Select(c => c.Name).Distinct(StringComparer.OrdinalIgnoreCase).Order().ToList();
        return Result<ImportFile>.Success(new ImportFile(_templateBuilder.Build(accounts, categories), "ledger-import-template.xlsx"));
    }

    public async Task<Result<ImportBatchDto>> UploadAsync(string fileName, long length, Stream content, CancellationToken cancellationToken = default)
    {
        if (!fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            return Result<ImportBatchDto>.ValidationFailure(new() { ["file"] = ["Upload the .xlsx template."] });
        if (length == 0 || length > ImportLimits.MaxFileBytes)
            return Result<ImportBatchDto>.ValidationFailure(new() { ["file"] = ["The file must be between 1 byte and 5 MB."] });

        var batch = new ImportBatches
        {
            UserId = UserId,
            CreatedBy = UserId,
            FileName = Path.GetFileName(fileName),
            Status = ImportStatus.Queued,
        };
        batch.SourceBlobName = ImportLimits.SourceBlob(UserId, batch.Id);

        // File first: a batch row must never point at a file that wasn't stored.
        await _files.UploadAsync(batch.SourceBlobName, content, cancellationToken);
        await _batches.AddAsync(batch, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        try
        {
            _queue.Enqueue(batch.Id, UserId);
        }
        catch
        {
            // Otherwise the batch would sit in "Queued" for ever.
            batch.Status = ImportStatus.Failed;
            batch.Message = "Couldn't start the import. Try again.";
            await _unitOfWork.SaveChangesAsync(CancellationToken.None);
            throw;
        }

        return Result<ImportBatchDto>.Success(ToDto(batch));
    }

    public async Task<Result<IReadOnlyList<ImportBatchDto>>> ListAsync(CancellationToken cancellationToken = default)
    {
        var batches = await _batches.FindAsync(b => b.UserId == UserId, cancellationToken);
        return Result<IReadOnlyList<ImportBatchDto>>.Success(batches
            .OrderByDescending(b => b.CreatedAtUtc)
            .Take(ImportLimits.HistorySize)
            .Select(ToDto)
            .ToList());
    }

    public async Task<Result<ImportFile>> GetErrorFileAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var batch = await _batches.FindOneAsync(b => b.Id == id && b.UserId == UserId, cancellationToken);
        if (batch?.ErrorBlobName is null)
            return Result<ImportFile>.Failure("No error file for this import.", ErrorStatus.NotFound);

        var bytes = await _files.ReadAsync(batch.ErrorBlobName, cancellationToken);
        if (bytes is null)
            return Result<ImportFile>.Failure("The error file is no longer available.", ErrorStatus.NotFound);

        var name = Path.GetFileNameWithoutExtension(batch.FileName) + "-errors.xlsx";
        return Result<ImportFile>.Success(new ImportFile(bytes, name));
    }

    private static ImportBatchDto ToDto(ImportBatches b) => new()
    {
        Id = b.Id,
        FileName = b.FileName,
        Status = b.Status,
        RowCount = b.RowCount,
        ImportedCount = b.ImportedCount,
        ErrorCount = b.ErrorCount,
        Message = b.Message,
        CreatedAtUtc = b.CreatedAtUtc,
        CompletedAtUtc = b.CompletedAtUtc,
        HasErrorFile = b.ErrorBlobName is not null,
    };
}
