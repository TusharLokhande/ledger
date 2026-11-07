using Domain.Enums;

namespace Core.Features.Transactions.Dto;

public class TransactionDto
{
    public Guid Id { get; set; }
    public DateOnly TransactionDate { get; set; }
    public TransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }
    public Guid AccountId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public Guid? ToAccountId { get; set; }
    public string? ToAccountName { get; set; }
    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? CategoryIcon { get; set; }
    public string? CategoryColor { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
