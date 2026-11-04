using Core.Features.Home.Interfaces;
using Core.Features.Transactions.Dto;
using Domain.Entity;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Repository;

public class HomeRepository : Repository<Transactions>, IHomeRepository
{
    public HomeRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<(decimal Amount, int Accounts)> InvestedAsync(Guid userId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        var rows = await _dbSet.AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= from && t.TransactionDate <= to
                        && t.TransactionType == TransactionType.Transfer
                        && t.DestinationAccount!.AccountType == AccountType.Investment
                        && t.Account.AccountType != AccountType.Investment)
            .Select(t => new { t.Amount, t.DestinationAccountId })
            .ToListAsync(cancellationToken);
        return (rows.Sum(r => r.Amount), rows.Select(r => r.DestinationAccountId).Distinct().Count());
    }

    public Task<List<TransactionDto>> RecentAsync(Guid userId, DateOnly from, DateOnly to, int take, CancellationToken cancellationToken = default)
        => _dbSet.AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= from && t.TransactionDate <= to)
            .OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.CreatedAtUtc)
            .Take(take)
            .Select(TransactionRepository.ToDto)
            .ToListAsync(cancellationToken);
}
