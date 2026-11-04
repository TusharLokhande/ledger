using Domain.Enums;

namespace Core.Features.Categories.Dto;

public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public CategoryType CategoryType { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public bool Active { get; set; }
}
