using Domain.Enums;

namespace Core.Features.Transactions.Requests;

public class SaveTransactionRequest
{
    public DateOnly TransactionDate { get; set; }
    public TransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }
    public Guid AccountId { get; set; }
    public Guid? ToAccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public string? Note { get; set; }
}
