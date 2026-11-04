using Core.Common;
using Core.Features.Auth.Dto;

namespace Core.Features.Auth.Interfaces;

public interface IAuthService
{
    Task<Result<AuthSessionDto>> SignInWithGoogleAsync(string code, string codeVerifier, CancellationToken cancellationToken = default);
    Task<Result<AuthSessionDto>> RefreshAsync(string? refreshToken, CancellationToken cancellationToken = default);
    Task LogoutAsync(string? refreshToken, CancellationToken cancellationToken = default);
}
