using System.Security.Cryptography;
using System.Text;
using Core.Common;
using Core.Features.Auth.Dto;
using Core.Features.Auth.Interfaces;
using Core.Features.Profile.Interfaces;
using Core.Interfaces.Repository;
using Core.Interfaces.UnitOfWork;
using Domain.Entity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Core.Features.Auth.Services;

public class AuthService : IAuthService
{
    private const string InvalidSession = "Your session has expired. Please sign in again.";

    private readonly IRepository<Users> _users;
    private readonly IRepository<RefreshTokens> _refreshTokens;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITokenService _tokenService;
    private readonly IGoogleAuthClient _google;
    private readonly IAvatarStore _avatars;
    private readonly ILogger<AuthService> _logger;
    private readonly TimeProvider _timeProvider;
    private readonly JwtOptions _jwtOptions;

    public AuthService(
        IRepository<Users> users,
        IRepository<RefreshTokens> refreshTokens,
        IUnitOfWork unitOfWork,
        ITokenService tokenService,
        IGoogleAuthClient google,
        IAvatarStore avatars,
        ILogger<AuthService> logger,
        TimeProvider timeProvider,
        IOptions<JwtOptions> jwtOptions)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _unitOfWork = unitOfWork;
        _tokenService = tokenService;
        _google = google;
        _avatars = avatars;
        _logger = logger;
        _timeProvider = timeProvider;
        _jwtOptions = jwtOptions.Value;
    }

    public async Task<Result<AuthSessionDto>> SignInWithGoogleAsync(string code, string codeVerifier, CancellationToken cancellationToken = default)
    {
        var identity = await _google.ExchangeCodeAsync(code, codeVerifier, cancellationToken);
        if (identity is null)
            return Result<AuthSessionDto>.Failure("Google sign-in failed.", ErrorStatus.UnAuthorized);

        var user = await _users.FindOneAsync(u => u.ExternalUid == identity.Subject, cancellationToken);
        if (user is null)
        {
            user = new Users { ExternalUid = identity.Subject, CurrencyCode = "INR" };
            await _users.AddAsync(user, cancellationToken);
        }
        else if (!user.Active)
        {
            return Result<AuthSessionDto>.Failure("This account is disabled.", ErrorStatus.Forbidden);
        }

        user.Email = NormalizeEmail(identity.Email);
        user.Name = identity.Name?.Trim() is { Length: > 100 } longName ? longName[..100] : identity.Name?.Trim(); // column is 100 chars

        if (identity.PictureUrl is not null)
        {
            // A photo is nice to have; never fail sign-in over it.
            try
            {
                user.AvatarPath = await _avatars.CopyFromUrlAsync(user.Id, identity.PictureUrl, cancellationToken);
            }
            catch (Exception e)
            {
                _logger.LogWarning(e, "Copying the Google profile photo failed for user {UserId}", user.Id);
            }
        }

        user.UpdatedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
        user.UpdatedBy = user.Id;

        var session = await IssueSessionAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<AuthSessionDto>.Success(session);
    }

    public async Task<Result<AuthSessionDto>> RefreshAsync(string? refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(refreshToken))
            return Result<AuthSessionDto>.Failure(InvalidSession, ErrorStatus.UnAuthorized);

        var hash = Hash(refreshToken);
        var stored = await _refreshTokens.FindOneAsync(t => t.TokenHash == hash, cancellationToken);
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        if (stored is null || stored.ExpiresAtUtc <= now)
            return Result<AuthSessionDto>.Failure(InvalidSession, ErrorStatus.UnAuthorized);

        if (stored.RevokedAtUtc is not null)
        {
            // A rotated token came back: treat it as stolen and end every session for this user.
            var active = await _refreshTokens.FindAsync(
                t => t.UserId == stored.UserId && t.RevokedAtUtc == null, cancellationToken);
            foreach (var token in active)
                token.RevokedAtUtc = now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result<AuthSessionDto>.Failure(InvalidSession, ErrorStatus.UnAuthorized);
        }

        var user = await _users.GetByIdAsync(stored.UserId, cancellationToken);
        if (user is null || !user.Active)
            return Result<AuthSessionDto>.Failure(InvalidSession, ErrorStatus.UnAuthorized);

        var (session, newToken) = await IssueSessionWithRowAsync(user, cancellationToken);
        stored.RevokedAtUtc = now;
        stored.ReplacedByTokenId = newToken.Id;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<AuthSessionDto>.Success(session);
    }

    public async Task LogoutAsync(string? refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(refreshToken))
            return;

        var hash = Hash(refreshToken);
        var stored = await _refreshTokens.FindOneAsync(t => t.TokenHash == hash && t.RevokedAtUtc == null, cancellationToken);
        if (stored is null)
            return;

        stored.RevokedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<AuthSessionDto> IssueSessionAsync(Users user, CancellationToken cancellationToken)
        => (await IssueSessionWithRowAsync(user, cancellationToken)).Session;

    private async Task<(AuthSessionDto Session, RefreshTokens Row)> IssueSessionWithRowAsync(Users user, CancellationToken cancellationToken)
    {
        var (accessToken, expiresInSeconds) = _tokenService.CreateAccessToken(user);
        var rawRefreshToken = Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var row = new RefreshTokens
        {
            UserId = user.Id,
            TokenHash = Hash(rawRefreshToken),
            ExpiresAtUtc = _timeProvider.GetUtcNow().UtcDateTime.AddDays(_jwtOptions.RefreshTokenLifetimeDays),
        };
        await _refreshTokens.AddAsync(row, cancellationToken);

        var auth = new AuthResultDto(accessToken, expiresInSeconds, AuthUserDto.From(user));
        return (new AuthSessionDto(auth, rawRefreshToken, row.ExpiresAtUtc), row);
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string Hash(string value)
        => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static string Base64UrlEncode(byte[] bytes)
        => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
