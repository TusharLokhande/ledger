using Core.Common;
using Core.Common.Interfaces;
using Core.Features.Reports.Dto;
using Core.Features.Reports.Interfaces;
using Core.Features.Reports.Requests;
using Domain.Enums;

namespace Core.Features.Reports.Services;

public class ReportService : IReportService
{
    /// <summary>How many earlier windows "usual" averages over.</summary>
    private const int UsualWindowCount = 6;
    private const int BigHitCount = 5;
    private const int TrendMonths = 12;

    private readonly IReportRepository _reports;
    private readonly ICurrentUserService _currentUser;

    public ReportService(IReportRepository reports, ICurrentUserService currentUser)
    {
        _reports = reports;
        _currentUser = currentUser;
    }

    private Guid UserId => _currentUser.UserId!.Value;

    public async Task<Result<ReportDto>> GetAsync(ReportRequest request, CancellationToken cancellationToken = default)
    {
        var from = request.From;
        var end = request.To < request.AsOf || from > request.AsOf ? request.To : request.AsOf;

        // Only windows wholly after the first transaction count, so a short history isn't averaged with
        // empty months. A range wholly in the future has nothing to compare.
        var first = await _reports.FirstTransactionDateAsync(UserId, cancellationToken);
        var windows = first is { } f && from <= request.AsOf
            ? ReportWindows.Previous(from, request.To, end, UsualWindowCount).Where(w => w.From >= f).ToList()
            : [];

        var trendFrom = new DateOnly(request.AsOf.Year, request.AsOf.Month, 1).AddMonths(1 - TrendMonths);
        var trendTo = trendFrom.AddMonths(TrendMonths).AddDays(-1);

        var spanFrom = new[] { from, trendFrom }.Concat(windows.Select(w => w.From)).Min();
        var spanTo = end > trendTo ? end : trendTo;
        var daily = await _reports.DailyTotalsAsync(UserId, spanFrom, spanTo, cancellationToken);

        var current = daily.Where(d => d.Date >= from && d.Date <= end).ToList();
        // Windows never overlap, so each day is counted at most once.
        var baseline = daily.Where(d => windows.Any(w => d.Date >= w.From && d.Date <= w.To)).ToList();
        var n = windows.Count;
        decimal? Usual(decimal total) => n == 0 ? null : Math.Round(total / n, 4);

        var spent = current.Where(d => d.Type == TransactionType.Expense)
            .GroupBy(d => d.CategoryId!.Value)
            .ToDictionary(g => g.Key, g => (Amount: g.Sum(d => d.Amount), Count: g.Sum(d => d.Count)));
        var usual = baseline.Where(d => d.Type == TransactionType.Expense)
            .GroupBy(d => d.CategoryId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(d => d.Amount));
        var ids = spent.Keys.Union(usual.Keys).ToList();
        var info = await _reports.CategoriesAsync(UserId, ids, cancellationToken);

        var categories = ids
            .Select(id =>
            {
                var (name, icon, color) = info[id];
                var s = spent.GetValueOrDefault(id);
                return new ReportCategoryDto(id, name, icon, color, s.Amount, s.Count, Usual(usual.GetValueOrDefault(id)));
            })
            .OrderByDescending(c => c.Spent).ThenByDescending(c => c.Usual)
            .ToList();

        var months = Enumerable.Range(0, TrendMonths)
            .Select(i =>
            {
                var start = trendFrom.AddMonths(i);
                var rows = daily.Where(d => d.Date >= start && d.Date < start.AddMonths(1)).ToList();
                return new ReportMonthDto(start, Sum(rows, TransactionType.Income), Sum(rows, TransactionType.Expense));
            })
            .ToList();

        var bigHits = await _reports.LargestExpensesAsync(UserId, from, end, BigHitCount, cancellationToken);

        return Result<ReportDto>.Success(new ReportDto(
            from, end, n,
            Sum(current, TransactionType.Income), Sum(current, TransactionType.Expense),
            Usual(Sum(baseline, TransactionType.Income)), Usual(Sum(baseline, TransactionType.Expense)),
            categories, bigHits, months));
    }

    private static decimal Sum(IEnumerable<DailyTotal> rows, TransactionType type)
        => rows.Where(d => d.Type == type).Sum(d => d.Amount);
}
