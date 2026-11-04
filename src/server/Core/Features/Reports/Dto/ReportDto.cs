namespace Core.Features.Reports.Dto;

/// <summary>
/// One expense category in the period. <c>Usual</c> is the average over the comparison windows
/// (null when there are none).
/// </summary>
public record ReportCategoryDto(Guid Id, string Name, string Icon, string Color, decimal Spent, int Count, decimal? Usual);

public record ReportTransactionDto(Guid Id, DateOnly TransactionDate, decimal Amount, string CategoryName, string CategoryIcon, string CategoryColor, string? Note);

/// <summary><c>Month</c> is the first day of the month.</summary>
public record ReportMonthDto(DateOnly Month, decimal Income, decimal Expenses);

/// <summary>
/// <c>From</c>..<c>To</c> is the window actually reported (stops at today). "Usual" figures average
/// <c>UsualWindows</c> earlier like-for-like windows; 0 means there's no history to compare with.
/// </summary>
public record ReportDto(
    DateOnly From,
    DateOnly To,
    int UsualWindows,
    decimal Income,
    decimal Expenses,
    decimal? UsualIncome,
    decimal? UsualExpenses,
    List<ReportCategoryDto> Categories,
    List<ReportTransactionDto> BigHits,
    List<ReportMonthDto> Months);
