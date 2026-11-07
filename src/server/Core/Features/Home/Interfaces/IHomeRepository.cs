using Core.Features.Transactions.Dto;

namespace Core.Features.Home.Interfaces;

public interface IHomeRepository
{
    /// <summary>Transfers from a non-investment account into an investment account in an inclusive range: total and distinct destination accounts.</summary>
    Task<(decimal Amount, int Accounts)> InvestedAsync(Guid userId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    /// <summary>Emergency-fund money in/out: <c>Saved</c> is opening balances plus net flow through <paramref name="to"/>; <c>Added</c>/<c>Used</c> are within the range. Null when the user has no emergency-fund account.</summary>
    Task<(decimal Saved, decimal Added, decimal Used)?> EmergencyFundAsync(Guid userId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    Task<List<TransactionDto>> RecentAsync(Guid userId, DateOnly from, DateOnly to, int take, CancellationToken cancellationToken = default);
}
