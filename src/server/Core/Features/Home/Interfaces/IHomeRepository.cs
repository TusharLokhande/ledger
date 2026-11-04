using Core.Features.Transactions.Dto;

namespace Core.Features.Home.Interfaces;

public interface IHomeRepository
{
    /// <summary>Transfers from a non-investment account into an investment account in an inclusive range: total and distinct destination accounts.</summary>
    Task<(decimal Amount, int Accounts)> InvestedAsync(Guid userId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    Task<List<TransactionDto>> RecentAsync(Guid userId, DateOnly from, DateOnly to, int take, CancellationToken cancellationToken = default);
}
