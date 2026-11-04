using FluentValidation;
using Mapster;
using MapsterMapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Core.Common.Interfaces;
using Core.Common.Services;
using Core.Features.Accounts.Interfaces;
using Core.Features.Accounts.Services;
using Core.Features.Auth.Interfaces;
using Core.Features.Auth.Services;
using Core.Features.Categories.Interfaces;
using Core.Features.Categories.Services;
using Core.Features.Imports.Interfaces;
using Core.Features.Imports.Services;
using Core.Features.Profile.Interfaces;
using Core.Features.Transactions.Interfaces;
using Core.Features.Transactions.Services;
using Core.Features.Profile.Services;
using Core.Features.Home.Interfaces;
using Core.Features.Home.Services;
using Core.Features.Reports.Interfaces;
using Core.Features.Reports.Services;

namespace Core;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddScoped<IValidationService, ValidationService>();
        services.AddSingleton(TimeProvider.System);

        services.Configure<Common.JwtOptions>(configuration.GetSection("Jwt"));
        services.Configure<Common.GoogleOptions>(configuration.GetSection("Google"));

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<TransactionRules>();
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<IImportService, ImportService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IHomeService, HomeService>();

        var mapsterConfig = TypeAdapterConfig.GlobalSettings;
        mapsterConfig.Scan(typeof(DependencyInjection).Assembly);
        services.AddSingleton(mapsterConfig);
        services.AddScoped<IMapper, ServiceMapper>();

        return services;
    }
}
