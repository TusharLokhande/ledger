using Domain.Entity;

namespace Core.Features.Auth.Dto;

public record AuthUserDto(Guid Id, string Email, string? Name, string CurrencyCode, string? AvatarUrl)
{
    /// <summary>The <c>v</c> query param changes whenever the user is updated, so a new photo is a new client cache key.</summary>
    public static AuthUserDto From(Users user) => new(
        user.Id,
        user.Email,
        user.Name,
        user.CurrencyCode,
        user.AvatarPath is null ? null : $"/profile/avatar?v={(user.UpdatedAtUtc ?? user.CreatedAtUtc).Ticks}");
}
