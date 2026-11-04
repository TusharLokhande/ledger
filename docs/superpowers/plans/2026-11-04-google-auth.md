# Google Sign-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace email/password auth with server-driven Google OAuth (code + PKCE), store each user's Google photo in Blob Storage served via `/api/profile/avatar`, and ship the split-screen login page (design A).

**Architecture:** Api owns the redirect/callback and cookies; Core's `AuthService` finds-or-creates the user by Google `sub` and reuses the existing session/refresh-token code; Infrastructure talks to Google (`Google.Apis.Auth`) and Azure Blob. The client's login button is a plain link; after the redirect the existing `RequireAuth` → `/auth/refresh` path signs the user in.

**Tech Stack:** .NET 10, EF Core + Npgsql, Azure.Storage.Blobs, Google.Apis.Auth (new), React 19 + Vite + Tailwind v4, react-query, zustand.

**Spec:** `docs/superpowers/specs/2026-11-04-google-auth-design.md`

## Global Constraints

- Ponytail: smallest diff that meets the spec; no abstractions beyond the interfaces named here.
- No tests (owner preference). Verify with `dotnet build Ledger.slnx` (in `src/server`), `npm run build` and `npm run lint` (in `src/client`), plus the manual run in Task 5.
- Not a git repo: no commit steps.
- Only new package: `Google.Apis.Auth` in `Infrastructure`. No new npm packages.
- Server rules from `src/server/CLAUDE.md`: Core has no HTTP/EF/HttpContext; services return `Result<T>`; Api is thin.
- Cookies: `ledger_oauth` = `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/auth/google`, 10 min. `ledger_refresh` unchanged.
- Scopes `openid email profile`; `prompt=select_account`; `code_challenge_method=S256`.
- Error redirect target: `{Client:BaseUrl}/login?error=google`. Success target: `{Client:BaseUrl}/home`.
- Error copy: "Couldn't sign you in with Google. Try again."
- Avatar response header: `Cache-Control: private, max-age=86400`.
- Product name on the login page stays **PocketLedger** with the `Wallet` icon (current branding; the mockup's "Ledger" was a placeholder).

## Review Focus

1. Google `?error=access_denied` (user cancels) or a missing/expired `ledger_oauth` cookie → redirect to `/login?error=google`, never a 500 or a JSON page. *(Task 2, step 4 check)*
2. Google picture download or blob upload fails → sign-in still succeeds, old `AvatarPath` kept. *(Task 1, step 6 check)*
3. User with no Google picture → `avatarUrl: null`, `/profile/avatar` 404, menu shows initials, no failing network loop. *(Task 4 check)*
4. Refresh cookie (`SameSite=Strict`) set on the cross-site callback is actually sent on the first `/auth/refresh` after landing on `/home`; if not, switch it to `Lax`. *(Task 5)*
5. `email_verified=false` or inactive user → error redirect, no session issued. *(Task 1, step 6 check)*

---

### Task 1: Server — Google identity, users, avatar storage, sign-in service

**Files:**
- Modify: `Domain/Entity/Users.cs`, `Infrastructure/Persistence/Configurations/UsersConfiguration.cs`
- Modify: `Core/Features/Auth/Dto/AuthUserDto.cs`, `Core/Features/Auth/Interfaces/IAuthService.cs`, `Core/Features/Auth/Services/AuthService.cs`, `Core/Features/Profile/Services/ProfileService.cs:39`, `Core/DependencyInjection.cs`
- Create: `Core/Common/GoogleOptions.cs`, `Core/Features/Auth/Interfaces/IGoogleAuthClient.cs`, `Core/Features/Profile/Interfaces/IAvatarStore.cs`
- Create: `Infrastructure/Auth/GoogleAuthClient.cs`, `Infrastructure/Storage/BlobAvatarStore.cs`; Modify `Infrastructure/DependencyInjection.cs`, `Infrastructure/Infrastructure.csproj`
- Delete: `Core/Features/Auth/Requests/LoginRequest.cs`, `RegisterRequest.cs`, `Core/Features/Auth/Validators/LoginRequestValidator.cs`, `RegisterRequestValidator.cs`, `Core/Features/Auth/Dto/SetupStatusDto.cs`
- Delete then regenerate: everything in `Infrastructure/Persistence/Migrations/`

(All paths relative to `src/server`.)

**Interfaces:**
- Produces:
  - `Users`: `+ string ExternalUid`, `+ string? AvatarPath`, `- PasswordHash`.
  - `record AuthUserDto(Guid Id, string Email, string? Name, string CurrencyCode, string? AvatarUrl)` with `static AuthUserDto From(Users user)`; `AvatarUrl = user.AvatarPath is null ? null : $"/profile/avatar?v={(user.UpdatedAtUtc ?? user.CreatedAtUtc).Ticks}"`.
  - `class GoogleOptions { string ClientId; string ClientSecret; string RedirectUri; }` bound from section `"Google"`.
  - `record GoogleIdentity(string Subject, string Email, string? Name, string? PictureUrl);`
  - `interface IGoogleAuthClient { (string Url, string State, string CodeVerifier) CreateAuthorizationRequest(); Task<GoogleIdentity?> ExchangeCodeAsync(string code, string codeVerifier, CancellationToken ct = default); }` — `null` means any failure (token exchange, invalid id_token, `email_verified` false).
  - `interface IAvatarStore { Task<string> CopyFromUrlAsync(Guid userId, string url, CancellationToken ct = default); Task<(byte[] Content, string ContentType)?> ReadAsync(string path, CancellationToken ct = default); }` — `CopyFromUrlAsync` returns the blob path, throws on failure.
  - `IAuthService`: remove `GetSetupStatusAsync`, `RegisterAsync`, `LoginAsync`; add `Task<Result<AuthSessionDto>> SignInWithGoogleAsync(string code, string codeVerifier, CancellationToken ct = default)`. `RefreshAsync`/`LogoutAsync` unchanged.

- [ ] **Step 1: Data model.** `Users`: add `ExternalUid` and `AvatarPath`, remove `PasswordHash`. `UsersConfiguration`: `ExternalUid` max 255, required, unique index; `AvatarPath` max 255; drop the `PasswordHash` property line; drop `HasIndex(Email).IsUnique()` (keep Email max 256 required).

- [ ] **Step 2: DTO.** Add `AvatarUrl` and `From(Users)` to `AuthUserDto` (formula above). Replace both `new AuthUserDto(...)` calls (`AuthService` line ~149, `ProfileService` line 39) with `AuthUserDto.From(user)`.

- [ ] **Step 3: Google client.** `dotnet add Infrastructure package Google.Apis.Auth`. Implement `GoogleAuthClient : IGoogleAuthClient` (typed `HttpClient`, `IOptions<GoogleOptions>`, `ILogger`), porting Finora's `server/src/MoneyManagement.Infrastructure/Auth/GoogleOAuthClient.cs`:
  - `CreateAuthorizationRequest`: `State` = 32 random bytes base64url; `CodeVerifier` = 32 random bytes base64url; challenge = base64url(SHA256(ASCII verifier)); URL `https://accounts.google.com/o/oauth2/v2/auth` with `client_id, redirect_uri, response_type=code, scope=openid email profile, state, code_challenge, code_challenge_method=S256, prompt=select_account` (use `QueryHelpers.AddQueryString`).
  - `ExchangeCodeAsync`: form-POST `https://oauth2.googleapis.com/token` (`code, client_id, client_secret, redirect_uri, grant_type=authorization_code, code_verifier`); read `id_token`; `GoogleJsonWebSignature.ValidateAsync(idToken, new() { Audience = [ClientId] })`; return null (and log a warning) on non-2xx, `InvalidJwtException`, or `!payload.EmailVerified`; else `new GoogleIdentity(payload.Subject, payload.Email, payload.Name, payload.Picture)`.

- [ ] **Step 4: Avatar store.** `BlobAvatarStore : IAvatarStore` (typed `HttpClient`, `BlobServiceClient`), container `"avatars"` (`CreateIfNotExistsAsync` once, like `BlobFileStore`).
  - `CopyFromUrlAsync`: request Google's 256px size by replacing a trailing `=s<digits>-c` with `=s256-c` (regex `=s\d+-c$`; leave URL as is if absent); GET with `EnsureSuccessStatusCode`; upload to `{userId}.jpg` with `overwrite`, `BlobHttpHeaders.ContentType` = response content type (default `image/jpeg`); return `{userId}.jpg`.
  - `ReadAsync`: `DownloadContentAsync`; return `(bytes, Details.ContentType)`; `null` on 404 `RequestFailedException`.

- [ ] **Step 5: DI.** Core: `services.Configure<GoogleOptions>(configuration.GetSection("Google"))`; remove the `IPasswordHasher<Users>` registration (and its now-unused usings). Infrastructure: `services.AddHttpClient<IGoogleAuthClient, GoogleAuthClient>(); services.AddHttpClient<IAvatarStore, BlobAvatarStore>();`.

- [ ] **Step 6: `AuthService.SignInWithGoogleAsync`.** Remove password hasher, `InvalidCredentials`, `NormalizeEmail` use stays for Google email. Inject `IGoogleAuthClient`, `IAvatarStore`, `ILogger<AuthService>`. Logic, in order:
  1. `identity = await _google.ExchangeCodeAsync(...)`; null → `Failure("Google sign-in failed.", ErrorStatus.UnAuthorized)`.
  2. `user = FindOneAsync(u => u.ExternalUid == identity.Subject)`. Null → `new Users { ExternalUid, CurrencyCode = "INR" }` + `AddAsync`. Found but `!Active` → `Failure("This account is disabled.", ErrorStatus.Forbidden)`.
  3. Set `Email = NormalizeEmail(identity.Email)`, `Name = identity.Name?.Trim()`.
  4. If `PictureUrl` not null: `try { user.AvatarPath = await _avatars.CopyFromUrlAsync(user.Id, url, ct); } catch (Exception e) { log warning; }` — must not rethrow.
  5. `UpdatedAtUtc = now`, `UpdatedBy = user.Id`; `IssueSessionAsync`; `SaveChangesAsync`; `Success(session)`.
  Delete `GetSetupStatusAsync`, `RegisterAsync`, `LoginAsync` and the deleted request/validator/DTO files.

- [ ] **Step 7: Migration reset.** Delete all files in `Infrastructure/Persistence/Migrations/`, then:
  `dotnet ef migrations add InitialCreate -p Infrastructure -s Api -o Persistence/Migrations`
  Expected: `users` table has `ExternalUid` with a unique index, `AvatarPath`, no `PasswordHash`, no unique index on `Email`.

- [ ] **Step 8: Build.** `dotnet build Ledger.slnx` → 0 errors (Task 2 not done yet, so `AuthController` will fail to compile; do Step 8 after Task 2 if the executor runs tasks back to back).

### Task 2: Server — endpoints and config

**Files:**
- Modify: `Api/Controllers/AuthController.cs`, `Api/Controllers/ProfileController.cs`, `Core/Features/Profile/Interfaces/IProfileService.cs`, `Core/Features/Profile/Services/ProfileService.cs`, `Api/.env.example`, `compose.yaml`

**Interfaces:**
- Consumes: `IGoogleAuthClient.CreateAuthorizationRequest`, `IAuthService.SignInWithGoogleAsync`, `IAvatarStore.ReadAsync` (Task 1).
- Produces: `GET /api/auth/google`, `GET /api/auth/google/callback`, `GET /api/profile/avatar`; `IProfileService.GetAvatarAsync(CancellationToken ct = default) : Task<Result<AvatarFile>>` with `record AvatarFile(byte[] Content, string ContentType)` in `Core/Features/Profile/Dto/AvatarFile.cs`.

- [ ] **Step 1: `AuthController`.** Remove `Setup`, `Register`, `Login`. Inject `IGoogleAuthClient` and `IConfiguration` (read `Client:BaseUrl` once). Add:
  - `[HttpGet("google")] Google()`: `CreateAuthorizationRequest()`; append cookie `ledger_oauth` = `$"{State}.{CodeVerifier}"` with the options in Global Constraints (`Expires` now + 10 min); `return Redirect(Url)`.
  - `[HttpGet("google/callback")] GoogleCallback(string? code, string? state, string? error, CancellationToken ct)`: read then delete `ledger_oauth` (same path); split on the first `.`; if `error` set, `code`/`state` missing, cookie missing, or state ≠ cookie state → `Redirect($"{baseUrl}/login?error=google")`. Else `SignInWithGoogleAsync(code, verifier)`; failure → same redirect (delete `ledger_refresh` too); success → append `ledger_refresh` exactly as `ToSessionResponse` does today, `Redirect($"{baseUrl}/home")`.
  Keep `Refresh`, `Logout`, `ToSessionResponse`, `CookieOptions` as is (factor the "append refresh cookie" line if both paths need it).

- [ ] **Step 2: Avatar endpoint.** `ProfileService.GetAvatarAsync`: load current user; `AvatarPath` null or `ReadAsync` null → `Failure("No avatar.", ErrorStatus.NotFound)`; else `Success(new AvatarFile(...))`. `ProfileController`: `[HttpGet("avatar")]`; on failure `return result.ToActionResult()`; on success set `Response.Headers.CacheControl = "private, max-age=86400"` and `return File(content, contentType)`.

- [ ] **Step 3: Config.** Append to `Api/.env.example`:
  ```
  Google__ClientId=
  Google__ClientSecret=
  Google__RedirectUri=http://localhost:5106/api/auth/google/callback
  Client__BaseUrl=http://localhost:5173
  ```
  In `compose.yaml` `api.environment` add `Google__ClientId: ${GOOGLE_CLIENT_ID}`, `Google__ClientSecret: ${GOOGLE_CLIENT_SECRET}`, `Google__RedirectUri: http://localhost:5106/api/auth/google/callback`, `Client__BaseUrl: http://localhost:5173`.

- [ ] **Step 4: Build + error-path check.** `dotnet build Ledger.slnx` → 0 errors. Run the API (`dotnet run --project Api`) and `curl -si "http://localhost:5106/api/auth/google/callback?error=access_denied"` → `302` with `Location: http://localhost:5173/login?error=google`. `curl -si http://localhost:5106/api/auth/google` → `302` to `accounts.google.com` with a `Set-Cookie: ledger_oauth=...; samesite=lax`.

### Task 3: Client — login page (design A) and auth cleanup

**Files** (relative to `src/client/src`):
- Delete: `features/auth/components/LoginForm.tsx`, `RegisterForm.tsx`, `AuthField.tsx`, `features/auth/hooks/mutations/useLogin.ts`, `useRegister.ts`, `features/auth/hooks/queries/useSetupStatus.ts`, `features/auth/schemas/auth.schema.ts`, `features/auth/types/auth.types.ts`
- Modify: `features/auth/api/auth.api.ts`, `features/auth/hooks/queries/authKeys.ts`, `features/auth/pages/LoginPage.tsx`, `types/auth.types.ts`
- Create: `features/auth/components/LoginBrandPanel.tsx`, `features/auth/components/GoogleSignInButton.tsx`

**Interfaces:**
- Produces: `AuthUser.avatarUrl: string | null`; `authKeys.avatar(url: string)` = `[...authKeys.all, "avatar", url]` (drop `authKeys.setup`); `auth.api.ts` exports `GOOGLE_SIGN_IN_URL = \`${API_BASE_URL}/auth/google\``, `logout`, `restoreSession`, and `getAvatar(url: string): Promise<string>` (axios GET with `responseType: "blob"`, returns `URL.createObjectURL(blob)`).

- [ ] **Step 1: Cleanup.** Delete the files above; trim `auth.api.ts` to the exports listed; add `avatarUrl` to `AuthUser`.

- [ ] **Step 2: `GoogleSignInButton`.** An `<a href={GOOGLE_SIGN_IN_URL}>` styled as a white pill (border, Google "G" 4-colour SVG from the mockup, label "Continue with Google", full width on mobile). On click set local `pending` state → show `Loader2` spinner, `aria-disabled`, `pointer-events-none` (the page is navigating away).

- [ ] **Step 3: `LoginBrandPanel`.** Always-dark panel (`bg-[#0E1A36] text-white`), `Wallet` logo + "PocketLedger", radial Ocean Blue glow, three glass cards with copy exactly: "Net worth ₹4,82,350", "This month +₹12,400" (green), "Credit card due ₹8,210 · 6 days". Cards `aria-hidden`, slow float via a `@keyframes` added to `index.css`, applied with Tailwind `motion-safe:` so reduced-motion users get static cards. Mobile variant: short top band showing logo + first card only.

- [ ] **Step 4: `LoginPage`.** `isAuthenticated` → `<Navigate to="/home" replace />`. Layout: `lg:grid lg:grid-cols-[55fr_45fr] min-h-svh`; brand panel left (top band below `lg`); right column centred, follows app theme: h1 "Welcome to PocketLedger", copy "Track every account, card and rupee in one place.", `GoogleSignInButton`, then when `useSearchParams().get("error") === "google"` a `role="alert"` line with the Global error copy, then muted "New here? Signing in creates your ledger."

- [ ] **Step 5: Verify.** `npm run build` and `npm run lint` → clean. Grep `src` for `useLogin|useRegister|useSetupStatus|auth.schema|PasswordHash|password` → no hits outside unrelated code.

### Task 4: Client — avatar in the user menu

**Files:** Create `features/auth/hooks/queries/useAvatar.ts`; Modify `features/auth/components/UserMenu.tsx`.

**Interfaces:**
- Consumes: `getAvatar`, `authKeys.avatar`, `AuthUser.avatarUrl` (Task 3).
- Produces: `useAvatar(avatarUrl: string | null): string | undefined` (object URL).

- [ ] **Step 1: `useAvatar`.** `useQuery({ queryKey: authKeys.avatar(avatarUrl ?? ""), queryFn: () => getAvatar(avatarUrl!), enabled: !!avatarUrl, staleTime: Infinity, retry: false })`; return `data`.

- [ ] **Step 2: `UserMenu`.** `UserAvatar` takes `src?: string`; render `<AvatarImage src={src} alt="" />` before the existing `AvatarFallback`. Call `useAvatar(user.avatarUrl)` once in `UserMenu` and pass to both avatar instances.

- [ ] **Step 3: Verify.** `npm run build`, `npm run lint` clean. Review Focus 3: with `avatarUrl: null` no `/profile/avatar` request is made (query disabled).

### Task 5: Reset DB and manual end-to-end

- [ ] **Step 1: Owner setup (ask before running anything destructive).** Owner creates a Google OAuth client (Web), adds redirect URI `http://localhost:5106/api/auth/google/callback`, fills `Google__ClientId`, `Google__ClientSecret`, `Google__RedirectUri`, `Client__BaseUrl` in `src/server/Api/.env`.
- [ ] **Step 2: Wipe Postgres (confirm with owner first).** In `src/server`: `docker compose stop postgres && docker compose rm -f postgres && docker volume rm $(docker volume ls -q | grep postgres-data)` then `docker compose up -d postgres azurite`. Start API → startup migration recreates schema.
- [ ] **Step 3: Run the spec's Verify list** (`spec §Verify` item 3) plus Review Focus 4: after landing on `/home`, the first `POST /api/auth/refresh` in the network tab returns 200 with the cookie sent. If it was not sent, change `ledger_refresh` `SameSite` to `Lax` in `AuthController.CookieOptions` and re-test.
