using Core.Common.Dashboard;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Common;

public static class QueryablePagingExtensions
{
    /// <summary>Counts, then takes one 1-based page. pageSize is clamped to 1..100.</summary>
    public static async Task<PageResult<T>> ToPageResultAsync<T>(
        this IQueryable<T> query, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        return new PageResult<T> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }
}
