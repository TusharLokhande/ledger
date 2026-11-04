using Core.Features.Categories.Requests;
using FluentValidation;

namespace Core.Features.Categories.Validators;

public class UpdateCategoryRequestValidator : AbstractValidator<UpdateCategoryRequest>
{
    public UpdateCategoryRequestValidator()
    {
        RuleFor(x => x.Name).Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Name is required.")
            .Must(n => n == null || n.Trim().Length <= 100).WithMessage("Name must be 100 characters or fewer.");
        RuleFor(x => x.CategoryType).IsInEnum();
        RuleFor(x => x.Icon).NotEmpty().MaximumLength(50).Matches("^[a-z0-9-]+$");
        RuleFor(x => x.Color).NotEmpty().Matches("^#[0-9a-fA-F]{6}$").WithMessage("Color must be a hex value like #22c55e.");
    }
}
