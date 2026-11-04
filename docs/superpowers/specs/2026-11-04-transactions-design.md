# Transactions + Excel Bulk Import — Design

Date: 2026-11-04

## Intent

Ledger exists to record where the owner's money goes. Categories and Accounts are built; this adds
the transactions that reference them. The owner enters day-to-day transactions through a form and
brings in batches through an Excel template that Ledger generates. Bank-statement import is
deliberately out: UPI narrations are hard to categorise and every bank has its own format.

## Goals

- **Transactions screen:** period picker (default this month), summary (Income · Expenses · Net,
  each vs the previous like-for-like period), server-paged table, add/edit side panel, delete.
- **Bulk Import screen:** download a template with dropdowns pre-filled from the owner's masters,
  upload it, process it in a background job, and see an import history with status. A failed import
  inserts nothing and offers the uploaded file back with failing rows marked red and an Errors column.

## Non-goals

- Bank-statement import (parsing, column mapping, categorisation rules) — later, maybe.
- Merchants / payees (removed from the model).
- Updating or de-duplicating via import — import is **insert-only**, no duplicate checks.
- Account balances, budgets, recurring transactions, export to Excel.
- Deleting import history or cleaning up stored files.

## Anti-goals

- Partial imports. An upload either inserts every row or none.
- Transfers counted as income or spending.
- Comparing a partial current period against a full previous one (e.g. 1–4 Nov vs all of October).

## Constraints (existing code)

- Rules in `src/server/CLAUDE.md` and `src/client/CLAUDE.md`; the Categories/Accounts features are
  the pattern to copy (search endpoint with `PageRequest<TFilter>`, `ToPageResultAsync`,
  `ApplyFilters`, side-panel form keyed per open, `DataTable mode="server"` with sticky header,
  page padding `px-8 py-6`, full width).
- Per-user scoping on every query; archive (not delete) for masters; `TransactionsConfiguration`
  already uses `Restrict` deletes on account/category FKs.
- Money formatting: `lib/currency.ts` (`formatCurrency` takes **minor units**; minor units per major
  come from the currency).
- `BlobServiceClient` is registered (`ConnectionStrings:BlobStorage`; dev = Azurite via
  `UseDevelopmentStorage=true`, compose service `azurite`).
- `PeriodRangePicker` + `resolvePeriodRange` exist ("This month" = 1st..last day of the month;
  "Last N months" = N calendar months ending with the current one; or custom from/to).
- No tests (owner preference); verify with builds, lint, curl, browser.
- New packages approved by the owner: **EPPlus** (Excel), **Hangfire** + **Hangfire.PostgreSql**
  (background jobs). EPPlus is used under its non-commercial **personal** license (owner's app is
  personal); licence set in code at startup.

## Approaches considered

Decided by the owner during design: EPPlus (over ClosedXML), Hangfire on Postgres (over
in-process queue / Quartz / a message broker, and over synchronous processing), a separate Bulk
Import screen. The remaining fork was where files live while jobs run:

| | Approach | Trade-off |
|---|---|---|
| A | Files as bytes in `import_batches` | One store, no drift, no orphans; files in DB |
| **B (chosen)** | Files in Azure Blob Storage, names on `import_batches` | Standard file store, uses existing client; two systems can drift (status without file), Azurite must run |
| — | Local disk | Rejected: not container/restart safe |

## Design

### 1. Schema (migration `Transactions`)

`Transactions`:
- **Remove** `MerchantId`/`Merchant`, `RelatedTransactionId`/`RelatedTransaction`.
- `CategoryId` becomes **nullable** (null exactly when `TransactionType == Transfer`).
- `DestinationAccountId` stays (set exactly when `Transfer`).
- `Amount` precision **(18, 4)**; always > 0. Direction comes from the type.
- `ImportBatchId` stays; set on rows inserted by an import.

**Remove** the `Merchants` entity, configuration and table.

`ImportBatches`:
- `Status` becomes enum `ImportStatus : short { Queued = 1, Processing = 2, Succeeded = 3, Failed = 4 }`.
- Add `SourceBlobName` (string, required), `ErrorBlobName` (string?), `RowCount` (int?),
  `ImportedCount` (int?), `ErrorCount` (int?), `Message` (string?, max 500), `CompletedAtUtc` (DateTime?).

Tables are empty, so drop/re-add columns where EF emits a cast it can't do (as in `Masters`).

### 2. Transactions API (`api/transactions`, `[Authorize]`)

| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/transactions/search` | `PageRequest<TransactionFilterRequest>` | `PageResult<TransactionDto>` |
| POST | `/transactions/summary` | `TransactionSummaryRequest` | `TransactionSummaryDto` |
| GET | `/transactions/{id}` | — | `TransactionDto` |
| POST | `/transactions` | `SaveTransactionRequest` | `TransactionDto` |
| PUT | `/transactions/{id}` | `SaveTransactionRequest` | `TransactionDto` |
| DELETE | `/transactions/{id}` | — | `bool` |

- `TransactionDto { id, transactionDate, transactionType, amount, accountId, accountName,
  toAccountId?, toAccountName?, categoryId?, categoryName?, categoryIcon?, categoryColor?, note? }`.
- `SaveTransactionRequest { transactionDate, transactionType, amount, accountId, toAccountId?, categoryId?, note? }`.
- `TransactionFilterRequest { from: DateOnly, to: DateOnly }` (inclusive).
- Column filters (field ids = client column ids): `transactionType` (select→enum),
  `accountId` (select; matches `AccountId` **or** `DestinationAccountId` — custom, not `ApplyFilters`),
  `categoryId` (select), `note` (text/ilike), `amount` (number). Sort: `transactionDate` (default
  desc, tiebreak `CreatedAtUtc` desc then `Id`), `amount`.

**Summary:** `TransactionSummaryRequest { from, to, asOf, filters }` — same filters as search,
`asOf` = the client's local today (avoids UTC/IST day mismatch). Returns
`{ income, expenses, net, previous: { income, expenses, net }, previousFrom, previousTo }`;
transfers excluded from all figures. Windows:
- Effective end = `min(to, asOf)`. **Current figures cover `from..effectiveEnd`** (future-dated rows
  are not counted), so both sides of the comparison cover the same span.
- If `from > asOf` (a range wholly in the future): current = `from..to`, `previous` = null (UI shows "—").
- If `from` is the 1st of a month and `to` is the last day of a month (a whole-month range of N
  months): previous = both ends shifted back N months (`from - N months` .. `effectiveEnd - N months`,
  clamped to month end). E.g. this month on 4 Nov → 1–4 Oct; October → September.
- Otherwise: the same number of days as `from..effectiveEnd`, immediately before `from`.
- Percent change is computed on the client; previous = 0 → show "—".

**Validation (server, form and import share it):**
- `transactionDate` required. `amount` > 0, ≤ 999,999,999,999, with **at most the user's currency's
  decimal places**. The server keeps a small static table of ISO 4217 exceptions
  (0: BIF CLP DJF GNF ISK JPY KMF KRW PYG RWF UGX UYI VND VUV XAF XOF XPF; 3: BHD IQD JOD KWD LYD OMR TND;
  4: CLF UYW); every other code = 2. Validation loads the user's `CurrencyCode` (services take `userId`).
- `transactionType` defined.
- Income/Expense: `categoryId` required, must be the owner's **active** category of the **same type**;
  `toAccountId` must be null.
- Transfer: `toAccountId` required, owner's active account, ≠ `accountId`; `categoryId` must be null.
- `accountId` required, owner's active account.
- Editing: an account/category that is now archived is still accepted **if unchanged** from the
  stored value (so old transactions stay editable).
- `note` ≤ 500, trimmed, blank → null.

**Lookups** for dropdowns (form, filters, template): `GET api/accounts/options` and
`GET api/categories/options` → active rows only (`{ id, name, accountType }`,
`{ id, name, categoryType, icon, color }`), sorted by name.

### 3. Bulk import (`api/imports`, `[Authorize]`)

| Method | Path | Result |
|---|---|---|
| GET | `/imports/template` | `.xlsx` file (generated per user) |
| POST | `/imports` (multipart `file`) | `ImportBatchDto` (status `Queued`) |
| GET | `/imports` | `ImportBatchDto[]` newest first (last 50) |
| GET | `/imports/{id}/errors` | the red-marked `.xlsx`, only when `Failed` with an error file |

`ImportBatchDto { id, fileName, status, rowCount?, importedCount?, errorCount?, message?, createdAtUtc, completedAtUtc?, hasErrorFile }`.

**Template** (sheet `Transactions`, plus a hidden sheet `Lists`):
- Columns, in order: **Date** · **Type** · **Amount** · **Account** · **To Account** · **Category** · **Note**.
- Header row bold and frozen; an instructions note in the header comments (transfers: fill To Account,
  leave Category blank).
- Data validation on rows 2–5001: Type → `Expense, Income, Transfer`; Account and To Account → active
  account names; Category → active category names (distinct); Date → date; Amount → decimal > 0.
  Lists live on `Lists` so long lists work.

**Upload (request):** accept `.xlsx` only, ≤ 5 MB. Store at blob `imports/{userId}/{batchId}/source.xlsx`
(container `imports`, created if missing), insert `ImportBatches` row (`Queued`), enqueue the
Hangfire job with `(batchId, userId)`, return the DTO.

**Job:**
1. Mark `Processing`. Read the first worksheet; header row must match the template columns
   (case-insensitive, trimmed); else fail with message "This isn't the Ledger template".
2. Skip fully empty rows. More than 5,000 data rows → fail with a message, no error file.
3. Dates: a real Excel date cell is used as-is. Text is accepted only as `yyyy-MM-dd`, `dd/MM/yyyy`
   or `dd-MM-yyyy` (day first, Indian convention); anything else is a row error
   ("Date '11/04/26' isn't a valid date — use the template's date format"). Amounts: numeric cells,
   or text parseable as an invariant-culture number (commas stripped).
   Validate every row with the rules in §2, resolving names case-insensitively/trimmed:
   Account/To Account → active accounts by name; Category → active category by name **and** the row's
   Type (a name can exist as both Income and Expense). Collect all errors per row; don't stop early.
4. Any errors → write the error file: the **uploaded workbook** with each failing row filled red,
   each failing cell given a dark-red border, and an `Errors` column appended (header + one message
   per failing row, `; `-separated). Upload to `imports/{userId}/{batchId}/errors.xlsx`; mark
   `Failed` with counts. Nothing inserted.
5. No errors → insert all rows in one DB transaction with `ImportBatchId` set; mark `Succeeded`
   with `ImportedCount`. Zero data rows → `Failed`, "The file has no transactions".
6. Unexpected exception → mark `Failed` with "Import failed unexpectedly. Try again." and log it.
   Hangfire automatic retries **off** for this job (state is recorded on the batch; the owner re-uploads).
- The job runs without an HTTP user: services take `userId` explicitly.
- An `Errors` column in an uploaded file is ignored.

**Hangfire:** storage `Hangfire.PostgreSql` on the same connection string (its own schema `hangfire`),
server in-process in the API. The dashboard is **not** exposed.

### 4. Client

- Nav: Menu → Home, **Transactions**, **Import**.
- `features/transactions`:
  - `TransactionsPage` — header (title, **Add transaction**, link to Import), toolbar with
    `PeriodRangePicker`, summary cards (Income, Expenses, Net, each with ▲/▼ % vs previous and the
    previous range as a tooltip), `DataTable`. Changing period/filters/sort/page size → page 1;
    past-the-end page steps back (same as Categories).
  - Columns: Date · Type badge · Category chip (blank for transfers) · Account ("HDFC → Amex" for
    transfers) · Note (truncated) · Amount (right-aligned, `formatCurrency`; income green, transfer muted)
    · row menu (Edit, Delete with confirmation via `ui/dialog`).
  - `TransactionFormSheet` — Date (`components/DatePicker`, default today), Type (`SegmentedControl`,
    default Expense), Amount (decimal input, max decimals = currency's), Account / From account,
    To account (Transfer only), Category (select with icon chip, filtered by type; hidden for Transfer),
    Note. Buttons: **Save**, **Save & add another** (keeps date, type, account; clears amount,
    category, note; focuses amount).
  - Amounts travel to/from the API as **decimal major units**; the form uses major units; display
    converts with `toMinorUnits` for `formatCurrency`.
- `features/imports`: `ImportPage` — **Download template**, upload drop zone (`.xlsx`), history table
  (date, file, status badge, imported/error counts, message, **Download errors**). While any batch is
  Queued/Processing, refetch every 2 s; on transition to Succeeded, invalidate transaction queries and
  toast "Imported N transactions"; on Failed, toast the message.

### 5. Docs

Update `docs/data-model.md` (transactions changes, Merchants removed, ImportBatches, ImportStatus) and
`docs/architecture.md` (Hangfire, blob container, new features/routes).

## Decided by the owner

- Entry via form and via an Excel template Ledger generates (dropdowns from masters/enums); no bank statements.
- Import validates masters/enums; **insert-only**, no duplicate checks; **all or nothing**.
- Failed import returns the file with failing rows red.
- EPPlus + Hangfire; a separate Bulk Import screen; files in Blob Storage.
- Transfers: one row, from/to accounts, no category, excluded from income/expense totals.
- No merchant/payee.
- Form fields and behaviour as listed; list screen as listed; summary vs previous period compared
  like-for-like; summary follows filters.

## Calls I made (owner to check)

- Amount precision (18,4); form **and server** limit decimals to the currency's (static ISO 4217 exception table on the server).
- Summary current figures stop at today (`min(to, asOf)`) so both windows match; future-only range → no comparison.
- Import dates: real date cells, or text as `yyyy-MM-dd` / `dd/MM/yyyy` / `dd-MM-yyyy` (day first); anything else is a row error.
- `RelatedTransactionId` and the Merchants table removed.
- Real delete for transactions (with confirmation); archived masters still accepted on edit if unchanged.
- Lookup endpoints for active accounts/categories.
- `asOf` from the client for the summary window.
- Template: 7 columns, data validation on 5,000 rows, lists on a hidden sheet; category matched by name + type.
- Upload limits: `.xlsx`, 5 MB, 5,000 rows.
- Hangfire retries off for the import job; dashboard not exposed; import history shows the last 50.
- No cleanup of stored files; no deleting import batches.
- Nav: Transactions and Import under Menu.

## Left to the builder

- Exact styling of summary cards and badges; EPPlus API details; class/file names within conventions.
- Whether `TransactionDto` is projected in the query or mapped after.

## Verify

1. `dotnet build`, `npm run build`, `npm run lint` clean; `Transactions` migration applies; Hangfire
   schema created on startup; Azurite running (`docker compose up -d azurite`).
2. curl: create income/expense/transfer; invalid combos rejected (transfer with category, same
   from/to, category of wrong type, archived account); search filters incl. account matching either
   side; summary for "this month" on a mid-month `asOf` returns previous = same days last month.
3. Browser: add via form incl. Save & add another; edit; delete; summary changes with filters.
   Import: download template (dropdowns present), upload a valid file → Succeeded, rows appear; upload
   a file with errors → Failed, nothing inserted, error file has red rows + Errors column; non-template
   file → Failed with message.
