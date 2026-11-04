using Core.Features.Accounts.Requests;
using FluentValidation;

namespace Core.Features.Accounts.Validators;

public class CreateAccountRequestValidator : AbstractValidator<CreateAccountRequest>
{
    public CreateAccountRequestValidator()
    {
        RuleFor(x => x.Name).Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Name is required.")
            .Must(n => n == null || n.Trim().Length <= 100).WithMessage("Name must be 100 characters or fewer.");
        RuleFor(x => x.AccountType).IsInEnum();
        RuleFor(x => x.Institution).Must(i => i == null || i.Trim().Length <= 100)
            .WithMessage("Institution must be 100 characters or fewer.");
    }
}
