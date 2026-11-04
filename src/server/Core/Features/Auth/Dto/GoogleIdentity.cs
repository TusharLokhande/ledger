namespace Core.Features.Auth.Dto;

public record GoogleIdentity(string Subject, string Email, string? Name, string? PictureUrl);
