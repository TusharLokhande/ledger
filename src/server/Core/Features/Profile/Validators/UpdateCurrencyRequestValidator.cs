using Core.Features.Profile.Requests;
using FluentValidation;

namespace Core.Features.Profile.Validators;

public class UpdateCurrencyRequestValidator : AbstractValidator<UpdateCurrencyRequest>
{
    public UpdateCurrencyRequestValidator()
    {
        RuleFor(x => x.CurrencyCode).NotEmpty().Matches("^[A-Z]{3}$")
            .WithMessage("Use a 3-letter currency code, e.g. INR.");
    }
}
