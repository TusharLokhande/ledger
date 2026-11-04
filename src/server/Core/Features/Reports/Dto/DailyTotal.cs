using Domain.Enums;

namespace Core.Features.Reports.Dto;

/// <summary>Income or expense total for one day and category.</summary>
public record DailyTotal(DateOnly Date, TransactionType Type, Guid? CategoryId, decimal Amount, int Count);
