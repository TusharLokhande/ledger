# Transactions + Excel Bulk Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transactions screen (period summary vs previous, server-paged table, side-panel form) and a Bulk Import screen (generated Excel template, Hangfire-processed all-or-nothing import, red-marked error file).

**Architecture:** One shared transaction validator in Core used by both the form endpoints and the import job; the import job runs in Hangfire (Postgres storage) and moves files through Azure Blob Storage; Excel via EPPlus. Client adds `features/transactions` and `features/imports` following the Categories pattern.

**Tech Stack:** .NET 10, EF Core + Npgsql, FluentValidation, Mapster, **Hangfire + Hangfire.PostgreSql**, **EPPlus**, Azure.Storage.Blobs; React 19, react-query, react-hook-form + zod, `DataTable`.

**Spec:** `docs/superpowers/specs/2026-11-04-transactions-design.md`

## Global Constraints

- No test files (owner preference); verify with `dotnet build src/server/Ledger.slnx`, `npm run build` + `npm run lint` in `src/client`, curl, browser. Not a git repo: no commits.
- Every query and write scoped to the user (`ICurrentUserService.UserId` in requests; explicit `userId` in the job).
- Services return `Result<T>`; controllers thin; enums serialized as strings.
- List pages: `flex min-h-0 w-full flex-1 flex-col px-8 py-6`, `DataTable mode="server"`, page reset on filter/sort/size, past-the-end step back, form sheet keyed per open (`sheet.version`) — copy `CategoriesPage`.
- Limits: `.xlsx` only, ≤ 5 MB, ≤ 5,000 data rows; note ≤ 500; amount > 0, ≤ 999,999,999,999, ≤ currency decimals.
- Template columns, in order: `Date, Type, Amount, Account, To Account, Category, Note`; type values `Expense, Income, Transfer`.
- Blob container `imports`; names `{userId}/{batchId}/source.xlsx`, `{userId}/{batchId}/errors.xlsx`.
- Messages verbatim: "This isn't the Ledger template", "The file has no transactions", "Import failed unexpectedly. Try again."
- Hangfire dashboard not mapped; import job `[AutomaticRetry(Attempts = 0)]`.
- EPPlus licence: `ExcelPackage.License.SetNonCommercialPersonal("<owner name>")` (EPPlus 8) at startup — use the account email's local part if no name is known; ledger it as a ruling.

## Review Focus

1. Transfer edited into Expense (or back): category/to-account must flip correctly; server rejects leftover to-account/category. → Task 3 step 3.
2. Summary on 4 Nov for "This month": current excludes a transaction dated 20 Nov; previous = 1–4 Oct. → Task 3 step 4.
3. Import with a category name that exists as both Income and Expense resolves by the row's Type; wrong pairing errors. → Task 5 step 3.
4. Text date `04/11/2026` imports as 4 Nov; `11/04/26` is a row error. → Task 5 step 3.
5. A Failed import inserts nothing even when 199 of 200 rows are valid. → Task 5 step 3.

---

### Task 1: Schema + `Transactions` migration

**Files:** `Domain/Entity/{Transactions,ImportBatches}.cs`, delete `Domain/Entity/Merchants.cs` + `Infrastructure/Persistence/Configurations/MerchantsConfiguration.cs`, create `Domain/Enums/ImportStatus.cs`, modify `TransactionsConfiguration.cs`, `ImportBatchesConfiguration.cs`, `AppDbContext.cs`; migration `Transactions`.

**Produces:** `Transactions.CategoryId : Guid?`, no Merchant/RelatedTransaction; `Amount` precision (18,4); `enum ImportStatus : short { Queued = 1, Processing = 2, Succeeded = 3, Failed = 4 }`; `ImportBatches { FileName, Status: ImportStatus, SourceBlobName, ErrorBlobName?, RowCount?, ImportedCount?, ErrorCount?, Message? (500), CompletedAtUtc? }`.

- [ ] Step 1: Edit entities/configs; `dotnet ef migrations add Transactions -p ../Infrastructure -s . -o Persistence/Migrations` from `Api`.
- [ ] Step 2: Replace any `AlterColumn` string→short on `import_batches.Status` with drop + add (tables empty).
- [ ] Step 3: Build; start API → "Applying migration '…_Transactions'"; `\d transactions` shows nullable `CategoryId`, `numeric(18,4)`, no `MerchantId`/`RelatedTransactionId`; `merchants` table gone.

### Task 2: Currency decimals + lookup endpoints

**Files:** create `Core/Common/CurrencyDecimals.cs`; modify Categories/Accounts service+repo+controller; DTOs `CategoryOptionDto`, `AccountOptionDto`.

**Produces:**
- `static int CurrencyDecimals.For(string currencyCode)` — 0 for `BIF CLP DJF GNF ISK JPY KMF KRW PYG RWF UGX UYI VND VUV XAF XOF XPF`, 3 for `BHD IQD JOD KWD LYD OMR TND`, 4 for `CLF UYW`, else 2.
- `GET api/categories/options` → `CategoryOptionDto { id, name, categoryType, icon, color }[]`; `GET api/accounts/options` → `AccountOptionDto { id, name, accountType }[]` — active only, name asc.

- [ ] Step 1: Implement. Step 2: build; curl both → only active rows, sorted.

### Task 3: Transactions API

**Files:** `Core/Features/Transactions/{Dto/TransactionDto,Dto/TransactionSummaryDto,Requests/SaveTransactionRequest,Requests/TransactionFilterRequest,Requests/TransactionSummaryRequest,Interfaces/ITransactionRepository,Interfaces/ITransactionService,Interfaces/ITransactionRules,Services/TransactionService,Services/TransactionRules,Services/SummaryWindow}.cs`, `Infrastructure/Persistence/Repository/TransactionRepository.cs`, `Api/Controllers/TransactionsController.cs`, DI.

**Interfaces:**
- `ITransactionRules.ValidateAsync(Guid userId, SaveTransactionRequest request, Transactions? existing, CancellationToken) : Task<Dictionary<string,string[]>>` (empty = valid; keys = request property names in camelCase). Loads the user's currency, active accounts/categories. Used by Task 5 per row.
- `SummaryWindow.Compute(DateOnly from, DateOnly to, DateOnly asOf) : (DateOnly CurFrom, DateOnly CurTo, DateOnly? PrevFrom, DateOnly? PrevTo)` — rules from spec §2.
- `ITransactionRepository.SearchAsync(Guid userId, PageRequest<TransactionFilterRequest>, CancellationToken) : Task<PageResult<TransactionDto>>` (projected with joins); `SumAsync(Guid userId, DateOnly from, DateOnly to, IEnumerable<PageFilter> filters, CancellationToken) : Task<(decimal Income, decimal Expenses)>`.
- `TransactionSummaryDto { income, expenses, net, previous: { income, expenses, net }?, previousFrom?, previousTo? }`.
- Endpoints per spec §2. Validation failures → `Result.ValidationFailure`.

- [ ] Step 1: Implement. Filters: `transactionType` (enum via numberMap), `categoryId`, `accountId` (from **or** to — apply manually before `ApplyFilters`), `note` ilike, `amount` number.
- [ ] Step 2: Build.
- [ ] Step 3: curl — create Expense/Income/Transfer → 200; Transfer with categoryId → 400 `categoryId`; Transfer same from/to → 400; Expense with an Income category → 400; archived account on create → 400; edit Transfer→Expense with category and no toAccountId → 200; amount `10.555` with INR → 400; JPY user `10.5` → 400.
- [ ] Step 4: curl summary `{from:"2026-11-01",to:"2026-11-30",asOf:"2026-11-04"}` with rows on 2 Nov, 20 Nov and 3 Oct → current excludes 20 Nov, previous = 2026-10-01..2026-10-04 includes 3 Oct; transfers excluded; custom range 2026-11-10..2026-11-14 with asOf 2026-11-30 → previous 2026-11-05..2026-11-09; from after asOf → previous null. Search account filter returns transfers where the account is the destination.

### Task 4: Hangfire, EPPlus, blob store, import endpoints (no job logic)

**Files:** `Api.csproj`/`Infrastructure.csproj` packages; `Core/Features/Imports/{Dto/ImportBatchDto,Interfaces/IImportService,Interfaces/IFileStore,Interfaces/IImportJobQueue,Interfaces/IImportTemplateBuilder,Services/ImportService}.cs`; `Infrastructure/Storage/BlobFileStore.cs`; `Infrastructure/Imports/{HangfireImportJobQueue,ImportTemplateBuilder}.cs`; `Api/Controllers/ImportsController.cs`; `Program.cs` (Hangfire server, EPPlus licence, form size limit).

**Interfaces:**
- `IFileStore { Task UploadAsync(string name, Stream content, CancellationToken); Task<Stream?> OpenReadAsync(string name, CancellationToken); }` (container `imports`, created if missing).
- `IImportJobQueue.Enqueue(Guid batchId, Guid userId)`; job entry point `ImportJob.RunAsync(Guid batchId, Guid userId)` (Task 5).
- `IImportTemplateBuilder.BuildAsync(Guid userId, CancellationToken) : Task<byte[]>`.
- Endpoints per spec §3; upload rejects non-`.xlsx` / > 5 MB with `ValidationFailure` on `file`.

- [ ] Step 1: Implement. Template: sheet `Transactions` (bold frozen header, column widths, date format `dd-mm-yyyy` on A), hidden sheet `Lists` (types, account names, distinct category names), list validations on rows 2–5001, decimal > 0 on Amount, date validation on Date.
- [ ] Step 2: Build; `docker compose up -d azurite`; start API → `hangfire` schema created.
- [ ] Step 3: curl template → valid `.xlsx` (open with python `zipfile` or `openpyxl` if present; check `dataValidation` in sheet XML); upload a `.txt` → 400; upload template → `Queued` batch listed by `GET /imports`; blob exists.

### Task 5: Import job

**Files:** `Infrastructure/Imports/ImportJob.cs`, `Infrastructure/Imports/ImportRowReader.cs` (parsing), DI.

**Interfaces:** consumes `ITransactionRules`, `IFileStore`; writes `ImportBatches`.

- [ ] Step 1: Implement per spec §3 job steps 1–6 (header check, empty-row skip, 5,000 cap, date/amount parsing, per-row validation via `ITransactionRules` after name resolution, error workbook = uploaded workbook + red fill `#F8D7DA` on failing rows + dark-red border on failing cells + appended `Errors` column, single DB transaction insert with `ImportBatchId`).
- [ ] Step 2: Build; restart API.
- [ ] Step 3: Generate test workbooks with a small Python/openpyxl script in the scratchpad (or EPPlus via `dotnet script` if no openpyxl), upload via curl, poll `GET /imports`:
  - valid 3 rows (incl. transfer, text date `04/11/2026`) → `Succeeded`, 3 rows with `importedCount 3`, dated 2026-11-04.
  - 200 rows where 1 has category `Dinning` → `Failed`, `errorCount 1`, transactions count unchanged; `/errors` downloads; red row + `Errors` column present.
  - `Food` as Expense row and `Salary` as Expense row (Salary only Income) → second errors.
  - date `11/04/26` → row error.
  - wrong headers → `Failed`, "This isn't the Ledger template", no error file.

### Task 6: Client — Transactions feature

**Files (via `npm run gen transactions`):** api, `hooks/queries/{transactionKeys,useTransactions,useTransactionSummary,useAccountOptions,useCategoryOptions}`, mutations (create/update/delete), schemas, types, `components/{TransactionFormSheet,transactionColumns,SummaryCards,CategorySelect,AccountSelect}`, `pages/TransactionsPage`, `index.ts`; `App.tsx` route `/transactions`; nav item.

**Interfaces:** consumes Task 2/3 endpoints. Amounts in major units over the API; display `formatCurrency(toMinorUnits(amount))`. Form amount step from `getCurrencyDecimals()` exported from `lib/currency.ts` (`resolvedOptions().maximumFractionDigits`).

- [ ] Step 1: Implement per spec §4 (Save & add another keeps date/type/account, focuses amount; delete via `ui/dialog` confirm; summary cards show ▲/▼ % with previous range tooltip, "—" when previous is 0/null; period state via `PeriodRangePicker`, `asOf` = local today).
- [ ] Step 2: build + lint clean.

### Task 7: Client — Imports feature + nav

**Files (via `npm run gen imports`):** api (`downloadTemplate`, `uploadImport`, `getImports`, `downloadErrors` — blobs via `responseType: "blob"`), hooks, `pages/ImportPage`, `index.ts`; route `/import`; nav: Menu → Home, Transactions, Import.

- [ ] Step 1: Implement: template button, drop zone (`<input type="file" accept=".xlsx">` + drag/drop), history table, `refetchInterval` 2000 while any Queued/Processing; on transition → Succeeded: toast "Imported N transactions" + invalidate `transactionKeys.all`; → Failed: toast message.
- [ ] Step 2: build + lint clean.
- [ ] Step 3: Browser (Tasks 6+7): add Expense/Income/Transfer via form incl. Save & add another; edit; delete; summary changes with account filter; download template; upload valid → rows appear; upload invalid → Failed + Download errors works.

### Task 8: Docs

- [ ] `docs/data-model.md` (Transactions changes, Merchants removed, ImportBatches, ImportStatus) and `docs/architecture.md` (Hangfire, blob container, EPPlus licence, new routes/features).
