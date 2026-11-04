using Core.Common;
using Core.Common.Dashboard;
using Core.Features.Transactions.Dto;
using Core.Features.Transactions.Requests;

namespace Core.Features.Transactions.Interfaces;

public interface ITransactionService
{
    Task<Result<PageResult<TransactionDto>>> SearchAsync(PageRequest<TransactionFilterRequest> request, CancellationToken cancellationToken = default);
    Task<Result<TransactionSummaryDto>> SummaryAsync(TransactionSummaryRequest request, CancellationToken cancellationToken = default);
    Task<Result<TransactionDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<TransactionDto>> CreateAsync(SaveTransactionRequest request, CancellationToken cancellationToken = default);
    Task<Result<TransactionDto>> UpdateAsync(Guid id, SaveTransactionRequest request, CancellationToken cancellationToken = default);
    Task<Result<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
