namespace Api.Extensions;

public static class CorsExtensions
{
    public const string FrontendCorsPolicy = "Frontend";

    public static IServiceCollection AddFrontendCors(this IServiceCollection services, IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

        services.AddCors(options =>
        {
            options.AddPolicy(FrontendCorsPolicy, policy =>
            {
                policy.WithOrigins(allowedOrigins)
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials()
                    // Lets file downloads (exports) read the server-chosen file name.
                    .WithExposedHeaders("Content-Disposition");
            });
        });

        return services;
    }

    public static IApplicationBuilder UseFrontendCors(this IApplicationBuilder app)
        => app.UseCors(FrontendCorsPolicy);
}
