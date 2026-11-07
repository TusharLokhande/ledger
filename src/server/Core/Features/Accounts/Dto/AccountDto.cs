using Domain.Enums;

namespace Core.Features.Accounts.Dto;

public class AccountDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public AccountType AccountType { get; set; }
    public string? Institution { get; set; }
    public decimal? OpeningBalance { get; set; }
    public bool Active { get; set; }
}
