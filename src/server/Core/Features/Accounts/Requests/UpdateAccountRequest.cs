using Domain.Enums;

namespace Core.Features.Accounts.Requests;

public class UpdateAccountRequest
{
    public string Name { get; set; } = string.Empty;
    public AccountType AccountType { get; set; }
    public string? Institution { get; set; }
    public decimal? OpeningBalance { get; set; }
}
