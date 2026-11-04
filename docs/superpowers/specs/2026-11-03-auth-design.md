# Auth (email + password, single user) — Design

Date: 2026-11-03

## Intent

Ledger has no way to sign in. Every entity is scoped per user (`UserId`, read from the JWT via
`ICurrentUserService`), so nothing — starting with the Categories and Accounts masters — can be
built until a user can authenticate. This adds our own email + password auth.

Ledger is for **one person** (the owner). Google login is coming later and must slot in without
reworking this.

## Goals

- Owner can create their account once, sign in with email + password, stay signed in across
  page reloads for up to the refresh-token lifetime, and log out.
- All non-auth API endpoints require a valid access token (already the default policy).
- Client routes other than `/login` (and the first-run register screen) are protected.

## Non-goals

- Public sign-up, multiple users, roles, approval/suspension.
- Forgot/reset password, email verification, sending any email.
- Google login (later — but see constraints).
- Rate limiting / lockout on login (single user, can add later).

## Anti-goals

- Anything that blocks adding Google login later (e.g. a separate username that Google can't map to).
- Storing raw refresh tokens, or refresh tokens readable by JS.
- A second user being able to register after the owner exists.

## Constraints (from the existing code)

- **Server:** .NET 10, EF Core + Npgsql, FluentValidation (via `ValidationFilter`), Mapster,
  `Result<T>` → `ApiResponse<T>` via `ToActionResult()`. JwtBearer validation is already wired
  (`AuthExtensions.AddJwtAuth`) using `JwtOptions` (`Issuer`, `Audience`, `SigningKey`,
  `AccessTokenLifetimeMinutes` = 15, `RefreshTokenLifetimeDays` = 14), values come from `.env`.
- `CurrentUserService` reads the user id from `ClaimTypes.NameIdentifier` — issued tokens must put
  the user id there (JwtBearer maps `sub` → `NameIdentifier` by default; either works as long as it
  round-trips).
- No migrations exist yet; `Users` already has a unique index on `Email`.
- **No new NuGet or npm packages.** Password hashing uses `PasswordHasher<Users>` from
  `Microsoft.AspNetCore.Identity` (shipped in the `Microsoft.AspNetCore.App` shared framework that
  Core/Infrastructure already reference). Token creation uses `JsonWebTokenHandler` /
  `System.IdentityModel.Tokens.Jwt`, both pulled in by the JwtBearer package (Api project).
- **Client:** `axiosClient` already: attaches `Bearer` from `useAuthStore`, on 401 calls
  `POST /auth/refresh` with credentials (cookie), then retries; on refresh failure clears auth and
  sends the browser to `/login`. `API_BASE_URL` is `http://localhost:5106/api`; CORS already allows
  `http://localhost:5173` with credentials. Client and API are both `localhost` (same site), so a
  `SameSite=Strict` cookie works in dev.
- No tests in this repo (owner preference); verify via `dotnet build`, `npm run build`, `npm run lint`,
  and manual run.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | **`refresh_tokens` table.** Each issued refresh token stored hashed; refresh rotates (old row revoked, new row issued); logout revokes the current device's row. | Per-device logout, reuse of a rotated token is detectable. Costs one entity + rotation logic. |
| B | Stateless signed refresh JWT + `TokenVersion` on `Users`; logout bumps version. | ~Half the code, no table; logout kills every device, no theft detection. |
| — | ASP.NET Core Identity (`AddIdentityApiEndpoints`) | Rejected: brings its own user tables and opaque tokens, fights the existing `Users` entity and JWT setup. |
| — | External auth service | Rejected: owner wants their own flow. |

Owner picked **A**.

## Design

### Data

`Users` — unchanged columns (`Email`, `PasswordHash`). Email stored trimmed + lower-cased.

New entity `RefreshTokens : BaseEntity` (`Domain/Entity/RefreshTokens.cs`, table `refresh_tokens`):

| Column | Type | Notes |
|---|---|---|
| `UserId` | `Guid` | FK → Users, cascade delete |
| `TokenHash` | `string` (64) | SHA-256 hex of the raw token; unique index |
| `ExpiresAtUtc` | `DateTime` | now + `RefreshTokenLifetimeDays` |
| `RevokedAtUtc` | `DateTime?` | set on rotate or logout |
| `ReplacedByTokenId` | `Guid?` | the row that superseded it on rotation (not a FK, informational) |

Raw refresh token = 32 random bytes (`RandomNumberGenerator`), base64url. Only the hash is stored.

The first migration (`InitialCreate`) creates all existing tables plus `refresh_tokens` — there are
no migrations yet, so this is the first one.

### Endpoints (`AuthController`, route `api/auth`, `[AllowAnonymous]` unless noted)

All return `ApiResponse<T>` like the rest of the API.

| Method | Path | Body | Behaviour |
|---|---|---|---|
| GET | `/auth/setup` | — | `{ needsSetup: bool }` — true when `users` is empty. Lets the client show register vs login. |
| POST | `/auth/register` | `{ email, password }` | Only when no user exists; otherwise `Forbidden` ("Registration is closed"). Creates the user, then signs in (same response as login). |
| POST | `/auth/login` | `{ email, password }` | Verifies with `PasswordHasher`. Wrong email or password → `InvalidCred` with one generic message. Success → issue tokens. |
| POST | `/auth/refresh` | — (cookie) | Reads the refresh cookie, looks up by hash. Missing/unknown/expired → `UnAuthorized` + clear cookie. Already revoked (reuse) → revoke **all** of that user's active tokens, `UnAuthorized`, clear cookie. Valid → revoke it, set `ReplacedByTokenId`, issue a new pair. |
| POST | `/auth/logout` | — (cookie) | Revokes the cookie's token if present, clears the cookie. Always succeeds (idempotent). |
| GET | `/auth/me` | — | `[Authorize]`. Returns the current `AuthUser`. Not required by the flow (refresh returns the user) — **builder may skip**. |

**Issued tokens / response** — `AuthResult { accessToken, expiresInSeconds, user: { id, email } }`
in the body; refresh token only in the cookie:

- Cookie name `ledger_refresh`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth`,
  `Expires` = token expiry. (`Secure` works on `http://localhost` in modern browsers.)
- Access token: JWT signed HS256 with `SigningKey`, issuer/audience from `JwtOptions`,
  lifetime `AccessTokenLifetimeMinutes`, claims `sub`/`NameIdentifier` = user id, `email`.

**Validation (FluentValidation):** email required + valid format; password required, min 8 chars
on register (login only checks non-empty, so a later rule change can't lock the owner out).

### Layering (follows existing folders)

- `Core`: request/response DTOs, validators, `IAuthService`, `ITokenService` interfaces.
- `Infrastructure`: `AuthService` (register/login/refresh/logout using `IRepository<>` +
  `IUnitOfWork`), `TokenService` (JWT + refresh token generation/hashing),
  `RefreshTokensConfiguration`. Register in `Infrastructure/DependencyInjection.cs`.
- `Api`: `AuthController` — the only layer touching cookies.

### Client

- `npm run gen auth` → `src/features/auth/` (api, hooks/mutations, schemas, pages).
- **Trim `auth.types.ts`:** `AuthUser = { id: string; email: string }`; drop `UserRole`,
  `UserStatus`, `name`, `reason`. Fix any compile fallout.
- **`/login` page:** email + password form (react-hook-form + zod, shadcn `Input`/`Button`/`Label`
  already in `src/ui`). On mount, calls `GET /auth/setup`; if `needsSetup`, the same page shows
  "Create your account" with a confirm-password field and posts to `/auth/register` instead.
  On success → `setAuth(...)` → navigate to the page they came from, else `/home`.
  Errors shown inline (generic "Invalid email or password").
- **Protected routes:** a `RequireAuth` wrapper around the `RootLayout` route. If no access token
  in the store, try `refreshAccessToken()` once (show `FullScreenLoader` meanwhile); on failure
  redirect to `/login` with the original location in state. If already signed in, visiting `/login`
  redirects to `/home`.
- **Logout:** an item in the existing header/sidebar user area → `POST /auth/logout`, `clearAuth()`,
  navigate to `/login`.
- `authStore` already persists the access token in `sessionStorage`; keep as is.

## Decided by the owner

- Single user; own email + password flow; Google later.
- Login identifier is the **email** (agreed in conversation).
- Account created by a first-run register endpoint that closes once a user exists.
- Refresh tokens: approach A (table, rotation, per-device logout).
- Build auth before the Categories/Accounts masters.

## Calls I made (owner to check)

- Reuse detection revokes all of the user's tokens.
- Cookie path scoped to `/api/auth`, `SameSite=Strict`.
- Password minimum 8 characters, no other complexity rules.
- Expired/revoked token rows are left in the table (no cleanup job) — one user, the table stays tiny.
- `/auth/me` optional.

## Left to the builder

- Exact class/file names within the layering above; controller action shapes.
- Whether `AuthService` lives in Core with repository interfaces or in Infrastructure — match
  whatever reads cleanest given `IRepository<T>` lives in Core.
- Layout/styling of the login page within the existing shadcn look.

## Verify

1. `dotnet build` (server) and `npm run build` + `npm run lint` (client) pass.
2. `dotnet ef migrations add InitialCreate` generates `refresh_tokens` with the unique hash index;
   app starts and migrates.
3. Manual: fresh DB → `/login` shows "Create your account" → register → lands on `/home`.
   Second `POST /auth/register` → 403. Logout → `/login`. Login works; wrong password shows the
   generic error. Reload while signed in stays signed in; after deleting `sessionStorage`, reload
   restores the session via refresh. Replaying an old refresh cookie after rotation → 401 and the
   current session is also revoked.
