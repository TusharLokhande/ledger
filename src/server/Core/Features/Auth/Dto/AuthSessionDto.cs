namespace Core.Features.Auth.Dto;

/// <summary>What a sign-in produces. The Api puts RefreshToken in a cookie and returns only Auth.</summary>
public record AuthSessionDto(AuthResultDto Auth, string RefreshToken, DateTime RefreshTokenExpiresAtUtc);
