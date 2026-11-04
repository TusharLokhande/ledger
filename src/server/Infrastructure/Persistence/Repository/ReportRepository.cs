using Core.Features.Reports.Dto;
using Core.Features.Reports.Interfaces;
using Domain.Entity;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Repository;

public class ReportRepository : Repository<Transactions>, IReportRepository
{
    public ReportRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<DateOnly?> FirstTransactionDateAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbSet.Where(t => t.UserId == userId).MinAsync(t => (DateOnly?)t.TransactionDate, cancellationToken);

    public Task<List<DailyTotal>> DailyTotalsAsync(Guid userId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
        => _dbSet.AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= from && t.TransactionDate <= to
                        && t.TransactionType != TransactionType.Transfer)
            .GroupBy(t => new { t.TransactionDate, t.TransactionType, t.CategoryId })
            .Select(g => new DailyTotal(g.Key.TransactionDate, g.Key.TransactionType, g.Key.CategoryId, g.Sum(t => t.Amount), g.Count()))
            .ToListAsync(cancellationToken);

    public async Task<Dictionary<Guid, (string Name, string Icon, string Color)>> CategoriesAsync(Guid userId, IEnumerable<Guid> ids, CancellationToken cancellationToken = default)
    {
        var list = ids.ToList();
        var rows = await _context.Set<Categories>().AsNoTracking()
            .Where(c => c.UserId == userId && list.Contains(c.Id))
            .Select(c => new { c.Id, c.Name, c.Icon, c.Color })
            .ToListAsync(cancellationToken);
        return rows.ToDictionary(c => c.Id, c => (c.Name, c.Icon, c.Color));
    }

    public Task<List<ReportTransactionDto>> LargestExpensesAsync(Guid userId, DateOnly from, DateOnly to, int take, CancellationToken cancellationToken = default)
        => _dbSet.AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= from && t.TransactionDate <= to
                        && t.TransactionType == TransactionType.Expense)
            .OrderByDescending(t => t.Amount).ThenByDescending(t => t.TransactionDate).ThenBy(t => t.Id)
            .Take(take)
            .Select(t => new ReportTransactionDto(t.Id, t.TransactionDate, t.Amount, t.Category!.Name, t.Category.Icon, t.Category.Color, t.Note))
            .ToListAsync(cancellationToken);
}
