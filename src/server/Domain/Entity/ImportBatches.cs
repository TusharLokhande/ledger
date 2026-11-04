using Domain.Common;
using Domain.Enums;

namespace Domain.Entity;

public class ImportBatches : BaseEntity
{
    public Guid UserId { get; set; }
    public Users User { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public ImportStatus Status { get; set; } = ImportStatus.Queued;
    public string SourceBlobName { get; set; } = string.Empty;
    public string? ErrorBlobName { get; set; }
    public int? RowCount { get; set; }
    public int? ImportedCount { get; set; }
    public int? ErrorCount { get; set; }
    public string? Message { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
}
