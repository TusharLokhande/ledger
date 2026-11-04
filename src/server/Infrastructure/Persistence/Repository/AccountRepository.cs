using System.Linq.Expressions;
using Core.Common;
using Core.Common.Dashboard;
using Core.Features.Accounts.Interfaces;
using Core.Features.Accounts.Requests;
using Domain.Entity;
using Domain.Enums;
using Infrastructure.Common;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Repository;

public class AccountRepository : Repository<Accounts>, IAccountRepository
{
    private static readonly Dictionary<string, Expression<Func<Accounts, string>>> StringFilters = new()
    {
        ["name"] = a => a.Name,
        ["institution"] = a => a.Institution!,
    };

    private static readonly Dictionary<string, LambdaExpression> EnumFilters = new()
    {
        ["accountType"] = (Expression<Func<Accounts, AccountType>>)(a => a.AccountType),
    };

    public AccountRepository(AppDbContext context) : base(context)
    {
    }

    public Task<PageResult<Accounts>> SearchAsync(Guid userId, PageRequest<AccountFilterRequest> request, CancellationToken cancellationToken = default)
    {
        var query = _dbSet.AsNoTracking().Where(a => a.UserId == userId);

        query = (request.CustomFilter?.Status ?? RecordStatus.Active) switch
        {
            RecordStatus.Archived => query.Where(a => !a.Active),
            RecordStatus.All => query,
            _ => query.Where(a => a.Active),
        };

        query = query.ApplyFilters(request.Filters ?? [], StringFilters, EnumFilters);

        var desc = string.Equals(request.Sorting?.Direction, "desc", StringComparison.OrdinalIgnoreCase);
        IOrderedQueryable<Accounts> ordered = request.Sorting?.Field switch
        {
            "accountType" => desc ? query.OrderByDescending(a => a.AccountType).ThenBy(a => a.Name) : query.OrderBy(a => a.AccountType).ThenBy(a => a.Name),
            "institution" => desc ? query.OrderByDescending(a => a.Institution).ThenBy(a => a.Name) : query.OrderBy(a => a.Institution).ThenBy(a => a.Name),
            "createdAtUtc" => desc ? query.OrderByDescending(a => a.CreatedAtUtc) : query.OrderBy(a => a.CreatedAtUtc),
            _ => desc ? query.OrderByDescending(a => a.Name) : query.OrderBy(a => a.Name),
        };

        // Id tiebreak keeps paging stable when sort keys repeat.
        return ordered.ThenBy(a => a.Id)
            .ToPageResultAsync(request.Page, request.PageSize, cancellationToken);
    }

    public Task<bool> NameExistsAsync(Guid userId, string name, Guid? excludeId, CancellationToken cancellationToken = default)
    {
        var lowered = name.ToLower();
        return _dbSet.AnyAsync(
            a => a.UserId == userId && a.Name.ToLower() == lowered && a.Id != excludeId,
            cancellationToken);
    }

    public Task<bool> IsInUseAsync(Guid id, CancellationToken cancellationToken = default)
        => _context.Transactions.AnyAsync(t => t.AccountId == id || t.DestinationAccountId == id, cancellationToken);
}
