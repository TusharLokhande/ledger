using Core.Common;

namespace Core.Features.Categories.Requests;

public class CategoryFilterRequest
{
    public RecordStatus Status { get; set; } = RecordStatus.Active;
}
