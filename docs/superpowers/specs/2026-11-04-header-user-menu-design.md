# Header user menu (avatar dropdown)

## Intent
Put the signed-in user in the header, the way shadcn's account menu does (avatar → dropdown with
name/email and account actions). The theme switch and sign-out move inside it, so the header's
right side becomes a single avatar.

## Goals / non-goals
- Goal: avatar trigger in the header; dropdown with identity, theme choice, Settings, Log out.
- Goal: read user from `authStore` (filled on login/register/refresh) — no extra API call.
- Non-goal: profile photos, "Upgrade/Billing/Notifications" items (no such features exist).
- Non-goal: editing the name (separate Settings work).

## Approaches
1. **DropdownMenu (picked).** Existing `ui/dropdown-menu.tsx`; menu semantics, arrow keys, Escape
   for free; matches shadcn's account menu.
2. Popover with custom layout. More freedom (e.g. icon-button row for theme) but keyboard/a11y
   hand-built and drifts from the reference. Rejected.

## Design
Menu, top to bottom (mirrors the reference screenshot):
1. **Identity row** — avatar + name (bold) + email (muted). Name falls back to email when null.
2. separator
3. **Theme** — radio items Light / Dark / System with Sun / Moon / Monitor icons; current one checked.
   Uses `themeStore` (persistence + system default already work).
4. separator
5. **Settings** — link to `/settings`.
6. separator
7. **Log out** — `useLogout()`; disabled while pending.

Trigger: round avatar button (36px, matches header button height) with `aria-label="Account menu"`.
Initials: first letters of the first two words of the name; else first letter of the email.
Fallback colours: `bg-accent text-accent-foreground` (Ocean Blue soft).
Menu aligned to the trigger's right edge, ~14rem wide.

## Where the code goes (calls made by Claude)
- `features/auth/components/UserMenu.tsx` — references the auth user + logout, so it lives in the
  auth feature and is exported from `features/auth/index.ts`.
- `components/layout/Header.tsx` — replace `ThemeToggle` + `LogoutButton` with `UserMenu`.
- `components/ThemeToggle.tsx` and `features/auth/components/LogoutButton.tsx` become unused →
  deleted (and dropped from the auth barrel).

## Left to the builder
Exact spacing/typography inside the menu, matched to existing dropdown-menu styles.
