# Home "Day by day" Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full-width "Day by day" card on Home showing each day's income and expense for the picked month, where clicking a day opens Transactions filtered to that date.

**Architecture:** New `POST /api/home/calendar` on the existing `HomeController`/`HomeService`, built from `IReportRepository.DailyTotalsAsync` summed per day. The client gets its own query hook under `homeKeys.all`, plus a `DayByDayCard` drawn with a CSS grid and `date-fns`. `TransactionsPage` reads `?from&to` on first render.

**Tech Stack:** .NET (Core/Api layers, FluentValidation), React 19 + TanStack Query + react-router-dom 7 + date-fns + Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-07-home-calendar-design.md`

## Global Constraints

- Project rules: **no test files** (verify via build/lint) and **no git commits**. These replace the TDD and commit steps.
- Transfers are excluded (already done by `DailyTotalsAsync`).
- Income amounts are masked with `HIDDEN_AMOUNT` when `usePrivacyStore(s => s.hideIncome)` is on.
- The API returns money in major units (decimal). Format it with `money()` from `@/features/reports`.
- Weeks start on Monday.
- Don't use `react-day-picker`, and don't add new dependencies.

## Review Focus

- A month starting on Sunday (Nov 2026) or Monday (Jun 2026), and February (28/29 days). The grid needs the right number of leading blanks and the right day count.
- The picked month is in the future: every day is faded and all zeros, with no crash.
- A month with no spending: the max is 0, so the shading must not divide by zero.
- The `?from=` link is opened while Transactions is already mounted from another nav entry. Initial state must come from the URL on mount.
- Timezone: dates arrive as `yyyy-MM-dd` strings. Parse them with `parseISO` and compare with `format(new Date(), "yyyy-MM-dd")`, not with `new Date(str)`, which is UTC.

Each item is checked by the manual pass in Task 3, Step 4.

---

### Task 1: Backend endpoint

**Files:**
- Create: `src/server/Core/Features/Home/Requests/HomeCalendarRequest.cs`
- Create: `src/server/Core/Features/Home/Validators/HomeCalendarRequestValidator.cs`
- Modify: `src/server/Core/Features/Home/Dto/HomeDto.cs` (add the record)
- Modify: `src/server/Core/Features/Home/Interfaces/IHomeService.cs`
- Modify: `src/server/Core/Features/Home/Services/HomeService.cs`
- Modify: `src/server/Api/Controllers/HomeController.cs`

**Interfaces:**
- Produces: `POST /api/home/calendar`, body `{ "month": "2026-11-01" }`, data `[{ "date": "2026-11-01", "income": 0, "expense": 420.5 }, …]`. One row for every day of the month, in date order.

- [ ] **Step 1:** Add `HomeCalendarRequest { DateOnly Month }` ("any day in the month"), with a validator whose only rule is `RuleFor(x => x.Month).NotEmpty()`. The validator is picked up automatically by `AddValidatorsFromAssembly` and `ValidationFilter`.
- [ ] **Step 2:** Add `public record HomeCalendarDayDto(DateOnly Date, decimal Income, decimal Expense);` in `HomeDto.cs`.
- [ ] **Step 3:** Add `Task<Result<List<HomeCalendarDayDto>>> GetCalendarAsync(HomeCalendarRequest request, CancellationToken cancellationToken = default)` to `IHomeService` and implement it in `HomeService`. Compute the month's start and end the way `GetAsync` does, call `_reportRepository.DailyTotalsAsync(UserId, monthStart, monthEnd, ct)` once, then go through every day of the month and sum `Amount` by `TransactionType.Income` and `Expense`. Days with nothing get zeros. No new DI registration is needed.
- [ ] **Step 4:** In `HomeController`, add `[HttpPost("calendar")] Calendar(HomeCalendarRequest request, CancellationToken ct) => (await _service.GetCalendarAsync(request, ct)).ToActionResult();`
- [ ] **Step 5: Verify:** run `dotnet build src/server/Ledger.slnx`. It should finish with `Build succeeded` and 0 errors.

### Task 2: Transactions deep link

**Files:**
- Modify: `src/client/src/features/transactions/pages/TransactionsPage.tsx:30`

**Interfaces:**
- Produces: `/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD` opens with `period: "custom"` and those dates.

- [ ] **Step 1:** Use `useSearchParams` from `react-router-dom`. Change the `period` initial state to a lazy initializer: when both `from` and `to` params exist, use `{ period: "custom", from, to }`; otherwise keep `{ period: "1", from: null, to: null }`. Don't sync the URL back afterwards; that's out of scope in the spec.
- [ ] **Step 2: Verify:** in `src/client`, run `npm run build && npm run lint`. It should finish with no errors.

### Task 3: Home calendar card

**Files:**
- Modify: `src/client/src/features/home/types/home.types.ts` (add `HomeCalendarDay { date: string; income: number; expense: number }` and `HomeCalendarRequest { month: string }`)
- Modify: `src/client/src/features/home/api/home.api.ts` (add `getHomeCalendar(request): Promise<HomeCalendarDay[]>` that posts to `/home/calendar`)
- Modify: `src/client/src/features/home/hooks/queries/homeKeys.ts` (add `calendar: (month: string) => [...homeKeys.all, "calendar", month] as const`)
- Create: `src/client/src/features/home/hooks/queries/useHomeCalendar.ts` (same options as `useHome`: `keepPreviousData`, `refetchOnMount: "always"`)
- Create: `src/client/src/features/home/components/DayByDayCard.tsx`
- Modify: `src/client/src/features/home/pages/HomePage.tsx` (render `<DayByDayCard month={month} />` between `SpendingChartCard` and `RecentTransactions`)

**Interfaces:**
- Consumes: the Task 1 endpoint and the Task 2 URL.
- Produces: `DayByDayCard({ month }: { month: string })`, where `month` is the first of the month as an ISO date (Home's existing state). It loads its own data. The existing `homeKeys.all` invalidation after "Add transaction" also refreshes it.

- [ ] **Step 1:** Add the types, the API function, the key and the hook as listed.
- [ ] **Step 2:** Build `DayByDayCard` with `SectionCard title="Day by day"` and `SectionError` + `refetch` on error. While loading, show a `Skeleton` about `h-64`. Layout:
  - a 7-column grid, with weekday headers Mon–Sun
  - leading blanks = `(getDay(monthStart) + 6) % 7`
  - each day is a `Link` to `/transactions?from=${date}&to=${date}` with an `aria-label` like "4 Nov: spent ₹1,850, earned ₹0"
  - the day number, then the expense in `text-destructive` when > 0, then the income in green (use the existing success/positive token if there is one, else `text-emerald-600`) when > 0, masked with `HIDDEN_AMOUNT` when `hideIncome` is on
  - background is the destructive color at an opacity of `expense / maxExpense`, clamped to 0.08–0.45, and none when the expense is 0 or the month's max is 0
  - days after today (string compare against `format(new Date(), "yyyy-MM-dd")`) get `opacity-40`
  - below `sm`, amounts use compact notation (`Intl.NumberFormat("en-IN", { notation: "compact", style: "currency", currency })`, with the currency code read the same way `lib/currency.ts` does); `money()` from `sm` up. If that needs a helper, add `compactMoney(major: number)` next to `money` in `reportMath.ts` and export it.
- [ ] **Step 3: Verify:** in `src/client`, run `npm run build && npm run lint`. It should finish with no errors.
- [ ] **Step 4: Manual check** (both servers running locally): go through each Review Focus item. Look at Nov 2026 and Feb 2027 grids, a future month, and an empty month. Clicking a day should land on Transactions with that single date, and the list total should equal the cell. Toggle hide-income and check a 375px-wide viewport.
