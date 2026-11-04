using Domain.Enums;

namespace Core.Features.Categories.Requests;

public class UpdateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public CategoryType CategoryType { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}
