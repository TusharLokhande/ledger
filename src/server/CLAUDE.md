# Backend Rules (.NET Clean Architecture — No CQRS / No MediatR)

Plain layered Clean Architecture. Controllers call Services directly. No MediatR, no
Commands/Queries/Handlers.

## Project docs

- `../../docs/architecture.md` — current state, request pipeline, response envelope,
  filter engine, config.
- `../../docs/data-model.md` — entities, relationships, open schema decisions.

## Folder structure

```
server/
  Domain/                         -> no project references
    Common/BaseEntity.cs           -> Id, Active, CreatedBy/AtUtc, UpdatedBy/AtUtc
    Entity/<Entities>.cs           -> : BaseEntity (class names are plural: Accounts, Transactions)
    Enums/
    Exceptions/DomainException.cs

  Core/                           -> application layer, references Domain
    Common/
      Result.cs                    -> Result<T> + ErrorStatus
      Dashboard/                   -> PageRequest<TFilter>, PageSorting, PageFilter, PageResult<T>
      Interfaces/                  -> ICurrentUserService, IValidationService
      Services/ValidationService.cs
    Interfaces/
      Repository/IRepository.cs    -> generic repository
      UnitOfWork/IUnitOfWork.cs
    Features/<Feature>/
      Dto/ Requests/ Interfaces/ Services/ Validators/ Mappings/
    DependencyInjection.cs         -> AddApplication()

  Infrastructure/                 -> references Core
    Auth/CurrentUserService.cs
    Common/QueryableFilterExtensions.cs  -> applies PageFilter list to IQueryable
    Persistence/
      AppDbContext.cs
      UnitOfWork.cs
      Configurations/BaseConfiguration.cs
      Repository/Repository.cs     -> generic; feature repos derive from it
    Migrations/
    Monitoring/HealthChecks/
    DependencyInjection.cs         -> AddInfrastructure(), MigrateDatabaseAsync()

  Api/                            -> references Core + Infrastructure
    Controllers/
    Common/ApiResponse.cs, ResultExtensions.cs (ToActionResult)
    Filters/ValidationFilter.cs    -> runs FluentValidation on every action argument
    Middleware/ExceptionHandlingMiddleware.cs
    Extensions/                    -> Auth (JWT), Cors, HealthChecks, Observability
    Program.cs
```

## Layer boundaries (hard rules)

1. **Domain** — entities, enums, domain exceptions. No EF attributes, no references.
2. **Core** — business logic only. No `DbContext`, no EF Core, no `HttpContext`, no file I/O.
   Data access only through `IUnitOfWork` / repository interfaces.
3. **Infrastructure** — the only layer that knows Postgres, EF Core, HTTP context, external
   APIs. Implements interfaces from Core. No business rules.
4. **Api** — routing, binding, auth attributes, call a service, `ToActionResult()`. Nothing else.

## Result / Response pattern (mandatory)

- Every service method exposed to the Api returns `Result<T>` via `Result<T>.Success`,
  `Result<T>.Failure(message, ErrorStatus)` or `Result<T>.ValidationFailure(errors)`.
- Expected failures (not found, duplicate, validation) are `Result` failures, never exceptions.
- Never return an entity from a service — map to a DTO (Mapster).
- Reuse `ErrorStatus`; don't invent per-feature error codes.

```csharp
[HttpGet("{id}")]
public async Task<IActionResult> GetById(Guid id)
{
    var result = await _service.GetByIdAsync(id);
    return result.ToActionResult();
}
```

## Listing endpoints

- Accept `PageRequest<TFilter>` as the body (`TFilter` = the feature's `*FilterRequest`),
  return `Result<PageResult<TDto>>`.
- Sorting/filtering is applied in the repository (Infrastructure) using
  `QueryableFilterExtensions.ApplyFilters`, not in the controller or service.

## New feature checklist

1. `Domain/Entity/<Entities>.cs` (: `BaseEntity`) + enums.
2. `Infrastructure/Persistence/Configurations/<Entity>Configuration.cs` (: `BaseConfiguration<T>`),
   add `DbSet<T>` to `AppDbContext`.
3. Repository interface in `Core/Features/<Feature>/Interfaces`, implementation in
   `Infrastructure/Persistence/Repository` (derive from `Repository<T>`). Register in Infrastructure DI.
4. `Core/Features/<Feature>/` Dto, Requests, `I<Feature>Service`, `<Feature>Service`,
   Validators (FluentValidation), Mappings (Mapster). Register service in Core DI.
5. `Api/Controllers/<Feature>Controller.cs` — thin.
6. Migration: `dotnet ef migrations add <Name> -p Infrastructure -s Api -o Migrations`.

## Naming

- `I<Feature>Service`, `<Feature>Service`, `Create<Entity>Request`, `Update<Entity>Request`,
  `<Entity>FilterRequest`, `<Entity>Dto`.
- One class per file, file name matches class name.

## Stack

.NET 10, ASP.NET Core controllers, EF Core + Npgsql, FluentValidation, Mapster, JWT bearer,
OpenTelemetry. No test projects.
