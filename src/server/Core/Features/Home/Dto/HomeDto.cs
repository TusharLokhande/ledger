using Core.Features.Reports.Dto;
using Core.Features.Transactions.Dto;

namespace Core.Features.Home.Dto;

/// <summary>One day of the month's spending pace: cumulative <c>Spent</c> (null after today) and the average cumulative <c>Usual</c> (null without history).</summary>
public record HomePaceDayDto(int Day, decimal? Spent, decimal? Usual);

/// <summary>Emergency fund: net <c>Saved</c> through the month's end; money <c>Added</c> and <c>Used</c> within the month.</summary>
public record HomeEmergencyFundDto(decimal Saved, decimal Added, decimal Used);

/// <summary>Income and expense totals for one day (transfers excluded).</summary>
public record HomeCalendarDayDto(DateOnly Date, decimal Income, decimal Expense);

public record HomeDto(
    DateOnly From,
    DateOnly To,
    int UsualWindows,
    decimal Income,
    decimal Expenses,
    decimal? UsualIncome,
    decimal? UsualExpenses,
    decimal Invested,
    int InvestedAccounts,
    HomeEmergencyFundDto? EmergencyFund,
    List<ReportCategoryDto> Categories,
    List<ReportMonthDto> Months,
    List<HomePaceDayDto> Pace,
    List<TransactionDto> Recent);
