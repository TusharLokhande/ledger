using FluentValidation;
using Microsoft.AspNetCore.Mvc.Filters;
using Api.Common;
using Core.Common;

namespace Api.Filters;

public class ValidationFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null)
                continue;

            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            if (context.HttpContext.RequestServices.GetService(validatorType) is not IValidator validator)
                continue;

            var validationContext = new ValidationContext<object>(argument);
            var validationResult = await validator.ValidateAsync(validationContext);

            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(
                        group => group.Key,
                        group => group.Select(e => e.ErrorMessage).ToArray());

                context.Result = Result<object>.ValidationFailure(errors).ToActionResult();
                return;
            }
        }

        await next();
    }
}
