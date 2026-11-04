using Core.Features.Reports.Requests;
using FluentValidation;

namespace Core.Features.Reports.Validators;

public class ReportRequestValidator : AbstractValidator<ReportRequest>
{
    public ReportRequestValidator()
    {
        RuleFor(x => x.To).GreaterThanOrEqualTo(x => x.From).WithMessage("The end date must be on or after the start date.");
        RuleFor(x => x.AsOf).NotEmpty();
    }
}
