using Core.Common.Dashboard;
using Core.Features.Transactions.Dto;
using Core.Features.Transactions.Requests;
using Core.Interfaces.Repository;
using TransactionEntity = Domain.Entity.Transactions;

namespace Core.Features.Transactions.Interfaces;

public interface ITransactionRepository : IRepository<TransactionEntity>
{
    Task<PageResult<TransactionDto>> SearchAsync(Guid userId, PageRequest<TransactionFilterRequest> request, CancellationToken cancellationToken = default);
    Task<TransactionDto?> GetDtoAsync(Guid userId, Guid id, CancellationToken cancellationToken = default);
    /// <summary>Income and expense totals in an inclusive date range, after column filters; transfers excluded.</summary>
    Task<(decimal Income, decimal Expenses)> SumAsync(Guid userId, DateOnly from, DateOnly to, IEnumerable<PageFilter>? filters, CancellationToken cancellationToken = default);
}
