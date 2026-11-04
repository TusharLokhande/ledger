namespace Core.Features.Imports.Services;

public static class ImportLimits
{
    public const long MaxFileBytes = 5 * 1024 * 1024;
    public const int MaxRows = 5000;
    public const int HistorySize = 50;
    public const string Container = "imports";

    public static readonly string[] Columns = ["Date", "Type", "Amount", "Account", "To Account", "Category", "Note"];

    public static string SourceBlob(Guid userId, Guid batchId) => $"{userId}/{batchId}/source.xlsx";
    public static string ErrorBlob(Guid userId, Guid batchId) => $"{userId}/{batchId}/errors.xlsx";
}
