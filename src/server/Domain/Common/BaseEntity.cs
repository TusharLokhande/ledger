namespace Domain.Common;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public bool Active { get; set; } = true;
    public Guid? CreatedBy { get; set; } = null;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedBy { get; set; } = null;
    public DateTime? UpdatedAtUtc { get; set; }
}
