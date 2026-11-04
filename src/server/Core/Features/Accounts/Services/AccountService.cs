using Core.Common;
using Core.Common.Dashboard;
using Core.Common.Interfaces;
using Core.Features.Accounts.Dto;
using Core.Features.Accounts.Interfaces;
using Core.Features.Accounts.Requests;
using Core.Interfaces.UnitOfWork;
using Mapster;
using AccountEntity = Domain.Entity.Accounts;

namespace Core.Features.Accounts.Services;

public class AccountService : IAccountService
{
    private const string DuplicateName = "An account with this name already exists.";
    private const string NotFound = "Account not found.";
    private const string InUse = "This account has transactions, so it can't be deleted. Archive it instead.";

    private readonly IAccountRepository _accounts;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly TimeProvider _timeProvider;

    public AccountService(IAccountRepository accounts, IUnitOfWork unitOfWork, ICurrentUserService currentUser, TimeProvider timeProvider)
    {
        _accounts = accounts;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _timeProvider = timeProvider;
    }

    private Guid UserId => _currentUser.UserId!.Value;

    public async Task<Result<PageResult<AccountDto>>> SearchAsync(PageRequest<AccountFilterRequest> request, CancellationToken cancellationToken = default)
    {
        var page = await _accounts.SearchAsync(UserId, request, cancellationToken);
        return Result<PageResult<AccountDto>>.Success(new PageResult<AccountDto>
        {
            Items = page.Items.Adapt<List<AccountDto>>(),
            TotalCount = page.TotalCount,
            Page = page.Page,
            PageSize = page.PageSize,
        });
    }

    public async Task<Result<IReadOnlyList<AccountOptionDto>>> GetOptionsAsync(CancellationToken cancellationToken = default)
    {
        var accounts = await _accounts.FindAsync(a => a.UserId == UserId && a.Active, cancellationToken);
        return Result<IReadOnlyList<AccountOptionDto>>.Success(accounts
            .OrderBy(a => a.Name)
            .Select(a => new AccountOptionDto(a.Id, a.Name, a.AccountType))
            .ToList());
    }

    public async Task<Result<AccountDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var account = await FindOwnedAsync(id, cancellationToken);
        return account is null
            ? Result<AccountDto>.Failure(NotFound, ErrorStatus.NotFound)
            : Result<AccountDto>.Success(account.Adapt<AccountDto>());
    }

    public async Task<Result<AccountDto>> CreateAsync(CreateAccountRequest request, CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        if (await _accounts.NameExistsAsync(UserId, name, null, cancellationToken))
            return Result<AccountDto>.Failure(DuplicateName, ErrorStatus.Duplicate);

        var account = new AccountEntity
        {
            UserId = UserId,
            Name = name,
            AccountType = request.AccountType,
            Institution = NormalizeInstitution(request.Institution),
            CreatedBy = UserId,
        };
        await _accounts.AddAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<AccountDto>.Success(account.Adapt<AccountDto>());
    }

    public async Task<Result<AccountDto>> UpdateAsync(Guid id, UpdateAccountRequest request, CancellationToken cancellationToken = default)
    {
        var account = await FindOwnedAsync(id, cancellationToken);
        if (account is null)
            return Result<AccountDto>.Failure(NotFound, ErrorStatus.NotFound);

        var name = request.Name.Trim();
        if (await _accounts.NameExistsAsync(UserId, name, id, cancellationToken))
            return Result<AccountDto>.Failure(DuplicateName, ErrorStatus.Duplicate);

        account.Name = name;
        account.AccountType = request.AccountType;
        account.Institution = NormalizeInstitution(request.Institution);
        Touch(account);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<AccountDto>.Success(account.Adapt<AccountDto>());
    }

    public async Task<Result<AccountDto>> SetActiveAsync(Guid id, bool active, CancellationToken cancellationToken = default)
    {
        var account = await FindOwnedAsync(id, cancellationToken);
        if (account is null)
            return Result<AccountDto>.Failure(NotFound, ErrorStatus.NotFound);

        account.Active = active;
        Touch(account);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<AccountDto>.Success(account.Adapt<AccountDto>());
    }

    public async Task<Result<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var account = await FindOwnedAsync(id, cancellationToken);
        if (account is null)
            return Result<bool>.Failure(NotFound, ErrorStatus.NotFound);
        if (await _accounts.IsInUseAsync(id, cancellationToken))
            return Result<bool>.Failure(InUse, ErrorStatus.ValidationError);

        _accounts.Remove(account);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    private Task<AccountEntity?> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
        => _accounts.FindOneAsync(a => a.Id == id && a.UserId == UserId, cancellationToken);

    private void Touch(AccountEntity account)
    {
        account.UpdatedBy = UserId;
        account.UpdatedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
    }

    private static string? NormalizeInstitution(string? institution)
        => string.IsNullOrWhiteSpace(institution) ? null : institution.Trim();
}
