namespace Core.Features.Auth.Dto;

public record AuthResultDto(string AccessToken, int ExpiresInSeconds, AuthUserDto User);
