using Azure.Storage.Blobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Core.Common.Interfaces;
using Core.Features.Accounts.Interfaces;
using Core.Features.Auth.Interfaces;
using Core.Features.Categories.Interfaces;
using Core.Features.Imports.Interfaces;
using Core.Features.Profile.Interfaces;
using Hangfire;
using OfficeOpenXml;
using Hangfire.PostgreSql;
using Infrastructure.Imports;
using Infrastructure.Storage;
using Core.Features.Home.Interfaces;
using Core.Features.Reports.Interfaces;
using Core.Features.Transactions.Interfaces;
using Core.Interfaces.Repository;
using Core.Interfaces.UnitOfWork;
using Infrastructure.Auth;
using Infrastructure.Monitoring.HealthChecks;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Repository;

namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddSingleton(_ => new BlobServiceClient(configuration.GetConnectionString("BlobStorage")));
        services.AddSingleton<IFileStore, BlobFileStore>();
        services.AddHttpClient<IAvatarStore, BlobAvatarStore>();

        // EPPlus is free only for non-commercial personal use; switch to a commercial licence if that changes.
        ExcelPackage.License.SetNonCommercialPersonal(configuration["EPPlus:LicenseHolder"] ?? "Ledger owner");

        services.AddHangfire(config => config.UsePostgreSqlStorage(
            options => options.UseNpgsqlConnection(configuration.GetConnectionString("DefaultConnection")),
            new PostgreSqlStorageOptions { SchemaName = "hangfire", QueuePollInterval = TimeSpan.FromSeconds(1) }));
        services.AddHangfireServer();
        services.AddScoped<IImportJobQueue, HangfireImportJobQueue>();
        services.AddSingleton<IImportTemplateBuilder, ImportTemplateBuilder>();
        services.AddScoped<ImportJob>();

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<ITransactionRepository, TransactionRepository>();
        services.AddScoped<IReportRepository, ReportRepository>();
        services.AddScoped<IHomeRepository, HomeRepository>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddSingleton<ITokenService, TokenService>();
        services.AddHttpClient<IGoogleAuthClient, GoogleAuthClient>();

        services.AddHealthChecks()
            .AddCheck<DatabaseHealthCheck>("database", tags: ["ready"]);

        return services;
    }

    public static async Task MigrateDatabaseAsync(this IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();
    }
}
