using Core.Common.Dashboard;
using Core.Features.Accounts.Requests;
using Core.Interfaces.Repository;
using AccountEntity = Domain.Entity.Accounts;

namespace Core.Features.Accounts.Interfaces;

public interface IAccountRepository : IRepository<AccountEntity>
{
    Task<PageResult<AccountEntity>> SearchAsync(Guid userId, PageRequest<AccountFilterRequest> request, CancellationToken cancellationToken = default);

    /// <summary>Case-insensitive, archived rows included.</summary>
    Task<bool> NameExistsAsync(Guid userId, string name, Guid? excludeId, CancellationToken cancellationToken = default);

    /// <summary>True when any transaction uses the account, on either side of a transfer.</summary>
    Task<bool> IsInUseAsync(Guid id, CancellationToken cancellationToken = default);
}
