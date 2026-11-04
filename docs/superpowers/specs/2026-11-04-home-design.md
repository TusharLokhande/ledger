# Home page — design

Date: 2026-11-04 · Status: draft, awaiting approval

## Intent

`/home` is the first screen after login and is currently a `ComingSoonPage` placeholder
(`src/client/src/App.tsx`). Replace it with a one-month summary that answers **"how is this month
going?"** at a glance, and gives a quick way to log a transaction. Reports stays the place for
digging into a period; Home is the glance.

Reference: the owner's prototype `~/Downloads/pocketledger-prototype.html` ("Financial overview"),
adapted as decided below. Chosen layout: mockup **A** in
`.superpowers/brainstorm/264009-1793797616/content/home-layout.html`.

## Goals

- One month at a time, picked with a month picker, defaulting to the current month.
- Top row of four tiles: **Income · Spent · Invested · Savings rate**.
- A chart card with a toggle: **This month** (cumulative spending pace vs a usual month) /
  **12 months** (income vs spent trend). Opens on "This month".
- "Where it went" donut of expense categories beside the chart.
- Recent transactions (5 rows) with "See all" → `/transactions`.
- "+ Add transaction" button opening the existing transaction form.
- Investments are tracked properly: a new **Investment** account type; money moved into it is a
  Transfer, not an Expense.

## Non-goals

- Account balances / net worth (accounts have no opening balance; not this project).
- Budgets (entity exists, no feature yet).
- Filters on the recent-transactions table (prototype's "All accounts" / "Filter" — dropped).
- The prototype's "Total outflow" tile and "Need / Investment" tags — dropped (see Decisions).
- Investment valuations, or redemptions counted as income.
- Restricting Investment accounts to Transfers only. _(Builder's call: left open. A dividend
  credited to an Investment account recorded as Income, or a fee as Expense, is correct money
  in/out; only buying/redeeming must be a Transfer.)_

## Anti-goals

- Home's numbers disagreeing with Reports for the same month. Income, Spent, "usual", categories
  and the 12-month trend must come from the same calculation Reports uses.
- Investing showing up as spending.

## Decisions made with the owner

1. **Investments = Transfer into an Investment account.** Add `AccountType.Investment = 4`. Buying
   an investment moves money between the owner's own accounts, so it is excluded from income/spent
   totals (as all Transfers already are) and never inflates "usual" spending. Redeeming is a
   Transfer back and is not income.
2. **Top row:** Income, Spent, Invested, Savings rate. "Total outflow" (spent + invested) dropped:
   it blurs the one distinction that matters.
3. **Chart:** both views, behind a toggle (layout A). Donut stays beside the chart.
4. **Approach 2:** a dedicated `api/home` endpoint (chosen over extending `POST api/reports`).

## Approaches considered

| # | Approach | Trade-off | Outcome |
|---|----------|-----------|---------|
| 1 | Extend `POST api/reports` with `invested` + daily pace; Home calls it plus transactions search | Smallest diff; Reports carries two unused fields | Not chosen |
| 2 | New `POST api/home` returning exactly what Home renders, built on the report service | One call, Home-shaped DTO; a little more server code | **Chosen by owner** |
| 3 | Compute everything client-side from raw transactions | ~6 months of rows into the browser; numbers drift from Reports | Dropped |

## Design

### Account type (server + client)

- `src/server/Domain/Enums/AccountType.cs`: add `Investment = 4`. Stored as `short`, so **no
  migration**.
- `src/client/src/features/accounts/schemas/account.schema.ts`: add `"Investment"` to
  `accountTypeSchema`.
- `src/client/src/features/accounts/constants/accountTypes.ts`: add `{ value: "Investment",
  label: "Investment" }`.
- `docs/data-model.md`: update the `AccountType` enum row.

### Server: `POST api/home`

New feature folder `Core/Features/Home` (Dto, Interfaces, Requests, Services, Validators) +
`Api/Controllers/HomeController.cs` (`[Authorize]`, `[Route("api/home")]`, same shape as
`ReportsController`). Repository work goes in a new `IHomeRepository` / `HomeRepository` or as
extra methods — builder's call, matching existing patterns.

**Request** `HomeRequest { DateOnly Month; DateOnly AsOf; }` — `Month` is any day in the month
(normalised to the 1st); `AsOf` is the client's local today, as in `ReportRequest`. Validator:
`AsOf` not empty.

**Response** `HomeDto`:

| Field | Source |
|-------|--------|
| `From`, `To`, `UsualWindows`, `Income`, `Expenses`, `UsualIncome`, `UsualExpenses`, `Categories`, `Months` | `IReportService.GetAsync(new ReportRequest { From = month start, To = month end, AsOf = min(request.AsOf, month end) })` — reused as-is so Home matches Reports. Clamping `AsOf` makes the 12-month trend end at the selected month for past months; for the current month it is today; for a future month it stays today (trend ends this month, everything else empty). _(Builder's call.)_ |
| `Invested` | sum of `Transfer` amounts in `From..To` whose **destination** account is `Investment` and whose **source** is not (fund-to-fund switches aren't new money) |
| `InvestedAccounts` | count of distinct destination accounts in that sum (tile subtitle "to N investment accounts") |
| `Pace` | list, one entry per day of the month: `{ Day, Spent?, Usual? }` (cumulative, see below) |
| `Recent` | 5 most recent transactions in the month (all types), ordered by `TransactionDate desc, CreatedAtUtc desc`: id, date, type, amount, category name/icon/color (null for transfers), account name, destination account name, note |

**Pace calculation.**
- `Spent[d]` = cumulative Expense total from the 1st through day `d`; `null` for days after
  `AsOf` (current month) and for every day of a future month.
- `Usual[d]` = average, over the usual windows, of cumulative Expense total from that window's
  start through its `d`-th day. Windows: `ReportWindows.Previous(monthStart, monthEnd, monthEnd, 6)`
  (whole earlier months), keeping only windows starting on/after the first transaction date —
  the same rule `ReportService` uses. For a window shorter than `d` days (e.g. February), use its
  month-end cumulative. `null` everywhere when there are no windows.
- Data via the existing `IReportRepository.DailyTotalsAsync` (already excludes transfers).

### Client: `home` feature

`npm run gen home`, then:

- `api/home.api.ts` → `getHome(request)`; `types/home.types.ts` mirrors `HomeDto`;
  `hooks/queries/homeKeys.ts` + `useHome.ts`.
- `pages/HomePage.tsx` registered at `/home` in `App.tsx` (replaces `ComingSoonPage`).
- **Header:** date line + greeting title (owner request, 2026-11-04): "Good morning / afternoon /
  evening, {first name}" by local hour (<12 morning, <17 afternoon, else evening), first word of
  `authStore.user.name`; no name → greeting without it; month picker (default current month); "+ Add
  transaction" button.
- **Tiles** (use `components/MetricTile`):
  - Income — vs `usualIncome`.
  - Spent — vs `usualExpenses` ("vs usual pace": usual already stops at the same day of month).
  - Invested — subtitle "to N investment accounts"; "Nothing invested yet" at 0.
  - Savings rate — `(income − expenses) ÷ income`, shown as a whole percent; "—" when income is
    0. Can go negative; show it as is.
  - Wording/colour of comparisons follows `features/reports/components/ReportTiles.tsx`.
- **Chart card:** `components/SegmentedControl` with "This month" / "12 months".
  - This month: recharts line chart of `Pace` — solid `Spent`, faded dashed `Usual`, x = day of
    month. Empty state when `usualWindows` is 0 shows only the Spent line plus a note.
  - 12 months: income vs spent from `Months`; reuse the Reports Trends chart if it can be shared
    through `features/reports/index.ts`, otherwise a simple bar chart in the same style.
- **Donut:** reuse Reports' "Where it went" (`WhereItWent` in `OverviewTab.tsx`) by exporting it
  from `features/reports/index.ts`; it takes the categories + expenses.
- **Recent transactions:** compact table — date, category (icon + name, or "A → B" for
  transfers) with note, account, type tag (Income / Expense / Transfer), signed amount. "See all"
  → `/transactions`. Empty state: "No transactions this month."
- **Add transaction:** export `TransactionFormSheet` from `features/transactions/index.ts`; open
  it with no `transaction`. After a save, Home's query must refresh (invalidate `homeKeys.all`
  alongside the existing transaction invalidation — builder picks the cleanest hook point).
- Money formatting via `lib/currency.ts`; loading = skeletons as on Reports; error = the same
  alert block Reports uses.

### Docs

Update `docs/architecture.md` (server features list, client features list) and
`docs/data-model.md` (enum).

## Constraints

- The database is blank (owner, 2026-11-04): no existing investment Expenses to convert. Excel
  import already supports Transfers ("To Account" column), so imported investments work as-is.

- Feature encapsulation: Home imports other features only through their `index.ts`.
- Data flow: `api/` → `hooks/` → page. No server data in zustand.
- No test suites in this repo; verify with `dotnet build`, `npm run build` and `npm run lint`,
  then a manual check in the running app.

## Left to the builder

- Repository placement (new `HomeRepository` vs methods on `ReportRepository`).
- Whether the 12-month chart is shared from Reports or redrawn.
- Exact query-invalidation hook after adding a transaction.
- Month-picker control (a `Select` of recent months, or the existing `DatePicker` in month mode).
- Exact copy for empty states and tile subtitles.
