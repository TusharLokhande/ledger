using Domain.Enums;

namespace Core.Features.Accounts.Dto;

public record AccountOptionDto(Guid Id, string Name, AccountType AccountType);
