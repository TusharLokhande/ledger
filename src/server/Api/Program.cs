using System.Text.Json.Serialization;
using DotNetEnv;
using Api.Extensions;
using Api.Filters;
using Api.Middleware;
using Core;
using Infrastructure;

var environmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
var envFilePath = Path.Combine(Directory.GetCurrentDirectory(), $".env.{environmentName.ToLowerInvariant()}");
if (!File.Exists(envFilePath))
{
    envFilePath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
}
if (File.Exists(envFilePath))
{
    Env.Load(envFilePath);
}

var builder = WebApplication.CreateBuilder(args);
builder.AddObservability();


builder.Services.AddControllers(options => options.Filters.Add<ValidationFilter>())
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();
builder.Services.AddApplication(builder.Configuration);
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddJwtAuth(builder.Configuration);
builder.Services.AddFrontendCors(builder.Configuration);

var app = builder.Build();

await app.Services.MigrateDatabaseAsync();


app.MapOpenApi();
app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "Ledger API v1"));


app.UseExceptionHandlingMiddleware();

// Locally (Development, Local, …) the client calls http://localhost:5106; a redirect would break CORS preflights.
if (app.Environment.IsProduction()) app.UseHttpsRedirection();

app.UseFrontendCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapAppHealthChecks();

app.Run();
