using Core.Common;
using Core.Common.Dashboard;
using Core.Features.Accounts.Dto;
using Core.Features.Accounts.Requests;

namespace Core.Features.Accounts.Interfaces;

public interface IAccountService
{
    Task<Result<PageResult<AccountDto>>> SearchAsync(PageRequest<AccountFilterRequest> request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<AccountOptionDto>>> GetOptionsAsync(CancellationToken cancellationToken = default);
    Task<Result<AccountDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<AccountDto>> CreateAsync(CreateAccountRequest request, CancellationToken cancellationToken = default);
    Task<Result<AccountDto>> UpdateAsync(Guid id, UpdateAccountRequest request, CancellationToken cancellationToken = default);
    Task<Result<AccountDto>> SetActiveAsync(Guid id, bool active, CancellationToken cancellationToken = default);
    Task<Result<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
