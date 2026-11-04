using Core.Common;
using Core.Common.Dashboard;
using Core.Common.Interfaces;
using Core.Features.Categories.Dto;
using Core.Features.Categories.Interfaces;
using Core.Features.Categories.Requests;
using Core.Interfaces.UnitOfWork;
using CategoryEntity = Domain.Entity.Categories;
using Mapster;

namespace Core.Features.Categories.Services;

public class CategoryService : ICategoryService
{
    private const string DuplicateName = "A category with this name already exists.";
    private const string NotFound = "Category not found.";
    private const string InUse = "This category is used by transactions or budgets, so it can't be deleted. Archive it instead.";

    private readonly ICategoryRepository _categories;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly TimeProvider _timeProvider;

    public CategoryService(ICategoryRepository categories, IUnitOfWork unitOfWork, ICurrentUserService currentUser, TimeProvider timeProvider)
    {
        _categories = categories;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _timeProvider = timeProvider;
    }

    private Guid UserId => _currentUser.UserId!.Value;

    public async Task<Result<PageResult<CategoryDto>>> SearchAsync(PageRequest<CategoryFilterRequest> request, CancellationToken cancellationToken = default)
    {
        var page = await _categories.SearchAsync(UserId, request, cancellationToken);
        return Result<PageResult<CategoryDto>>.Success(new PageResult<CategoryDto>
        {
            Items = page.Items.Adapt<List<CategoryDto>>(),
            TotalCount = page.TotalCount,
            Page = page.Page,
            PageSize = page.PageSize,
        });
    }

    public async Task<Result<IReadOnlyList<CategoryOptionDto>>> GetOptionsAsync(CancellationToken cancellationToken = default)
    {
        var categories = await _categories.FindAsync(c => c.UserId == UserId && c.Active, cancellationToken);
        return Result<IReadOnlyList<CategoryOptionDto>>.Success(categories
            .OrderBy(c => c.Name)
            .Select(c => new CategoryOptionDto(c.Id, c.Name, c.CategoryType, c.Icon, c.Color))
            .ToList());
    }

    public async Task<Result<CategoryDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var category = await FindOwnedAsync(id, cancellationToken);
        return category is null
            ? Result<CategoryDto>.Failure(NotFound, ErrorStatus.NotFound)
            : Result<CategoryDto>.Success(category.Adapt<CategoryDto>());
    }

    public async Task<Result<CategoryDto>> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        if (await _categories.NameExistsAsync(UserId, request.CategoryType, name, null, cancellationToken))
            return Result<CategoryDto>.Failure(DuplicateName, ErrorStatus.Duplicate);

        var category = new CategoryEntity
        {
            UserId = UserId,
            Name = name,
            CategoryType = request.CategoryType,
            Icon = request.Icon,
            Color = request.Color,
            CreatedBy = UserId,
        };
        await _categories.AddAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<CategoryDto>.Success(category.Adapt<CategoryDto>());
    }

    public async Task<Result<CategoryDto>> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var category = await FindOwnedAsync(id, cancellationToken);
        if (category is null)
            return Result<CategoryDto>.Failure(NotFound, ErrorStatus.NotFound);

        var name = request.Name.Trim();
        if (await _categories.NameExistsAsync(UserId, request.CategoryType, name, id, cancellationToken))
            return Result<CategoryDto>.Failure(DuplicateName, ErrorStatus.Duplicate);

        category.Name = name;
        category.CategoryType = request.CategoryType;
        category.Icon = request.Icon;
        category.Color = request.Color;
        Touch(category);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<CategoryDto>.Success(category.Adapt<CategoryDto>());
    }

    public async Task<Result<CategoryDto>> SetActiveAsync(Guid id, bool active, CancellationToken cancellationToken = default)
    {
        var category = await FindOwnedAsync(id, cancellationToken);
        if (category is null)
            return Result<CategoryDto>.Failure(NotFound, ErrorStatus.NotFound);

        category.Active = active;
        Touch(category);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<CategoryDto>.Success(category.Adapt<CategoryDto>());
    }

    public async Task<Result<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var category = await FindOwnedAsync(id, cancellationToken);
        if (category is null)
            return Result<bool>.Failure(NotFound, ErrorStatus.NotFound);
        if (await _categories.IsInUseAsync(id, cancellationToken))
            return Result<bool>.Failure(InUse, ErrorStatus.ValidationError);

        _categories.Remove(category);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    private Task<CategoryEntity?> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
        => _categories.FindOneAsync(c => c.Id == id && c.UserId == UserId, cancellationToken);

    private void Touch(CategoryEntity category)
    {
        category.UpdatedBy = UserId;
        category.UpdatedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
    }
}
