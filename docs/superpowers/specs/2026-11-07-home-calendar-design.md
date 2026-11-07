# Home "Day by day" calendar

## Intent
See how much went out and came in on each day of the month at a glance, and jump from a heavy day straight to what was bought.

## Goals
- A full-width **"Day by day"** card on Home, below the Spending pace / Where it went row and above Recent transactions.
- Follows Home's month picker.
- Each day: expense total (red), income total (green, only if any), red shading scaled to that month's biggest spend day. Days after today faded; empty days plain.
- Clicking a day opens Transactions filtered to that single date.

## Non-goals
- No calendar on Reports, no multi-month or arbitrary ranges.
- No per-category breakdown inside a day (the Transactions list covers that).

## Constraints
- Transfers are excluded, same as tiles and Reports, so the calendar's totals match the Income/Spent tiles.
- Hide-income (`usePrivacyStore`) masks the green amounts with `HIDDEN_AMOUNT`.
- Readable at phone width: compact amounts (₹1.8k) on small screens, shading kept. *(my call)*

## Approaches
1. **Month-only Home endpoint** — reuses `DailyTotalsAsync`, sums categories per day in memory. One endpoint, no new query, matches the month picker exactly. Month-only. **Chosen.**
2. Range endpoint under Reports (`from`/`to`) — reusable later, but flexibility nobody asked for; Home would compute bounds.
3. New SQL grouping by date+type only — dropped: existing query already returns what's needed; summing a month's rows is trivial.

## Decided
- **Separate API** (user's ask): `POST /api/home/calendar`, body `{ month }` (first of month, ISO), matching the existing `POST /api/home` convention *(my call on verb/shape)*. Returns one row per day of the month: `{ date, income, expense }`, zeros for empty days *(my call: full month so the client doesn't fill gaps)*. Lives in the Home feature (service method + validator, like `HomeRequest`).
- **Client**: own query hook keyed on month, invalidated alongside `homeKeys.all` (e.g. after "Add transaction"). New `DayByDayCard` in `features/home/components`, built with a plain CSS grid + `date-fns` (no `react-day-picker`). Weeks start Monday *(my call)*.
- **Transactions deep link**: `TransactionsPage` initialises its period from `?from=YYYY-MM-DD&to=YYYY-MM-DD` (sets `period: "custom"`) when present; otherwise unchanged. Calendar cells link to `/transactions?from=D&to=D`.

## Left to the builder
- Exact shading formula and colors (use the existing chart/destructive tokens).
- Loading skeleton and empty-month state.
- Whether the URL stays in sync when the user later changes the period on Transactions (not required).
