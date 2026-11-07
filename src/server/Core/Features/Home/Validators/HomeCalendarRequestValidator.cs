using Core.Features.Home.Requests;
using FluentValidation;

namespace Core.Features.Home.Validators;

public class HomeCalendarRequestValidator : AbstractValidator<HomeCalendarRequest>
{
    public HomeCalendarRequestValidator()
    {
        RuleFor(x => x.Month).NotEmpty();
    }
}
