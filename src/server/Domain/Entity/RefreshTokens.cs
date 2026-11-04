using Domain.Common;

namespace Domain.Entity;

public class RefreshTokens : BaseEntity
{
    public Guid UserId { get; set; }
    public Users User { get; set; } = null!;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public Guid? ReplacedByTokenId { get; set; }
}
