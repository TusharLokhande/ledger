using Domain.Common;
using Domain.Enums;

namespace Domain.Entity;

public class Accounts : BaseEntity
{
    public Guid UserId { get; set; }
    public Users User { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public AccountType AccountType { get; set; }
    public string? Institution { get; set; }
}
