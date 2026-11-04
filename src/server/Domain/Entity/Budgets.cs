using Domain.Common;

namespace Domain.Entity;

public class Budgets : BaseEntity
{
    public Guid UserId { get; set; }
    public Users User { get; set; } = null!;
    public Guid CategoryId { get; set; }
    public Categories Category { get; set; } = null!;
    public decimal Amount { get; set; }
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
}
