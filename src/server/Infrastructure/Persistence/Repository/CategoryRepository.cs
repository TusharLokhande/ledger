using System.Linq.Expressions;
using Core.Common;
using Core.Common.Dashboard;
using Core.Features.Categories.Interfaces;
using Core.Features.Categories.Requests;
using Domain.Entity;
using Domain.Enums;
using Infrastructure.Common;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Repository;

public class CategoryRepository : Repository<Categories>, ICategoryRepository
{
    private static readonly Dictionary<string, Expression<Func<Categories, string>>> StringFilters = new()
    {
        ["name"] = c => c.Name,
    };

    private static readonly Dictionary<string, LambdaExpression> EnumFilters = new()
    {
        ["categoryType"] = (Expression<Func<Categories, CategoryType>>)(c => c.CategoryType),
    };

    public CategoryRepository(AppDbContext context) : base(context)
    {
    }

    public Task<PageResult<Categories>> SearchAsync(Guid userId, PageRequest<CategoryFilterRequest> request, CancellationToken cancellationToken = default)
    {
        var query = _dbSet.AsNoTracking().Where(c => c.UserId == userId);

        query = (request.CustomFilter?.Status ?? RecordStatus.Active) switch
        {
            RecordStatus.Archived => query.Where(c => !c.Active),
            RecordStatus.All => query,
            _ => query.Where(c => c.Active),
        };

        query = query.ApplyFilters(request.Filters ?? [], StringFilters, EnumFilters);

        var desc = string.Equals(request.Sorting?.Direction, "desc", StringComparison.OrdinalIgnoreCase);
        IOrderedQueryable<Categories> ordered = request.Sorting?.Field switch
        {
            "categoryType" => desc ? query.OrderByDescending(c => c.CategoryType).ThenBy(c => c.Name) : query.OrderBy(c => c.CategoryType).ThenBy(c => c.Name),
            "createdAtUtc" => desc ? query.OrderByDescending(c => c.CreatedAtUtc) : query.OrderBy(c => c.CreatedAtUtc),
            _ => desc ? query.OrderByDescending(c => c.Name) : query.OrderBy(c => c.Name),
        };

        // Id tiebreak keeps paging stable when sort keys repeat.
        return ordered.ThenBy(c => c.Id)
            .ToPageResultAsync(request.Page, request.PageSize, cancellationToken);
    }

    public Task<bool> NameExistsAsync(Guid userId, CategoryType type, string name, Guid? excludeId, CancellationToken cancellationToken = default)
    {
        var lowered = name.ToLower();
        return _dbSet.AnyAsync(
            c => c.UserId == userId && c.CategoryType == type && c.Name.ToLower() == lowered && c.Id != excludeId,
            cancellationToken);
    }

    public async Task<bool> IsInUseAsync(Guid id, CancellationToken cancellationToken = default)
        => await _context.Transactions.AnyAsync(t => t.CategoryId == id, cancellationToken)
            || await _context.Budgets.AnyAsync(b => b.CategoryId == id, cancellationToken);
}
