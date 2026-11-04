using Domain.Enums;

namespace Core.Features.Imports.Dto;

public class ImportBatchDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public ImportStatus Status { get; set; }
    public int? RowCount { get; set; }
    public int? ImportedCount { get; set; }
    public int? ErrorCount { get; set; }
    public string? Message { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public bool HasErrorFile { get; set; }
}
