using Core.Common;
using Core.Common.Dashboard;
using Core.Common.Interfaces;
using Core.Features.Transactions.Dto;
using Core.Features.Transactions.Interfaces;
using Core.Features.Transactions.Requests;
using Core.Interfaces.UnitOfWork;
using Domain.Enums;
using TransactionEntity = Domain.Entity.Transactions;

namespace Core.Features.Transactions.Services;

public class TransactionService : ITransactionService
{
    private const string NotFound = "Transaction not found.";

    private readonly ITransactionRepository _transactions;
    private readonly TransactionRules _rules;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly TimeProvider _timeProvider;

    public TransactionService(ITransactionRepository transactions, TransactionRules rules, IUnitOfWork unitOfWork,
        ICurrentUserService currentUser, TimeProvider timeProvider)
    {
        _transactions = transactions;
        _rules = rules;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _timeProvider = timeProvider;
    }

    private Guid UserId => _currentUser.UserId!.Value;

    public async Task<Result<PageResult<TransactionDto>>> SearchAsync(PageRequest<TransactionFilterRequest> request, CancellationToken cancellationToken = default)
        => Result<PageResult<TransactionDto>>.Success(await _transactions.SearchAsync(UserId, request, cancellationToken));

    public async Task<Result<TransactionSummaryDto>> SummaryAsync(TransactionSummaryRequest request, CancellationToken cancellationToken = default)
    {
        var (curFrom, curTo, prevFrom, prevTo) = SummaryWindow.Compute(request.From, request.To, request.AsOf);
        var (income, expenses) = await _transactions.SumAsync(UserId, curFrom, curTo, request.Filters, cancellationToken);

        SummaryTotalsDto? previous = null;
        if (prevFrom is { } pf && prevTo is { } pt)
        {
            var (pIncome, pExpenses) = await _transactions.SumAsync(UserId, pf, pt, request.Filters, cancellationToken);
            previous = new SummaryTotalsDto(pIncome, pExpenses, pIncome - pExpenses);
        }

        return Result<TransactionSummaryDto>.Success(
            new TransactionSummaryDto(income, expenses, income - expenses, previous, prevFrom, prevTo));
    }

    public async Task<Result<TransactionDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var dto = await _transactions.GetDtoAsync(UserId, id, cancellationToken);
        return dto is null ? Result<TransactionDto>.Failure(NotFound, ErrorStatus.NotFound) : Result<TransactionDto>.Success(dto);
    }

    public async Task<Result<TransactionDto>> CreateAsync(SaveTransactionRequest request, CancellationToken cancellationToken = default)
    {
        var context = await _rules.LoadContextAsync(UserId, cancellationToken);
        var errors = TransactionRules.Validate(context, request);
        if (errors.Count > 0)
            return Result<TransactionDto>.ValidationFailure(errors);

        var transaction = new TransactionEntity { UserId = UserId, CreatedBy = UserId };
        Apply(transaction, request);
        await _transactions.AddAsync(transaction, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(transaction.Id, cancellationToken);
    }

    public async Task<Result<TransactionDto>> UpdateAsync(Guid id, SaveTransactionRequest request, CancellationToken cancellationToken = default)
    {
        var transaction = await FindOwnedAsync(id, cancellationToken);
        if (transaction is null)
            return Result<TransactionDto>.Failure(NotFound, ErrorStatus.NotFound);

        var context = await _rules.LoadContextAsync(UserId, cancellationToken);
        var errors = TransactionRules.Validate(context, request, transaction);
        if (errors.Count > 0)
            return Result<TransactionDto>.ValidationFailure(errors);

        Apply(transaction, request);
        transaction.UpdatedBy = UserId;
        transaction.UpdatedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<Result<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var transaction = await FindOwnedAsync(id, cancellationToken);
        if (transaction is null)
            return Result<bool>.Failure(NotFound, ErrorStatus.NotFound);

        _transactions.Remove(transaction);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    /// <summary>Copies a validated request onto an entity (also used by the import).</summary>
    public static void Apply(TransactionEntity transaction, SaveTransactionRequest request)
    {
        var isTransfer = request.TransactionType == TransactionType.Transfer;
        transaction.TransactionDate = request.TransactionDate;
        transaction.TransactionType = request.TransactionType;
        transaction.Amount = request.Amount;
        transaction.AccountId = request.AccountId;
        transaction.DestinationAccountId = isTransfer ? request.ToAccountId : null;
        transaction.CategoryId = isTransfer ? null : request.CategoryId;
        transaction.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
    }

    private Task<TransactionEntity?> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
        => _transactions.FindOneAsync(t => t.Id == id && t.UserId == UserId, cancellationToken);
}
