using Core.Common;
using Core.Features.Transactions.Requests;
using Core.Interfaces.Repository;
using Domain.Entity;
using AccountEntity = Domain.Entity.Accounts;
using CategoryEntity = Domain.Entity.Categories;
using Domain.Enums;
using TransactionEntity = Domain.Entity.Transactions;

namespace Core.Features.Transactions.Services;

/// <summary>Everything validation needs about one user, loaded once (an import validates thousands of rows).</summary>
public class TransactionRulesContext
{
    public required int CurrencyDecimals { get; init; }
    /// <summary>Active accounts by id.</summary>
    public required IReadOnlyDictionary<Guid, AccountEntity> Accounts { get; init; }
    /// <summary>Active categories by id.</summary>
    public required IReadOnlyDictionary<Guid, CategoryEntity> Categories { get; init; }
}

/// <summary>Validation shared by the form endpoints and the Excel import.</summary>
public class TransactionRules
{
    public const decimal MaxAmount = 999_999_999_999m;
    public const int MaxNoteLength = 500;

    private readonly IRepository<Users> _users;
    private readonly IRepository<AccountEntity> _accounts;
    private readonly IRepository<CategoryEntity> _categories;

    public TransactionRules(IRepository<Users> users, IRepository<AccountEntity> accounts, IRepository<CategoryEntity> categories)
    {
        _users = users;
        _accounts = accounts;
        _categories = categories;
    }

    public async Task<TransactionRulesContext> LoadContextAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        var accounts = await _accounts.FindAsync(a => a.UserId == userId && a.Active, cancellationToken);
        var categories = await _categories.FindAsync(c => c.UserId == userId && c.Active, cancellationToken);
        return new TransactionRulesContext
        {
            CurrencyDecimals = Common.CurrencyDecimals.For(user?.CurrencyCode ?? "INR"),
            Accounts = accounts.ToDictionary(a => a.Id),
            Categories = categories.ToDictionary(c => c.Id),
        };
    }

    /// <summary>
    /// Returns errors keyed by camelCase request field; empty when valid. On edit, an account or category
    /// that has since been archived is still accepted if it is unchanged from <paramref name="existing"/>.
    /// </summary>
    public static Dictionary<string, string[]> Validate(
        TransactionRulesContext context, SaveTransactionRequest request, TransactionEntity? existing = null)
    {
        var errors = new Dictionary<string, List<string>>();
        void Add(string field, string message)
        {
            if (!errors.TryGetValue(field, out var list)) errors[field] = list = [];
            list.Add(message);
        }

        if (request.TransactionDate == default)
            Add("transactionDate", "Date is required.");

        if (request.Amount <= 0)
            Add("amount", "Amount must be greater than 0.");
        else if (request.Amount > MaxAmount)
            Add("amount", "Amount is too large.");
        else if (decimal.Round(request.Amount, context.CurrencyDecimals) != request.Amount)
            Add("amount", context.CurrencyDecimals == 0
                ? "Amount can't have decimals in your currency."
                : $"Amount can have at most {context.CurrencyDecimals} decimal places.");

        var typeValid = Enum.IsDefined(request.TransactionType);
        if (!typeValid)
            Add("transactionType", "Type must be Expense, Income or Transfer.");

        bool AccountOk(Guid id, Guid? stored) => context.Accounts.ContainsKey(id) || id == stored;

        if (request.AccountId == Guid.Empty)
            Add("accountId", "Choose an account.");
        else if (!AccountOk(request.AccountId, existing?.AccountId))
            Add("accountId", "Account not found or archived.");

        if (request.Note is { } note && note.Trim().Length > MaxNoteLength)
            Add("note", $"Note must be {MaxNoteLength} characters or fewer.");

        if (typeValid && request.TransactionType == TransactionType.Transfer)
        {
            if (request.ToAccountId is not { } to || to == Guid.Empty)
                Add("toAccountId", "Choose the account the money goes to.");
            else if (to == request.AccountId)
                Add("toAccountId", "From and to accounts must be different.");
            else if (!AccountOk(to, existing?.DestinationAccountId))
                Add("toAccountId", "To account not found or archived.");

            if (request.CategoryId is not null)
                Add("categoryId", "Transfers don't have a category.");
        }
        else if (typeValid)
        {
            if (request.ToAccountId is not null)
                Add("toAccountId", "Only transfers have a 'to' account.");

            var expected = request.TransactionType == TransactionType.Income ? CategoryType.Income : CategoryType.Expense;
            if (request.CategoryId is not { } categoryId || categoryId == Guid.Empty)
                Add("categoryId", "Choose a category.");
            else if (context.Categories.TryGetValue(categoryId, out var category))
            {
                if (category.CategoryType != expected)
                    Add("categoryId", $"'{category.Name}' is an {category.CategoryType} category; this is an {expected}.");
            }
            else if (categoryId != existing?.CategoryId || existing.TransactionType != request.TransactionType)
                Add("categoryId", "Category not found or archived.");
        }

        return errors.ToDictionary(e => e.Key, e => e.Value.ToArray());
    }
}
