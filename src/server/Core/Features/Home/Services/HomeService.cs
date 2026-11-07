using Core.Common;
using Core.Common.Interfaces;
using Core.Features.Home.Dto;
using Core.Features.Home.Interfaces;
using Core.Features.Home.Requests;
using Core.Features.Reports.Interfaces;
using Core.Features.Reports.Requests;
using Core.Features.Reports.Services;
using Domain.Enums;

namespace Core.Features.Home.Services;

public class HomeService : IHomeService
{
    private const int UsualWindowCount = 6;
    private const int RecentCount = 5;

    private readonly IReportService _reports;
    private readonly IReportRepository _reportRepository;
    private readonly IHomeRepository _home;
    private readonly ICurrentUserService _currentUser;

    public HomeService(IReportService reports, IReportRepository reportRepository, IHomeRepository home, ICurrentUserService currentUser)
    {
        _reports = reports;
        _reportRepository = reportRepository;
        _home = home;
        _currentUser = currentUser;
    }

    private Guid UserId => _currentUser.UserId!.Value;

    public async Task<Result<HomeDto>> GetAsync(HomeRequest request, CancellationToken cancellationToken = default)
    {
        var monthStart = new DateOnly(request.Month.Year, request.Month.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var spentEnd = request.AsOf < monthEnd ? request.AsOf : monthEnd;

        var report = await _reports.GetAsync(
            new ReportRequest { From = monthStart, To = monthEnd, AsOf = spentEnd }, cancellationToken);
        if (!report.IsSuccess)
            return Result<HomeDto>.Failure(report.Message, report.ErrorStatus);

        var started = monthStart <= request.AsOf;
        var first = await _reportRepository.FirstTransactionDateAsync(UserId, cancellationToken);
        var windows = started && first is { } f
            ? ReportWindows.Previous(monthStart, monthEnd, monthEnd, UsualWindowCount).Where(w => w.From >= f).ToList()
            : [];

        var spanFrom = windows.Select(w => w.From).Append(monthStart).Min();
        var expenses = (await _reportRepository.DailyTotalsAsync(UserId, spanFrom, monthEnd, cancellationToken))
            .Where(d => d.Type == TransactionType.Expense)
            .ToList();
        decimal Spend(DateOnly from, DateOnly to) => expenses.Where(d => d.Date >= from && d.Date <= to).Sum(d => d.Amount);

        var days = DateTime.DaysInMonth(monthStart.Year, monthStart.Month);
        var pace = Enumerable.Range(1, days)
            .Select(d =>
            {
                var day = monthStart.AddDays(d - 1);
                decimal? spent = started && day <= spentEnd ? Spend(monthStart, day) : null;
                decimal? usual = windows.Count == 0
                    ? null
                    : Math.Round(windows.Average(w => Spend(w.From, w.From.AddDays(d - 1) < w.To ? w.From.AddDays(d - 1) : w.To)), 4);
                return new HomePaceDayDto(d, spent, usual);
            })
            .ToList();

        var (invested, accounts) = await _home.InvestedAsync(UserId, monthStart, monthEnd, cancellationToken);
        var fund = await _home.EmergencyFundAsync(UserId, monthStart, monthEnd, cancellationToken);
        var recent = await _home.RecentAsync(UserId, monthStart, monthEnd, RecentCount, cancellationToken);

        var r = report.Data!;
        return Result<HomeDto>.Success(new HomeDto(
            r.From, r.To, r.UsualWindows, r.Income, r.Expenses, r.UsualIncome, r.UsualExpenses,
            invested, accounts, fund is { } ef ? new HomeEmergencyFundDto(ef.Saved, ef.Added, ef.Used) : null, r.Categories, r.Months, pace, recent));
    }

    public async Task<Result<List<HomeCalendarDayDto>>> GetCalendarAsync(HomeCalendarRequest request, CancellationToken cancellationToken = default)
    {
        var monthStart = new DateOnly(request.Month.Year, request.Month.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var byDay = (await _reportRepository.DailyTotalsAsync(UserId, monthStart, monthEnd, cancellationToken))
            .ToLookup(d => d.Date);

        var days = Enumerable.Range(0, monthEnd.Day)
            .Select(i =>
            {
                var day = monthStart.AddDays(i);
                var rows = byDay[day];
                return new HomeCalendarDayDto(
                    day,
                    rows.Where(r => r.Type == TransactionType.Income).Sum(r => r.Amount),
                    rows.Where(r => r.Type == TransactionType.Expense).Sum(r => r.Amount));
            })
            .ToList();

        return Result<List<HomeCalendarDayDto>>.Success(days);
    }
}
