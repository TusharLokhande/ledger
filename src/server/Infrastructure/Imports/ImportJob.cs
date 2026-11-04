using System.Drawing;
using System.Globalization;
using Core.Features.Imports.Interfaces;
using Core.Features.Imports.Services;
using Core.Features.Transactions.Requests;
using Core.Features.Transactions.Services;
using Domain.Entity;
using Domain.Enums;
using Hangfire;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OfficeOpenXml;
using OfficeOpenXml.Style;

namespace Infrastructure.Imports;

/// <summary>
/// Validates an uploaded template and inserts all its rows, or none: any row error produces the uploaded
/// workbook back with failing rows marked red and an Errors column.
/// </summary>
public class ImportJob
{
    private const int ErrorsColumn = 8;
    private static readonly string[] TextDateFormats = ["yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy", "d/M/yyyy", "d-M-yyyy"];
    private static readonly Color RowFill = Color.FromArgb(248, 215, 218);
    private static readonly Color CellBorder = Color.FromArgb(153, 27, 27);

    /// <summary>Request field -> template column (1-based), for marking bad cells.</summary>
    private static readonly Dictionary<string, int> FieldColumns = new()
    {
        ["transactionDate"] = 1, ["transactionType"] = 2, ["amount"] = 3,
        ["accountId"] = 4, ["toAccountId"] = 5, ["categoryId"] = 6, ["note"] = 7,
    };

    private readonly AppDbContext _db;
    private readonly IFileStore _files;
    private readonly TransactionRules _rules;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<ImportJob> _logger;

    public ImportJob(AppDbContext db, IFileStore files, TransactionRules rules, TimeProvider timeProvider, ILogger<ImportJob> logger)
    {
        _db = db;
        _files = files;
        _rules = rules;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    // State lives on the batch; a retry could double-run, and the owner re-uploads instead.
    [AutomaticRetry(Attempts = 0)]
    public async Task RunAsync(Guid batchId, Guid userId, CancellationToken cancellationToken)
    {
        var batch = await _db.ImportBatches.FirstOrDefaultAsync(b => b.Id == batchId && b.UserId == userId, cancellationToken);
        // Hangfire can re-run a job that already committed (e.g. the server died before it recorded success).
        if (batch is null || batch.Status is ImportStatus.Succeeded or ImportStatus.Failed) return;

        try
        {
            batch.Status = ImportStatus.Processing;
            await _db.SaveChangesAsync(cancellationToken);
            await ProcessAsync(batch, userId, cancellationToken);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Import {BatchId} failed", batchId);
            // Not the job's token: on shutdown it's already cancelled, and the batch must still leave "Processing".
            _db.ChangeTracker.Clear();
            batch = await _db.ImportBatches.FirstAsync(b => b.Id == batchId, CancellationToken.None);
            Finish(batch, ImportStatus.Failed, "Import failed unexpectedly. Try again.");
            await _db.SaveChangesAsync(CancellationToken.None);
        }
    }

    private async Task ProcessAsync(ImportBatches batch, Guid userId, CancellationToken cancellationToken)
    {
        var source = await _files.ReadAsync(batch.SourceBlobName, cancellationToken)
            ?? throw new InvalidOperationException($"Source file {batch.SourceBlobName} is missing.");

        using var package = new ExcelPackage();
        ExcelWorksheet? sheet;
        try
        {
            await package.LoadAsync(new MemoryStream(source), cancellationToken);
            sheet = package.Workbook.Worksheets.FirstOrDefault();
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            // Corrupt, password-protected or not really .xlsx.
            sheet = null;
        }
        if (sheet is null || !HasTemplateHeader(sheet))
        {
            Finish(batch, ImportStatus.Failed, "This isn't the Ledger template");
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        var lastRow = sheet.Dimension?.End.Row ?? 1;
        var dataRows = Enumerable.Range(2, Math.Max(0, lastRow - 1)).Where(r => !IsBlankRow(sheet, r)).ToList();
        batch.RowCount = dataRows.Count;
        if (dataRows.Count == 0)
        {
            Finish(batch, ImportStatus.Failed, "The file has no transactions");
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }
        if (dataRows.Count > ImportLimits.MaxRows)
        {
            Finish(batch, ImportStatus.Failed, $"The file has {dataRows.Count} rows; the limit is {ImportLimits.MaxRows}. Split it into smaller files.");
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        var context = await _rules.LoadContextAsync(userId, cancellationToken);
        var accountsByName = context.Accounts.Values.ToDictionary(a => Key(a.Name), a => a.Id);
        var categoriesByName = context.Categories.Values.ToLookup(c => Key(c.Name));

        var requests = new List<SaveTransactionRequest>(dataRows.Count);
        var rowErrors = new Dictionary<int, Dictionary<string, List<string>>>();
        foreach (var row in dataRows)
        {
            var (request, errors) = ReadRow(sheet, row, accountsByName, categoriesByName);
            foreach (var (field, messages) in TransactionRules.Validate(context, request))
            {
                // A name that didn't resolve already explains the problem better than "Choose an account".
                if (errors.ContainsKey(field)) continue;
                errors[field] = [.. messages];
            }

            if (errors.Count > 0) rowErrors[row] = errors;
            else requests.Add(request);
        }

        if (rowErrors.Count > 0)
        {
            MarkErrors(sheet, rowErrors);
            batch.ErrorBlobName = ImportLimits.ErrorBlob(userId, batch.Id);
            await _files.UploadAsync(batch.ErrorBlobName, new MemoryStream(package.GetAsByteArray()), cancellationToken);
            batch.ErrorCount = rowErrors.Count;
            var plural = rowErrors.Count == 1 ? "row has a problem" : "rows have problems";
            Finish(batch, ImportStatus.Failed, $"{rowErrors.Count} {plural}. Nothing was imported.");
            await _db.SaveChangesAsync(cancellationToken);
            return;
        }

        await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
        foreach (var request in requests)
        {
            var transaction = new Transactions { UserId = userId, CreatedBy = userId, ImportBatchId = batch.Id };
            TransactionService.Apply(transaction, request);
            _db.Transactions.Add(transaction);
        }
        batch.ImportedCount = requests.Count;
        Finish(batch, ImportStatus.Succeeded, $"Imported {requests.Count} transactions.");
        await _db.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);
    }

    private static (SaveTransactionRequest Request, Dictionary<string, List<string>> Errors) ReadRow(
        ExcelWorksheet sheet, int row,
        IReadOnlyDictionary<string, Guid> accountsByName, ILookup<string, Categories> categoriesByName)
    {
        var errors = new Dictionary<string, List<string>>();
        void Add(string field, string message) => errors[field] = [message];

        var request = new SaveTransactionRequest { Note = Text(sheet, row, 7) };

        var dateCell = sheet.Cells[row, 1];
        if (ReadDate(dateCell.Value) is { } date) request.TransactionDate = date;
        else if (!string.IsNullOrWhiteSpace(dateCell.Text))
            Add("transactionDate", $"Date '{dateCell.Text.Trim()}' isn't a valid date — use dd-mm-yyyy.");

        var typeText = Text(sheet, row, 2);
        if (typeText is not null && ImportTemplateBuilder.Types.Contains(typeText, StringComparer.OrdinalIgnoreCase))
            request.TransactionType = Enum.Parse<TransactionType>(typeText, ignoreCase: true);
        else Add("transactionType", typeText is null ? "Type is required." : $"Type '{typeText}' must be Expense, Income or Transfer.");

        var amountCell = sheet.Cells[row, 3];
        if (ReadAmount(amountCell.Value) is { } amount) request.Amount = amount;
        else if (!string.IsNullOrWhiteSpace(amountCell.Text))
            Add("amount", $"Amount '{amountCell.Text.Trim()}' isn't a number.");

        if (Text(sheet, row, 4) is { } account)
        {
            if (accountsByName.TryGetValue(Key(account), out var id)) request.AccountId = id;
            else Add("accountId", $"Account '{account}' not found or archived.");
        }

        if (Text(sheet, row, 5) is { } toAccount)
        {
            if (accountsByName.TryGetValue(Key(toAccount), out var id)) request.ToAccountId = id;
            else Add("toAccountId", $"To Account '{toAccount}' not found or archived.");
        }

        if (Text(sheet, row, 6) is { } category)
        {
            var matches = categoriesByName[Key(category)].ToList();
            if (matches.Count == 0)
                Add("categoryId", $"Category '{category}' not found or archived.");
            else
            {
                // The same name can exist as both an Income and an Expense category: the row's type picks one.
                var wanted = request.TransactionType == TransactionType.Income ? CategoryType.Income : CategoryType.Expense;
                request.CategoryId = (matches.FirstOrDefault(c => c.CategoryType == wanted) ?? matches[0]).Id;
            }
        }

        return (request, errors);
    }

    private static DateOnly? ReadDate(object? value) => value switch
    {
        DateTime dt => DateOnly.FromDateTime(dt),
        double serial when serial is > 0 and < 2958466 => DateOnly.FromDateTime(DateTime.FromOADate(serial)),
        string s when DateTime.TryParseExact(s.Trim(), TextDateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)
            => DateOnly.FromDateTime(parsed),
        _ => null,
    };

    private static decimal? ReadAmount(object? value) => value switch
    {
        double d => (decimal)d,
        decimal m => m,
        int i => i,
        string s when decimal.TryParse(s.Replace(",", "").Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) => parsed,
        _ => null,
    };

    private static bool HasTemplateHeader(ExcelWorksheet sheet)
    {
        for (var c = 0; c < ImportLimits.Columns.Length; c++)
            if (!string.Equals(sheet.Cells[1, c + 1].Text.Trim(), ImportLimits.Columns[c], StringComparison.OrdinalIgnoreCase))
                return false;
        return true;
    }

    private static bool IsBlankRow(ExcelWorksheet sheet, int row)
    {
        for (var c = 1; c <= ImportLimits.Columns.Length; c++)
            if (!string.IsNullOrWhiteSpace(sheet.Cells[row, c].Text)) return false;
        return true;
    }

    private static string? Text(ExcelWorksheet sheet, int row, int column)
    {
        var text = sheet.Cells[row, column].Text?.Trim();
        return string.IsNullOrEmpty(text) ? null : text;
    }

    private static string Key(string name) => name.Trim().ToLowerInvariant();

    private static void MarkErrors(ExcelWorksheet sheet, Dictionary<int, Dictionary<string, List<string>>> rowErrors)
    {
        var header = sheet.Cells[1, ErrorsColumn];
        header.Value = "Errors";
        header.Style.Font.Bold = true;
        sheet.Column(ErrorsColumn).Width = 60;

        // A re-uploaded error file may still carry old messages.
        var last = sheet.Dimension?.End.Row ?? 1;
        for (var r = 2; r <= last; r++) sheet.Cells[r, ErrorsColumn].Value = null;

        foreach (var (row, errors) in rowErrors)
        {
            var range = sheet.Cells[row, 1, row, ErrorsColumn];
            range.Style.Fill.PatternType = ExcelFillStyle.Solid;
            range.Style.Fill.BackgroundColor.SetColor(RowFill);

            foreach (var field in errors.Keys)
                if (FieldColumns.TryGetValue(field, out var column))
                    sheet.Cells[row, column].Style.Border.BorderAround(ExcelBorderStyle.Medium, CellBorder);

            sheet.Cells[row, ErrorsColumn].Value = string.Join("; ", errors.Values.SelectMany(m => m));
        }
    }

    private void Finish(ImportBatches batch, ImportStatus status, string message)
    {
        batch.Status = status;
        batch.Message = message;
        batch.CompletedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
        batch.UpdatedAtUtc = batch.CompletedAtUtc;
    }
}
