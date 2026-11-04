using Core.Features.Reports.Dto;

namespace Core.Features.Reports.Interfaces;

public interface IReportRepository
{
    Task<DateOnly?> FirstTransactionDateAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Income/expense totals per day and category in an inclusive range; transfers excluded.</summary>
    Task<List<DailyTotal>> DailyTotalsAsync(Guid userId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    /// <summary>Name, icon and color by id, archived categories included.</summary>
    Task<Dictionary<Guid, (string Name, string Icon, string Color)>> CategoriesAsync(Guid userId, IEnumerable<Guid> ids, CancellationToken cancellationToken = default);
    Task<List<ReportTransactionDto>> LargestExpensesAsync(Guid userId, DateOnly from, DateOnly to, int take, CancellationToken cancellationToken = default);
}
