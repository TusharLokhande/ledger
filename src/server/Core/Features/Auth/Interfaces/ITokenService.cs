using Domain.Entity;

namespace Core.Features.Auth.Interfaces;

public interface ITokenService
{
    /// <summary>Signed JWT access token for the user, and its lifetime in seconds.</summary>
    (string Token, int ExpiresInSeconds) CreateAccessToken(Users user);
}
