using Core.Common;
using Core.Common.Dashboard;
using Core.Features.Categories.Dto;
using Core.Features.Categories.Requests;

namespace Core.Features.Categories.Interfaces;

public interface ICategoryService
{
    Task<Result<PageResult<CategoryDto>>> SearchAsync(PageRequest<CategoryFilterRequest> request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<CategoryOptionDto>>> GetOptionsAsync(CancellationToken cancellationToken = default);
    Task<Result<CategoryDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<CategoryDto>> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken = default);
    Task<Result<CategoryDto>> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken = default);
    Task<Result<CategoryDto>> SetActiveAsync(Guid id, bool active, CancellationToken cancellationToken = default);
    Task<Result<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
