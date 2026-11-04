using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using Core.Common;
using Core.Features.Auth.Dto;
using Core.Features.Auth.Interfaces;
using Google.Apis.Auth;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Auth;

public class GoogleAuthClient : IGoogleAuthClient
{
    private const string AuthorizeEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";

    private readonly HttpClient _http;
    private readonly GoogleOptions _options;
    private readonly ILogger<GoogleAuthClient> _logger;

    public GoogleAuthClient(HttpClient http, IOptions<GoogleOptions> options, ILogger<GoogleAuthClient> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public (string Url, string State, string CodeVerifier) CreateAuthorizationRequest()
    {
        var state = RandomBase64Url();
        var verifier = RandomBase64Url();
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));

        var url = QueryHelpers.AddQueryString(AuthorizeEndpoint, new Dictionary<string, string?>
        {
            ["client_id"] = _options.ClientId,
            ["redirect_uri"] = _options.RedirectUri,
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["state"] = state,
            ["code_challenge"] = challenge,
            ["code_challenge_method"] = "S256",
            ["prompt"] = "select_account",
        });
        return (url, state, verifier);
    }

    public async Task<GoogleIdentity?> ExchangeCodeAsync(string code, string codeVerifier, CancellationToken cancellationToken = default)
    {
        using var response = await _http.PostAsync(TokenEndpoint, new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["redirect_uri"] = _options.RedirectUri,
            ["grant_type"] = "authorization_code",
            ["code_verifier"] = codeVerifier,
        }), cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Google token exchange failed with {Status}", (int)response.StatusCode);
            return null;
        }

        var tokens = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken);
        if (string.IsNullOrEmpty(tokens?.IdToken))
            return null;

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(tokens.IdToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [_options.ClientId] });
            if (!payload.EmailVerified)
                return null;
            return new GoogleIdentity(payload.Subject, payload.Email, payload.Name, payload.Picture);
        }
        catch (InvalidJwtException e)
        {
            _logger.LogWarning(e, "Google id_token rejected");
            return null;
        }
    }

    private static string RandomBase64Url() => Base64Url(RandomNumberGenerator.GetBytes(32));

    private static string Base64Url(byte[] bytes)
        => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private sealed record TokenResponse([property: JsonPropertyName("id_token")] string? IdToken);
}
