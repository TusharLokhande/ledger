namespace Core.Features.Transactions.Requests;

/// <summary>Inclusive date range for the list.</summary>
public class TransactionFilterRequest
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
}
