using Core.Features.Accounts.Requests;
using FluentValidation;

namespace Core.Features.Accounts.Validators;

public class UpdateAccountRequestValidator : AbstractValidator<UpdateAccountRequest>
{
    public UpdateAccountRequestValidator()
    {
        RuleFor(x => x.Name).Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Name is required.")
            .Must(n => n == null || n.Trim().Length <= 100).WithMessage("Name must be 100 characters or fewer.");
        RuleFor(x => x.AccountType).IsInEnum();
        RuleFor(x => x.Institution).Must(i => i == null || i.Trim().Length <= 100)
            .WithMessage("Institution must be 100 characters or fewer.");
        RuleFor(x => x.OpeningBalance).InclusiveBetween(0, 999_999_999_999).When(x => x.OpeningBalance.HasValue)
            .WithMessage("Already saved must be between 0 and 999,999,999,999.");
    }
}
