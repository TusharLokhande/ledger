using Core.Common.Dashboard;
using Core.Features.Categories.Requests;
using Core.Interfaces.Repository;
using CategoryEntity = Domain.Entity.Categories;
using Domain.Enums;

namespace Core.Features.Categories.Interfaces;

public interface ICategoryRepository : IRepository<CategoryEntity>
{
    Task<PageResult<CategoryEntity>> SearchAsync(Guid userId, PageRequest<CategoryFilterRequest> request, CancellationToken cancellationToken = default);

    /// <summary>Case-insensitive, archived rows included.</summary>
    Task<bool> NameExistsAsync(Guid userId, CategoryType type, string name, Guid? excludeId, CancellationToken cancellationToken = default);

    /// <summary>True when any transaction or budget uses the category.</summary>
    Task<bool> IsInUseAsync(Guid id, CancellationToken cancellationToken = default);
}
