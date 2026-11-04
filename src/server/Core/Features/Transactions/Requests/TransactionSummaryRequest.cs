using Core.Common.Dashboard;

namespace Core.Features.Transactions.Requests;

public class TransactionSummaryRequest
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    /// <summary>The client's local "today", so the comparison window doesn't depend on the server's time zone.</summary>
    public DateOnly AsOf { get; set; }
    public List<PageFilter>? Filters { get; set; }
}
