using Core.Features.Home.Requests;
using FluentValidation;

namespace Core.Features.Home.Validators;

public class HomeRequestValidator : AbstractValidator<HomeRequest>
{
    public HomeRequestValidator()
    {
        RuleFor(x => x.Month).NotEmpty();
        RuleFor(x => x.AsOf).NotEmpty();
    }
}
