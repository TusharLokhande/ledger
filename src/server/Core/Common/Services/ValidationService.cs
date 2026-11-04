using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Core.Common.Interfaces;

namespace Core.Common.Services;

public class ValidationService : IValidationService
{
    private readonly IServiceProvider _serviceProvider;

    public ValidationService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<Dictionary<string, string[]>?> ValidateAsync<T>(T instance, CancellationToken cancellationToken = default)
    {
        var validator = _serviceProvider.GetService<IValidator<T>>();
        if (validator is null)
            return null;

        var validationResult = await validator.ValidateAsync(instance, cancellationToken);
        if (validationResult.IsValid)
            return null;

        return validationResult.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(
                group => group.Key,
                group => group.Select(e => e.ErrorMessage).ToArray());
    }
}
