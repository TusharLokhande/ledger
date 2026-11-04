using Core.Features.Auth.Dto;

namespace Core.Features.Auth.Interfaces;

/// <summary>Google OAuth authorization-code + PKCE flow (Infrastructure talks to Google).</summary>
public interface IGoogleAuthClient
{
    /// <summary>Google authorize URL plus the state and PKCE verifier the caller must keep until the callback.</summary>
    (string Url, string State, string CodeVerifier) CreateAuthorizationRequest();

    /// <summary>Exchanges the code and validates the id_token. Null on any failure, including an unverified email.</summary>
    Task<GoogleIdentity?> ExchangeCodeAsync(string code, string codeVerifier, CancellationToken cancellationToken = default);
}
