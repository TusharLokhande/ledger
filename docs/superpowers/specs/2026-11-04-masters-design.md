# Masters: Categories & Accounts (+ user currency) — Design

Date: 2026-11-04

## Intent

Transactions and budgets will point at a **category** and an **account**. Before they can be
built, the owner needs screens to create and maintain both lists. These are the first real
feature screens in Ledger, so they also set the pattern every later list (Merchants, Budgets,
Transactions) will copy: server-side paged table + side-panel form.

Alongside, currency moves from "per account" to "one per user, user-chosen", because the app
is single-currency and every amount should format in the owner's currency.

## Goals

- **Categories** screen: list (server-side paging/sorting/filtering) + add/edit side panel.
  Fields: name, type (Income/Expense), icon (from ~40 curated Lucide icons), color (from ~12
  preset swatches). Archive/restore.
- **Accounts** screen: same shape. Fields: name, type (Bank / Cash / Credit Card), institution
  (optional). Archive/restore.
- **Currency**: one currency per user. Chosen on the create-account screen; changeable later on a
  new **Settings** page. All money formatting uses it.

## Non-goals

- Subcategories (removed from the model).
- Multi-currency, conversion, per-account currency.
- Account balances / opening balance (comes with transactions).
- Hard delete. Lookup/dropdown endpoints for other screens (added when transactions need them).
- Any setting other than currency on the Settings page.

## Anti-goals

- A generic "master" base class/page (owner rejected approach B).
- Changing currency silently: the Settings page must say it only relabels amounts, no conversion.
- Any query that is not scoped to the current user.

## Constraints (existing code)

- Server rules: `src/server/CLAUDE.md` (layers, `Result<T>` → `ToActionResult()`, feature
  checklist, naming, listing endpoints take `PageRequest<TFilter>` and return
  `Result<PageResult<TDto>>`, filtering in the repository via `QueryableFilterExtensions.ApplyFilters`).
- Client rules: `src/client/CLAUDE.md` (`npm run gen <feature>`, api → hooks → components/pages,
  zod as source of truth, react-hook-form, react-query keys per feature, import other features only
  via `index.ts`). The routes live in `App.tsx` (there is no `routes/AppRouter.tsx`); keep them there.
- Existing pieces to use: `DataTable` with `mode="server"` and per-column filter popovers driven by
  `meta.filterVariant` (`text` / `select` with `filterOptions`), `toPageFilters` / `toPageSorting`
  (`components/data-table/server.ts`), `ui/sheet.tsx` (side panel), `ui/select.tsx`,
  `ui/dropdown-menu.tsx`, `ui/input.tsx`, `ui/label.tsx`, `lucide-react`, Mapster.
- Auth exists (`docs/superpowers/specs/2026-11-03-auth-design.md`): `ICurrentUserService.UserId`,
  `AuthUserDto` returned by register/login/refresh and stored in `authStore.user`.
- Enums are `short`-backed, serialized as strings (`JsonStringEnumConverter`).
- No tests in this repo; verify with builds, lint, and a manual run.
- `InitialCreate` is the only migration and has been applied to the local dev DB (tables empty).

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Two independent features per the CLAUDE.md checklist; only shared new piece is a server paging helper. | Categories and Accounts look ~70% alike; each future list can diverge freely. |
| B | Generic `MasterService<T>` / `MasterController<T>` + config-driven `MasterListPage`. | Less code now; abstraction with two users, fights per-feature rule, later masters won't fit. |
| — | Client-side paging | Rejected: owner asked for server-side. |

## Design

### 1. Schema (one migration, `Masters`)

Domain changes:

- `Categories`: **remove** `ParentCategoryId` + `ParentCategory`. **Add** `Icon` (string, max 50,
  required — Lucide icon name in kebab-case, e.g. `shopping-cart`) and `Color` (string, max 7,
  required — `#rrggbb`).
- `Accounts`: **remove** `Currency`. **Change** `AccountType` from `string` to new enum
  `Domain/Enums/AccountType.cs`: `Bank = 1, Cash = 2, CreditCard = 3` (`short`).
- `Users`: **add** `CurrencyCode` (string, max 3, required, DB default `'INR'`).

Indexes (unique, backstop for the service checks below):
- `categories (UserId, CategoryType, Name)`
- `accounts (UserId, Name)`

Migration note: Postgres can't `ALTER` `varchar → smallint` without `USING`. Tables are empty,
so drop the old `AccountType` column and add the new one (edit the generated migration if EF
emits an `AlterColumn`).

### 2. Shared server piece

`Infrastructure/Common/QueryablePagingExtensions.cs` — one extension, e.g.
`ToPageResultAsync<T>(this IQueryable<T> query, int page, int pageSize, CancellationToken)`
returning `PageResult<T>` (count + skip/take; page is 1-based; clamp `pageSize` to 1..100).
Sorting stays per repository (a small whitelist map field → expression, default name asc),
because sortable fields differ per feature.

`QueryableFilterExtensions.ApplyFilters`: the `"select"` variant currently only checks
`stringMap`. Extend it so a `"select"` filter whose field isn't in `stringMap` falls back to
`numberMap` (which already supports enum `eq`). This lets the Type column use the table's normal
select filter against an enum.

### 3. Categories feature (server)

- `Core/Features/Categories/`: `CategoryDto { Id, Name, CategoryType, Icon, Color, Active }`,
  `CreateCategoryRequest { Name, CategoryType, Icon, Color }`, `UpdateCategoryRequest` (same
  fields), `CategoryFilterRequest { Status }` where `Status` is `Active | Archived | All`
  (default `Active`), validators, `ICategoryRepository`, `ICategoryService`/`CategoryService`,
  Mapster mapping.
- `Infrastructure/Persistence/Repository/CategoryRepository.cs` : `Repository<Categories>` —
  `SearchAsync(userId, PageRequest<CategoryFilterRequest>)`: scope by user → status filter →
  `ApplyFilters` (`name` text/ilike, `categoryType` select→enum) → sort (`name`, `categoryType`,
  `createdAtUtc`; default `name` asc) → `ToPageResultAsync`.
- `Api/Controllers/CategoriesController.cs`, route `api/categories`, `[Authorize]`:

| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/categories/search` | `PageRequest<CategoryFilterRequest>` | `PageResult<CategoryDto>` |
| GET | `/categories/{id}` | — | `CategoryDto` |
| POST | `/categories` | `CreateCategoryRequest` | `CategoryDto` |
| PUT | `/categories/{id}` | `UpdateCategoryRequest` | `CategoryDto` |
| POST | `/categories/{id}/archive` | — | `CategoryDto` |
| POST | `/categories/{id}/restore` | — | `CategoryDto` |

Rules:
- Every read/write filters by `ICurrentUserService.UserId`; another user's id → `NotFound`.
- Duplicate name (trimmed, case-insensitive) with the same type for this user, archived rows
  included → `Duplicate` ("A category with this name already exists." — restore it instead).
- Validation: name required, trimmed, max 100; type a defined enum value; icon required, max 50,
  `^[a-z0-9-]+$`; color required, `^#[0-9a-fA-F]{6}$`.
- Set `CreatedBy`/`UpdatedBy`/`UpdatedAtUtc` from the current user / `TimeProvider`.

### 4. Accounts feature (server)

Same shape as Categories:
- `AccountDto { Id, Name, AccountType, Institution, Active }`, create/update requests
  `{ Name, AccountType, Institution? }`, `AccountFilterRequest { Status }`.
- Route `api/accounts`, same six endpoints.
- Duplicate rule: name (trimmed, case-insensitive) per user, archived included.
- Validation: name required, max 100; type defined enum; institution optional, max 100, trimmed,
  empty → null.
- Filters: `name` text, `accountType` select→enum, `institution` text. Sort: `name`,
  `accountType`, `institution`, `createdAtUtc`.

### 5. Currency (server)

- `RegisterRequest` gains `CurrencyCode` (required). `AuthUserDto` gains `CurrencyCode`, so
  register/login/refresh all return it.
- New `PUT api/profile/currency` `{ currencyCode }` (`[Authorize]`) → updated `AuthUserDto`.
  Lives in a small `Profile` feature (`Core/Features/Profile`, `ProfileController`).
- Validation (register and update): `^[A-Z]{3}$` only. The client is the source of the list
  (see §6); a server-side ISO list (`RegionInfo`) would disagree with the browser's
  `Intl.supportedValuesOf("currency")` and reject options the UI offers. A bogus code can only
  come from a hand-crafted request, and `lib/currency.ts` falls back to INR if `Intl` rejects it.

### 6. Client

**Shared**
- `types/auth.types.ts`: `AuthUser` gains `currencyCode`.
- `lib/currency.ts`: read the code from `useAuthStore.getState().user?.currencyCode ?? "INR"` on
  each call; cache one `Intl.NumberFormat` per code (fall back to INR if the constructor throws).
  Minor units per major come from the currency, not a constant:
  `10 ** formatter.resolvedOptions().maximumFractionDigits` (JPY → 1, USD/INR → 100, KWD → 1000).
  Locale stays `en-IN` (lakh grouping). Remove the `ponytail:` hardcode comment.
  How amounts are stored/sent (minor units vs decimal) is still open for the transactions
  design; nothing in this work stores an amount.
- `constants/routes.constants.ts` + `AppSidebar`: nav becomes groups — existing **Menu** (Home)
  and **Masters** (Categories `Tags`, Accounts `Landmark` icons). **Settings** (`Settings` icon)
  in `SidebarFooter`.
- Register form (`features/auth`): add a **Currency** select, default `INR`. Options from
  `Intl.supportedValuesOf("currency")`, labelled with `Intl.DisplayNames` (native, no package).
  The same option builder is reused by Settings — put it in `lib/currency.ts`.

**`features/categories`** (`npm run gen categories`)
- `constants/categoryIcons.ts`: ~40 curated Lucide icons as `{ name: "shopping-cart", icon: ShoppingCart, label: "Shopping" }`
  (groceries, dining, fuel, transport, rent/home, utilities, phone, internet, health, insurance,
  education, shopping, clothing, entertainment, travel, gifts, pets, kids, personal care,
  subscriptions, fitness, taxes, fees, salary, freelance, interest, dividends, refunds, gifts
  received, investments, savings, loan/EMI, credit card bill, cash, misc). Unknown stored name →
  fallback `Circle` icon.
- `constants/categoryColors.ts`: 12 hex swatches readable as a chip background with white icon
  in both themes.
- `CategoriesPage`: page header with **Add category** button, status toggle (Active / Archived /
  All, client state → `customFilter.status`), `DataTable mode="server"`. Columns: icon chip +
  name (text filter, sortable), type badge (select filter Income/Expense, sortable), status, row
  action menu (Edit, Archive/Restore). Row click → edit. Page sizes 10/20/50, default 10.
- `CategoryFormSheet`: `Sheet` from the right; name input, type select, icon grid with a search
  box (filters by label/name), color swatch row; Save/Cancel. Server `Duplicate` /
  validation errors shown on the form. On success: close, toast, invalidate the list query.
- Archive/restore: no confirm dialog (reversible); toast on success.
- Hooks: `useCategories(req)` (search), `useCategory(id)` only if the sheet needs a fresh fetch
  (otherwise edit from the row data — builder's call), `useCreateCategory`, `useUpdateCategory`,
  `useArchiveCategory`, `useRestoreCategory`; `categoryKeys` factory.

**`features/accounts`** (`npm run gen accounts`) — same shape: `AccountsPage`,
`AccountFormSheet` (name, type select Bank/Cash/Credit Card, institution), columns name /
type / institution / status / actions.

**`features/settings`** (`npm run gen settings`) — `SettingsPage` with one **Currency** select
and Save; helper text: "Changing currency only changes how amounts are labelled. Nothing is
converted." On success: `setAuth(accessToken, updatedUser)` so formatting updates immediately.

Routes in `App.tsx` under `RequireAuth` → `RootLayout`: `/categories`, `/accounts`, `/settings`.

### 7. Docs

Update `docs/data-model.md` (remove `ParentCategoryId` and `Accounts.Currency`, add `Icon`,
`Color`, `AccountType` enum, `Users.CurrencyCode`, the unique indexes; drop the
"not mapped yet" status note) and `docs/architecture.md` (current state: new features/routes).

## Decided by the owner

- Two masters: Categories, Accounts; server-side paged table + form.
- No subcategories — remove `ParentCategoryId`.
- Category icon from ~40 curated Lucide icons; color from preset swatches.
- Account type is a fixed dropdown: Bank, Cash, Credit Card.
- Single currency per user, user-defined: chosen at sign-up, changeable later in Settings.
- Add/edit in a side panel.
- Lists as described (columns, filters, status, row menu, page sizes).
- Approach A.

## Calls I made (owner to check)

- Delete = archive (`Active = false`) with restore; archived hidden by default.
- Unique names per user (categories per type), case-insensitive, archived rows count.
- Server checks icon only by format, not against the curated list (client owns the list).
- No confirm dialog for archive (it's reversible).
- Status filter is a toolbar toggle (custom filter), not a column filter.
- Sidebar: "Masters" group; Settings in the sidebar footer.
- Page sizes 10/20/50, default 10.
- Currency list comes from the browser (`Intl`); server only checks the 3-letter format.
- Decimal places follow the currency (JPY 0, INR 2, KWD 3); number grouping stays Indian (`en-IN`).
- Name uniqueness is enforced case-insensitively in the service; the unique DB index is exact-match
  only (a backstop), so a concurrent "Food"/"food" race is accepted.

## Left to the builder

- Exact icon/swatch choices within the brief; badge styling.
- Whether edit refetches by id or uses row data.
- File/class names within the conventions.

## Verify

1. `dotnet build`, `npm run build`, `npm run lint` pass.
2. `Masters` migration applies cleanly on the dev DB.
3. Manual (browser): register with a non-INR currency → the login response and `authStore.user`
   carry it; Settings change persists and updates `authStore.user` without reload (no screen
   shows an amount yet, so check formatting via `formatCurrency` in the console of the dev
   build). Categories: create (icon+color), duplicate name rejected,
   edit, archive hides from Active, restore, filter by name/type, sort, paging past page 1.
   Accounts: same. A second user's ids → 404 (curl with a crafted id).
