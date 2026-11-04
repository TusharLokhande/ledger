using Api.Common;
using Core.Common;
using Core.Features.Auth.Dto;
using Core.Features.Auth.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public class AuthController : ControllerBase
{
    private const string RefreshCookie = "ledger_refresh";
    private const string OAuthCookie = "ledger_oauth";

    private readonly IAuthService _authService;
    private readonly IGoogleAuthClient _google;
    private readonly string _clientBaseUrl;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, IGoogleAuthClient google, IConfiguration configuration, ILogger<AuthController> logger)
    {
        _logger = logger;
        _authService = authService;
        _google = google;
        _clientBaseUrl = configuration["Client:BaseUrl"]?.TrimEnd('/') ?? string.Empty;
    }

    [HttpGet("google")]
    public IActionResult Google()
    {
        var (url, state, verifier) = _google.CreateAuthorizationRequest();
        Response.Cookies.Append(OAuthCookie, $"{state}.{verifier}", OAuthCookieOptions(DateTime.UtcNow.AddMinutes(10)));
        return Redirect(url);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback(string? code, string? state, string? error, CancellationToken cancellationToken)
    {
        var cookie = Request.Cookies[OAuthCookie];
        Response.Cookies.Delete(OAuthCookie, OAuthCookieOptions());

        var parts = cookie?.Split('.', 2);
        if (error is not null || string.IsNullOrEmpty(code) || parts is not [var expectedState, var verifier] || state != expectedState)
            return SignInFailed();

        Result<AuthSessionDto> result;
        try
        {
            result = await _authService.SignInWithGoogleAsync(code, verifier, cancellationToken);
        }
        catch (Exception e)
        {
            // This is a full-page navigation: Google/network/DB failures must land on the login page, not a JSON 500.
            _logger.LogError(e, "Google sign-in callback failed");
            return SignInFailed();
        }
        if (!result.IsSuccess)
            return SignInFailed();

        AppendRefreshCookie(result.Data!);
        return Redirect($"{_clientBaseUrl}/home");
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
        => ToSessionResponse(await _authService.RefreshAsync(Request.Cookies[RefreshCookie], cancellationToken));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(Request.Cookies[RefreshCookie], cancellationToken);
        Response.Cookies.Delete(RefreshCookie, CookieOptions());
        return Result<bool>.Success(true).ToActionResult();
    }

    private IActionResult SignInFailed()
    {
        Response.Cookies.Delete(RefreshCookie, CookieOptions());
        return Redirect($"{_clientBaseUrl}/login?error=google");
    }

    private IActionResult ToSessionResponse(Result<AuthSessionDto> result)
    {
        if (!result.IsSuccess)
        {
            Response.Cookies.Delete(RefreshCookie, CookieOptions());
            return Result<AuthResultDto>.Failure(result.Message, result.ErrorStatus).ToActionResult();
        }

        AppendRefreshCookie(result.Data!);
        return Result<AuthResultDto>.Success(result.Data!.Auth).ToActionResult();
    }

    private void AppendRefreshCookie(AuthSessionDto session)
        => Response.Cookies.Append(RefreshCookie, session.RefreshToken, CookieOptions(session.RefreshTokenExpiresAtUtc));

    private static CookieOptions CookieOptions(DateTime? expiresUtc = null) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/api/auth",
        Expires = expiresUtc,
    };

    // Lax, not Strict: it must come back on the top-level redirect from google.com to the callback.
    private static CookieOptions OAuthCookieOptions(DateTime? expiresUtc = null) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Path = "/api/auth/google",
        Expires = expiresUtc,
    };
}
