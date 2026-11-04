using Core.Features.Transactions.Requests;
using FluentValidation;

namespace Core.Features.Transactions.Validators;

public class TransactionSummaryRequestValidator : AbstractValidator<TransactionSummaryRequest>
{
    public TransactionSummaryRequestValidator()
    {
        RuleFor(x => x.To).GreaterThanOrEqualTo(x => x.From).WithMessage("The end date must be on or after the start date.");
        RuleFor(x => x.AsOf).NotEmpty();
    }
}
