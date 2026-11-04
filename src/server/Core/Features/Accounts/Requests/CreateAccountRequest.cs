using Domain.Enums;

namespace Core.Features.Accounts.Requests;

public class CreateAccountRequest
{
    public string Name { get; set; } = string.Empty;
    public AccountType AccountType { get; set; }
    public string? Institution { get; set; }
}
