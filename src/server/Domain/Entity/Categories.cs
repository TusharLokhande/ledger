using Domain.Common;
using Domain.Enums;

namespace Domain.Entity;

public class Categories : BaseEntity
{
    public Guid UserId { get; set; }
    public Users User { get; set; } = null!;
    public CategoryType CategoryType { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}
