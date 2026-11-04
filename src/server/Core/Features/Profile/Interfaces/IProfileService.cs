using Core.Common;
using Core.Features.Auth.Dto;
using Core.Features.Profile.Dto;
using Core.Features.Profile.Requests;

namespace Core.Features.Profile.Interfaces;

public interface IProfileService
{
    Task<Result<AvatarFile>> GetAvatarAsync(CancellationToken cancellationToken = default);
    Task<Result<AuthUserDto>> UpdateCurrencyAsync(UpdateCurrencyRequest request, CancellationToken cancellationToken = default);
}
