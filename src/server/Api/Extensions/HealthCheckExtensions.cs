using Microsoft.AspNetCore.Diagnostics.HealthChecks;

namespace Api.Extensions;

public static class HealthCheckExtensions
{
    public static WebApplication MapAppHealthChecks(this WebApplication app)
    {
        app.MapHealthChecks("/health");
        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("ready")
        });
        app.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = _ => false
        });

        return app;
    }
}
