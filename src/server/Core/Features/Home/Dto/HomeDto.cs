using Core.Features.Reports.Dto;
using Core.Features.Transactions.Dto;

namespace Core.Features.Home.Dto;

/// <summary>One day of the month's spending pace: cumulative <c>Spent</c> (null after today) and the average cumulative <c>Usual</c> (null without history).</summary>
public record HomePaceDayDto(int Day, decimal? Spent, decimal? Usual);

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
    List<ReportCategoryDto> Categories,
    List<ReportMonthDto> Months,
    List<HomePaceDayDto> Pace,
    List<TransactionDto> Recent);
