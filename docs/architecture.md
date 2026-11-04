# Architecture

Personal-finance ledger: a .NET 10 API over Postgres, and a React SPA. Code-level rules
live in `src/server/CLAUDE.md` and `src/client/CLAUDE.md`; schema in `data-model.md`.

```
src/
  server/   Domain → Core → Infrastructure → Api   (.NET 10, EF Core + Npgsql)
  client/   React 19 + Vite + TypeScript SPA        (react-query, zustand, shadcn/ui)
```

## Current state

Plumbing only — no business features exist yet on either side.

- **Server:** features `Auth`, `Profile` (`PUT api/profile/currency`), `Transactions`
  (`api/transactions`: `search`, `summary`, CRUD; validation in `TransactionRules`, shared with the
  import), `Imports` (`api/imports`: `GET template`, `POST` upload, `GET` history, `GET {id}/errors`),
  `Reports` (`POST api/reports`: period totals, expense categories, 5 largest expenses and a 12-month
  trend; "usual" = average of up to 6 earlier like-for-like windows that start on/after the first
  transaction — `Core/Features/Reports/Services/ReportWindows.cs`),
  `Home` (`POST api/home`),
  `Categories`, `Accounts` (both also `GET options` for dropdowns)
  (`api/categories|accounts`: `POST search`, `GET/PUT {id}`, `POST`, `POST {id}/archive|restore`, `DELETE {id}` when unused).
  Migrations `InitialCreate`, `Masters` (`Infrastructure/Persistence/Migrations`). Lists page via
  `Infrastructure/Common/QueryablePagingExtensions.ToPageResultAsync`; a `select` filter on an enum
  column falls back to `numberMap` in `ApplyFilters`.
- **Background jobs:** Hangfire (in-process server, Postgres storage, schema `hangfire`); dashboard
  not exposed. `ImportJob` validates the whole file, then inserts all rows in one DB transaction or
  writes an error workbook (failing rows red + `Errors` column). Retries off.
- **Files:** Azure Blob Storage container `imports` (dev: Azurite, `docker compose up -d azurite`).
- **Excel:** EPPlus under its non-commercial personal licence (`EPPlus:LicenseHolder` in appsettings).
- **Client:** features `auth`, `transactions`, `reports`, `home`, `imports`, `categories`, `accounts`, `settings`. `/login` is public; `/home`,
  `/transactions`, `/reports` (tabs Overview · Categories · Trends), `/import`, `/categories`, `/accounts`, `/settings` sit inside `RequireAuth` → `RootLayout`; everything else is
  `NotFoundPage`. Money formatting (`lib/currency.ts`) uses `authStore.user.currencyCode`.
- **Auth:** single-user email + password (design: `docs/superpowers/specs/2026-11-03-auth-design.md`).
  `api/auth`: `GET setup`, `POST register` (only while `users` is empty), `login`, `refresh`,
  `logout`. Refresh token = httpOnly cookie `ledger_refresh` (path `/api/auth`, SameSite=Strict),
  stored SHA-256-hashed in `refresh_tokens`, rotated on every refresh; reuse of a rotated token
  revokes all the user's tokens.

## Server

### Layers
| Layer          | Owns | Depends on |
|----------------|------|------------|
| Domain         | entities, enums, `DomainException` | nothing |
| Core           | services, DTOs, validators, mappings, `Result<T>`, repository/UoW interfaces | Domain |
| Infrastructure | `AppDbContext`, `Repository<T>`, `UnitOfWork`, `CurrentUserService`, filter engine, health checks | Core |
| Api            | controllers, response envelope, filters, middleware, startup | Core + Infrastructure |

### Request pipeline (`Api/Program.cs`)
1. `.env.<environment>` (or `.env`) loaded via DotNetEnv, then `appsettings*.json`.
2. On startup: `MigrateDatabaseAsync()` applies pending EF migrations.
3. Middleware order: `ExceptionHandlingMiddleware` → HTTPS redirect → CORS → authentication
   → authorization → controllers → health checks.
4. `ValidationFilter` runs on every action: for each argument with a registered
   `IValidator<T>`, failures short-circuit as `400` + `ValidationError`.
5. Controller calls a service → `Result<T>` → `ToActionResult()`.

### Response envelope
Every response body is `ApiResponse<T>`:
```json
{ "message": "", "data": { }, "status": -1, "errors": null }
```
`status` is the `ErrorStatus` value, not the HTTP code. HTTP mapping (`ResultExtensions`):

| ErrorStatus | HTTP |
|---|---|
| `NoError (-1)` | 200 |
| `ValidationError (7)` | 400 |
| `Duplicate (1)` | 409 |
| `NotFound (2)` | 404 |
| `UnAuthorized (5)`, `InvalidCred (3)`, `TokenExpired (8)` | 401 |
| `Forbidden (9)` | 403 |
| `InternalServerError (6)` / other | 500 |

Thrown exceptions: `DomainException` → 400, anything else → 500 (status field carries the
HTTP code in that case). Bare JwtBearer challenges are 401 with **no** body.

### Listing / search
Request `PageRequest<TFilter>`:
```
page, pageSize, sorting { field, direction }, customFilter: TFilter, filters: PageFilter[]
```
`PageFilter { field, variant, operator, values[] }` is applied in the repository with
`QueryableFilterExtensions.ApplyFilters`, given per-feature field→selector maps:

| variant | operators | values |
|---|---|---|
| `text`, `select` | `eq`, `ilike` (case-insensitive contains) | first value |
| `number` (also enums; enums only `eq`) | `eq gt gte lt lte` | first value |
| `date` | `eq gt gte lt lte` | first value |
| `dateRange` | inclusive between | exactly 2 values |

Unknown fields/variants/operators and unparsable values are silently ignored.
Response `PageResult<T> { items, totalCount, page, pageSize, totalPages }`.

### Data access
- Generic `IRepository<T>` (registered open-generic) + `IUnitOfWork` for `SaveChangesAsync`
  and explicit transactions. Feature repositories derive from `Repository<T>`.
- `ICurrentUserService` exposes `UserId` (from `ClaimTypes.NameIdentifier`), `Roles`,
  `IsAuthenticated`. Use it to scope every query by user.

### Cross-cutting
- **Auth:** JWT bearer, symmetric key; issuer/audience/lifetime validated, 30s clock skew.
  Default policy requires an authenticated user. Config `Jwt:*` (access 15 min, refresh 14 days).
- **CORS:** policy `Frontend`, origins from `Cors:AllowedOrigins`, credentials allowed,
  exposes `Content-Disposition`.
- **Health:** `/health` (all), `/health/ready` (DB check), `/health/live` (process only).
- **Observability:** OpenTelemetry logs/traces/metrics (ASP.NET Core, HttpClient, Npgsql,
  runtime). OTLP export only if `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
- **API docs:** OpenAPI at `/openapi/v1.json`, Swagger UI enabled in all environments.

### Configuration
| Key | Purpose |
|---|---|
| `ConnectionStrings:DefaultConnection` | Postgres |
| `ConnectionStrings:BlobStorage` | Azure Blob Storage (`BlobServiceClient`); Azurite locally |
| `Jwt:Issuer`, `Jwt:Audience`, `Jwt:SigningKey`, lifetimes | token validation |
| `Cors:AllowedOrigins` | SPA origins (default `http://localhost:5173`) |
| `Observability:ServiceName` | OTel service name |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | enables OTLP export |

Templates: `Api/.env.example`, `Api/appsettings.Development.json.example`.

Local infra: `src/server/compose.yaml` — `docker compose up -d postgres azurite` for
`dotnet run`, or `docker compose up -d --build` to also run the API on `localhost:5106`.

## Client

- **Base URL:** `VITE_API_BASE_URL + "/api"`, default `http://localhost:5106/api`. Server
  controllers must therefore be routed under `api/`.
- **`axiosClient`:** attaches `Authorization: Bearer <accessToken>`; unwraps
  `ApiResponse.data` on success; on 401 calls `/auth/refresh` once (single in-flight
  promise, cookie-based via `withCredentials`) and retries; on failure clears auth and
  redirects to `/login`. 401s from `/auth/*` calls skip this and reach the caller. Rejections are normalized to `ApiError { message, status, errors }`.
- **State:** react-query for server state (`staleTime` 60s, `retry` 1, no refetch on focus);
  zustand for client state — `authStore` (sessionStorage), `themeStore`, `densityStore`
  (localStorage), `uiStore` (memory).
- **Tables:** shared `components/data-table/` (TanStack Table). `server.ts` converts table
  state to `PageFilter[]` / `PageSorting` for server-side search.
- **UI:** shadcn primitives in `src/ui/`, shared components in `src/components/`, Tailwind v4,
  recharts for charts, `lib/currency.ts` / `lib/dateRange.ts` helpers.
- **Features:** scaffolded with `npm run gen <name>` into `src/features/<name>/`.

## Running

```bash
# server (from src/server)
dotnet run --project Api
dotnet ef migrations add <Name> -p Infrastructure -s Api -o Migrations

# client (from src/client)
npm run dev      # vite, :5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```
No test projects; verify with build + lint.
