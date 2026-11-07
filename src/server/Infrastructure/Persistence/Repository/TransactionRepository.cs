using System.Linq.Expressions;
using Core.Common.Dashboard;
using Core.Features.Transactions.Dto;
using Core.Features.Transactions.Interfaces;
using Core.Features.Transactions.Requests;
using Domain.Entity;
using Domain.Enums;
using Infrastructure.Common;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Repository;

public class TransactionRepository : Repository<Transactions>, ITransactionRepository
{
    private static readonly Dictionary<string, Expression<Func<Transactions, string>>> StringFilters = new()
    {
        ["note"] = t => t.Note!,
    };

    private static readonly Dictionary<string, LambdaExpression> NumberFilters = new()
    {
        ["amount"] = (Expression<Func<Transactions, decimal>>)(t => t.Amount),
        ["transactionType"] = (Expression<Func<Transactions, TransactionType>>)(t => t.TransactionType),
    };

    internal static readonly Expression<Func<Transactions, TransactionDto>> ToDto = t => new TransactionDto
    {
        Id = t.Id,
        TransactionDate = t.TransactionDate,
        TransactionType = t.TransactionType,
        Amount = t.Amount,
        AccountId = t.AccountId,
        AccountName = t.Account.Name,
        ToAccountId = t.DestinationAccountId,
        ToAccountName = t.DestinationAccount != null ? t.DestinationAccount.Name : null,
        CategoryId = t.CategoryId,
        CategoryName = t.Category != null ? t.Category.Name : null,
        CategoryIcon = t.Category != null ? t.Category.Icon : null,
        CategoryColor = t.Category != null ? t.Category.Color : null,
        Note = t.Note,
        CreatedAtUtc = t.CreatedAtUtc,
    };

    public TransactionRepository(AppDbContext context) : base(context)
    {
    }

    public Task<PageResult<TransactionDto>> SearchAsync(Guid userId, PageRequest<TransactionFilterRequest> request, CancellationToken cancellationToken = default)
    {
        var range = request.CustomFilter ?? new TransactionFilterRequest();
        var query = Filtered(userId, range.From, range.To, request.Filters);

        var desc = !string.Equals(request.Sorting?.Direction, "asc", StringComparison.OrdinalIgnoreCase);
        var ordered = request.Sorting?.Field switch
        {
            "amount" => desc ? query.OrderByDescending(t => t.Amount) : query.OrderBy(t => t.Amount),
            "createdAtUtc" => desc ? query.OrderByDescending(t => t.CreatedAtUtc) : query.OrderBy(t => t.CreatedAtUtc),
            _ => desc ? query.OrderByDescending(t => t.TransactionDate) : query.OrderBy(t => t.TransactionDate),
        };

        // Newest entry first within a day; Id keeps paging stable.
        return ordered.ThenByDescending(t => t.CreatedAtUtc).ThenBy(t => t.Id)
            .Select(ToDto)
            .ToPageResultAsync(request.Page, request.PageSize, cancellationToken);
    }

    public Task<TransactionDto?> GetDtoAsync(Guid userId, Guid id, CancellationToken cancellationToken = default)
        => _dbSet.AsNoTracking().Where(t => t.UserId == userId && t.Id == id).Select(ToDto).FirstOrDefaultAsync(cancellationToken);

    public async Task<(decimal Income, decimal Expenses)> SumAsync(Guid userId, DateOnly from, DateOnly to, IEnumerable<PageFilter>? filters, CancellationToken cancellationToken = default)
    {
        var totals = await Filtered(userId, from, to, filters)
            .Where(t => t.TransactionType != TransactionType.Transfer)
            .GroupBy(t => t.TransactionType)
            .Select(g => new { Type = g.Key, Total = g.Sum(t => t.Amount) })
            .ToListAsync(cancellationToken);

        return (totals.FirstOrDefault(t => t.Type == TransactionType.Income)?.Total ?? 0,
                totals.FirstOrDefault(t => t.Type == TransactionType.Expense)?.Total ?? 0);
    }

    private IQueryable<Transactions> Filtered(Guid userId, DateOnly from, DateOnly to, IEnumerable<PageFilter>? filters)
    {
        var query = _dbSet.AsNoTracking()
            .Where(t => t.UserId == userId && t.TransactionDate >= from && t.TransactionDate <= to);

        var remaining = new List<PageFilter>();
        foreach (var filter in filters ?? [])
        {
            // Id filters aren't strings or numbers, so they're applied here rather than by ApplyFilters.
            var id = Guid.TryParse(filter.Values?.FirstOrDefault(), out var parsed) ? parsed : (Guid?)null;
            switch (filter.Field)
            {
                case "accountId" when id is { } accountId:
                    // A transfer belongs to both of its accounts.
                    query = query.Where(t => t.AccountId == accountId || t.DestinationAccountId == accountId);
                    break;
                case "categoryId" when id is { } categoryId:
                    query = query.Where(t => t.CategoryId == categoryId);
                    break;
                case "accountId" or "categoryId":
                    break;
                default:
                    remaining.Add(filter);
                    break;
            }
        }

        return query.ApplyFilters(remaining, StringFilters, NumberFilters);
    }
}
