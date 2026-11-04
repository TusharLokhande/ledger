namespace Core.Features.Transactions.Dto;

public record SummaryTotalsDto(decimal Income, decimal Expenses, decimal Net);

public record TransactionSummaryDto(
    decimal Income,
    decimal Expenses,
    decimal Net,
    SummaryTotalsDto? Previous,
    DateOnly? PreviousFrom,
    DateOnly? PreviousTo);
