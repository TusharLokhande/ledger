using Domain.Common;
using Domain.Enums;

namespace Domain.Entity;

public class Transactions : BaseEntity
{
    public Guid UserId { get; set; }
    public Users User { get; set; } = null!;
    public Guid AccountId { get; set; }
    public Accounts Account { get; set; } = null!;
    /// <summary>Set exactly when TransactionType is Transfer.</summary>
    public Guid? DestinationAccountId { get; set; }
    public Accounts? DestinationAccount { get; set; }
    /// <summary>Null exactly when TransactionType is Transfer.</summary>
    public Guid? CategoryId { get; set; }
    public Categories? Category { get; set; }
    public TransactionType TransactionType { get; set; }
    /// <summary>Always positive; the type gives the direction.</summary>
    public decimal Amount { get; set; }
    public DateOnly TransactionDate { get; set; }
    public string? Note { get; set; }
    public Guid? ImportBatchId { get; set; }
    public ImportBatches? ImportBatch { get; set; }
}
