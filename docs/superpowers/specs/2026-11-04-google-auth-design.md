# Google sign-in (multi-user, no passwords) — Design

Date: 2026-11-04
Supersedes the email/password parts of `2026-11-03-auth-design.md`. Refresh-token storage,
rotation, reuse detection and logout from that doc stay exactly as built.

## Intent

Drop email + password entirely. Anyone with a Google account can sign in; the first sign-in
creates their own ledger. The login page is the product's first impression, so it gets a proper
design. The user's Google profile photo is copied into our Azure Blob Storage and served by our API
so the avatar doesn't depend on Google's URL.

## Goals

- "Continue with Google" is the only way in. New Google account → new user, lands on `/home`.
- Returning user is matched by Google account id (`sub`), not email.
- Store per user: `ExternalUid` (Google `sub`), `Name`, `Email`, avatar blob path. Currency defaults
  to `INR`, changeable in Settings (already exists).
- Profile photo copied to Blob Storage on every sign-in, served by `GET /api/profile/avatar`,
  cached on the client.
- New login page, design **A** (split screen, see below).

## Non-goals

- Other providers (Microsoft, GitHub…), linking several providers to one user.
- Any Google API access on the user's behalf (only `openid email profile` scopes).
- Onboarding step (currency picker etc.).
- Returning the user to the exact page they were on before being bounced to `/login`
  (they land on `/home`) — add when it annoys someone.
- Uploading a custom avatar.

## Anti-goals

- Any password, register form, or `/auth/setup` left behind.
- Access token stored in the DB (it's a stateless JWT; only refresh-token hashes go in the DB).
- Full blob URL stored in the DB (store the blob path; URLs change between Azurite/Azure/CDN).
- Sign-in failing because the photo copy failed.
- Data leaking between users — every non-`Users` table is already scoped by `UserId` and every
  service/repository already filters by `ICurrentUserService.UserId`; this must stay true.

## Constraints (from the existing code)

- Server: .NET 10, layered (Domain / Core / Infrastructure / Api), `Result<T>` → `ApiResponse<T>`,
  FluentValidation, Mapster. Core must not do HTTP or touch `HttpContext`.
- JWT issuing (`ITokenService`/`TokenService`), `RefreshTokens` table, rotation and the
  `ledger_refresh` cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth`) already work.
- Blob Storage: `BlobServiceClient` registered as singleton; `IFileStore`/`BlobFileStore` is
  hard-wired to the `imports` container (`ImportLimits.Container`). Azurite locally via `compose.yaml`.
- Four migrations exist (`Infrastructure/Persistence/Migrations`: `InitialCreate`, `Masters`,
  `Transactions`, `UserName`) and `MigrateDatabaseAsync()` runs at startup. Owner chose to **wipe**:
  existing data is disposable.
- Client: React 19 + Vite, feature folders, react-query, zustand `authStore` (access token in
  `sessionStorage`), axios interceptor already refreshes on 401. `RequireAuth` already restores the
  session via `POST /auth/refresh` when there's no access token. shadcn `ui/avatar.tsx` exists.
- Owner preference: no tests; verify with `dotnet build`, `npm run build`, `npm run lint`, manual run.
- Reference implementation: the owner's own Finora repo
  (`github.com/TusharLokhande/Finora`, `server/src/MoneyManagement.Infrastructure/Auth/GoogleOAuthClient.cs`,
  `server/src/MoneyManagement.Api/Controllers/AuthController.cs`). Port from it where it fits.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **Chosen** | **Server-driven OAuth code flow + PKCE, hand-rolled (Finora's way).** `GET /auth/google` redirects to Google; `GET /auth/google/callback` exchanges the code, validates the id_token with `Google.Apis.Auth`, signs in, redirects to the SPA. | Fully custom button (fits design A), no Google script on the page, code already proven in Finora. Costs two endpoints, a PKCE cookie and a redirect hop. |
| 1 | Google Identity Services button on the client, POST the ID token to `/auth/google`. | Least code, but the button is Google-styled, Google script on the page. |
| 2 | ASP.NET `AddGoogle()` handler. | Adds cookie auth scheme + token hand-off to the SPA; more moving parts. Only worth it for Google API access. |
| 3 | `@react-oauth/google` with custom button. | New npm dep, same mechanics as 1. |

Owner picked **Finora's way**.

## Design

### Data — `Users`

| Column | Change |
|---|---|
| `ExternalUid` | **new**, `string(255)`, required, **unique index**. Google `sub`. |
| `Email` | kept, from Google, lower-cased; updated on each sign-in. **Unique index dropped** (identity is `ExternalUid`; a Google email can move between accounts). |
| `Name` | kept, from Google `name`; updated on each sign-in. Stays nullable. |
| `AvatarPath` | **new**, `string(255)?`. Blob path, e.g. `{userId}.jpg` in container `avatars`; null = no photo. |
| `PasswordHash` | **removed**. |
| `CurrencyCode` | unchanged, default `INR`. |

`UpdatedAtUtc` (from `BaseEntity`) is set on every sign-in and doubles as the avatar version.

Migration (owner's choice): delete all four existing migrations and the model snapshot, generate a
fresh `InitialCreate` with the new shape, and drop the local DB and the compose Postgres volume
(`docker compose down -v` or equivalent) so startup migration recreates everything.

### Config (`.env` / `appsettings`, add to `.env.example`)

```
Google__ClientId=
Google__ClientSecret=
Google__RedirectUri=http://localhost:5106/api/auth/google/callback
Client__BaseUrl=http://localhost:5173
```

Bound to a `GoogleOptions` record like `JwtOptions`. `RedirectUri` must be registered in the Google
Cloud console OAuth client.

### Endpoints (`AuthController`, `api/auth`, `[AllowAnonymous]`)

| Method | Path | Behaviour |
|---|---|---|
| GET | `/auth/google` | Generate `state` (random) and PKCE `code_verifier`; set cookie `ledger_oauth` = `state.verifier` (`HttpOnly`, `Secure`, **`SameSite=Lax`** — must survive the top-level redirect back from google.com — `Path=/api/auth/google`, 10 min). 302 to Google authorize URL: `response_type=code`, `scope=openid email profile`, `code_challenge_method=S256`, `prompt=select_account`, `state`. |
| GET | `/auth/google/callback?code&state` (or `?error`) | Read + delete `ledger_oauth`. If missing, `state` mismatch, or `error` present → 302 `{Client.BaseUrl}/login?error=google`. Else call `IAuthService.SignInWithGoogleAsync(code, verifier)`. Failure → same error redirect. Success → set `ledger_refresh` cookie (unchanged options) and 302 `{Client.BaseUrl}/home`. The access token is **not** in the redirect; the SPA gets it from `/auth/refresh`. |
| POST | `/auth/refresh` | unchanged |
| POST | `/auth/logout` | unchanged |
| — | `/auth/setup`, `/auth/register`, `/auth/login` | **removed** |

Note: `ledger_refresh` is `SameSite=Strict`. Setting it on the callback response (reached via a
cross-site redirect from Google) is allowed; it's then *sent* on the SPA's same-site XHR to
`/auth/refresh`. Builder verifies this in the browser; if the cookie isn't sent on the first
refresh, switch `ledger_refresh` to `Lax` (still `HttpOnly`, still path-scoped).

### `GET /api/profile/avatar` (`ProfileController`, `[Authorize]`)

Reads the current user's `AvatarPath` from `avatars`; 404 if null or blob missing; else returns
the bytes with the stored content type and `Cache-Control: private, max-age=86400`.

### Sign-in logic (`AuthService.SignInWithGoogleAsync(code, verifier)`)

1. `IGoogleAuthClient.ExchangeCodeAsync(code, verifier)` (Infrastructure): POST to
   `https://oauth2.googleapis.com/token`, then `GoogleJsonWebSignature.ValidateAsync(idToken,
   new() { Audience = [ClientId] })`. Returns `GoogleIdentity(Subject, Email, Name, PictureUrl)` or
   a failure. Require `email_verified`.
2. Find user by `ExternalUid == Subject` (and `Active`). None → create with `CurrencyCode = "INR"`.
   Inactive user → `Forbidden`. Always refresh `Email` (lower-cased) and `Name`.
3. If `PictureUrl` present: download it (ask Google for 256px by replacing the `=s96-c` size
   suffix with `=s256-c`), upload to `avatars/{userId}.jpg` (overwrite), set `AvatarPath`.
   Any failure here is logged and swallowed; previous `AvatarPath` is kept.
4. Set `UpdatedAtUtc`, issue session via the existing `IssueSessionAsync`, save.

### DTO

`AuthUserDto` gains `AvatarUrl: string?` = `$"/profile/avatar?v={UpdatedAtUtc.Ticks}"` when
`AvatarPath` is set, else null. Built in one place (both `AuthService` and `ProfileService` build
`AuthUserDto` today — share that). The `v` param makes a new photo a new cache key; the server ignores it.

### Blob storage

`IFileStore` currently lives in `Core/Features/Imports/Interfaces` and is bound to `imports`.
Builder's call how to reach the `avatars` container; the expected small path is: move `IFileStore`
to `Core/Common/Interfaces`, give `BlobFileStore` the container name via constructor, register two
keyed singletons (`"imports"`, `"avatars"`), and add content-type on upload/read for avatars.

### Client

**Removed:** `LoginForm`, `RegisterForm`, `AuthField`, `useLogin`, `useRegister`,
`useSetupStatus`, `auth.schema.ts` (if nothing else uses it), and their api functions.

**`AuthUser` type:** add `avatarUrl: string | null`.

**Login page (design A):**

- Desktop: two columns. Left (~55%) always-dark navy panel (`#0E1A36`) with the Ledger logo, a
  soft Ocean Blue radial glow, and three floating glass cards with clearly sample numbers
  ("Net worth ₹4,82,350", "This month +₹12,400", "Credit card due ₹8,210 · 6 days") that drift
  slowly; static under `prefers-reduced-motion`. Cards are decorative (`aria-hidden`).
- Right: follows app theme. "Welcome to Ledger", one-line copy ("Track every account, card and
  rupee in one place."), the **Continue with Google** button (white, Google "G" SVG, pill), and
  "New here? Signing in creates your ledger."
- Button is a plain link to `${API_BASE_URL}/auth/google` (full-page navigation). On click it shows
  a spinner and becomes non-interactive.
- `?error=google` → inline message under the button: "Couldn't sign you in with Google. Try again."
- Mobile: brand panel collapses to a short top band (logo + one card); button above the fold.
- Already signed in (`isAuthenticated`) → redirect `/home` (as today).
- Mockup: `.superpowers/brainstorm/242353-1793795585/content/login-directions.html`, option A.

**After Google redirects to `/home`:** no access token in the store → `RequireAuth` runs the existing
`useRestoreSession` (refresh) → signed in. No new code path needed.

**Avatar:** `useAvatar(avatarUrl)` query (auth feature, key includes `avatarUrl`, `staleTime:
Infinity`, enabled only when `avatarUrl` is non-null) fetches through `axiosClient` with
`responseType: "blob"` and returns `URL.createObjectURL(blob)`. `UserMenu` renders `AvatarImage`
with it and keeps the initials `AvatarFallback`.

## Decided by the owner

- Google only, no passwords; multi-user; first sign-in creates the account.
- Default currency INR, no onboarding step.
- Store external uid, name, email, profile photo reference.
- Access token stays client-side (sessionStorage); refresh token hashed in DB + HttpOnly cookie.
- Avatar served via `/api/profile/avatar`, cached on the frontend.
- Login page design A.
- Finora's server-driven OAuth + PKCE flow, `Google.Apis.Auth` for id_token validation.
- Wipe existing data: replace the four migrations with a fresh `InitialCreate`.

## Calls I made (owner to check)

- Users matched by Google `sub`; email unique index dropped.
- Name/email/photo refreshed from Google on every sign-in.
- Photo stored as `avatars/{userId}.jpg`, overwritten; photo failures never block sign-in.
- Avatar version = `UpdatedAtUtc` ticks in the URL.
- After sign-in always land on `/home`.
- PKCE cookie `SameSite=Lax`; refresh cookie stays `Strict` unless the browser test says otherwise.
- `email_verified` required.

## Left to the builder

- Exact class/file names within the layering; how much of Finora's code is copied verbatim.
- Keyed-services vs another way to reach the `avatars` container.
- Exact Tailwind for the login page within the mockup and existing tokens.
- Drift animation details.

## Verify

1. `dotnet build`, `npm run build`, `npm run lint` pass.
2. Migration creates `users` with `ExternalUid` unique index, no `PasswordHash`.
3. Manual: `/login` shows design A (desktop + mobile width, light + dark). Continue with Google →
   Google chooser → lands on `/home` signed in, header avatar shows the Google photo; blob
   `avatars/{id}.jpg` exists in Azurite. Reload → still signed in. Logout → `/login`.
   Second Google account → separate empty ledger. Cancel on Google's screen → `/login` with the
   error message. Tampered `state` → error redirect. Avatar request appears once per session in
   the network tab.
