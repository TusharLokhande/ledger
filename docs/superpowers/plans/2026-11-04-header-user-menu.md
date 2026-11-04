# Header User Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the header's theme toggle + sign-out buttons with an avatar that opens a shadcn-style account dropdown.

**Architecture:** One new component, `UserMenu`, in the auth feature. It reads the user from `useAuthStore`, theme from `useThemeStore`, and signs out via `useLogout`. `Header` renders it; the two old buttons are deleted.

**Tech Stack:** React 19, radix-ui DropdownMenu (`src/ui/dropdown-menu.tsx`), `src/ui/avatar.tsx`, zustand, lucide-react, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-11-04-header-user-menu-design.md`

## Global Constraints

- No test files in this repo (project rule). Verification = `npm run build` + `npm run lint` in `src/client`, plus a manual check.
- Not a git repository — no commit steps.
- Colours only via tokens (`bg-accent`, `text-accent-foreground`, `text-muted-foreground`, …); no raw hex.
- Feature encapsulation: `Header` imports `UserMenu` from `@/features/auth` only.

## Review Focus

1. `user.name` is `null` (existing account) → identity row shows email once (no blank bold line), initials from email.
2. `user` is `null` momentarily (store cleared during logout) → component renders nothing rather than crashing.
3. Name with one word or extra spaces (`"  tushar  "`) → initials `"T"`, never `"undefined"`.
4. Theme `system` selected → "System" item is checked, and choosing Light/Dark updates `<html class="dark">` immediately (existing `hooks/useAppliedTheme.ts` reacts to `themeStore`).
5. Keyboard: Tab to avatar, Enter opens, arrows move, Escape closes and returns focus to the avatar.

All five are checked manually in Task 2 Step 3 (no test framework in repo).

---

### Task 1: `UserMenu` component

**Files:**
- Create: `src/client/src/features/auth/components/UserMenu.tsx`
- Modify: `src/client/src/features/auth/index.ts` (add `UserMenu` export)

**Interfaces:**
- Consumes: `useAuthStore((s) => s.user): AuthUser | null` (`{ id, email, name: string | null, currencyCode }`); `useThemeStore(): { theme: Theme; setTheme(t: Theme) }` with `Theme = "light" | "dark" | "system"`; `useLogout(): UseMutationResult` (`mutate()`, `isPending`).
- Produces: `export function UserMenu(): JSX.Element | null`.

- [ ] **Step 1: Implement `initials(name: string | null, email: string): string`** (module-private, same file)
  Name → trim, split on whitespace, first letter of first two words, uppercased. Empty/null name → first letter of email, uppercased.

- [ ] **Step 2: Implement `UserMenu`**
  - Return `null` when `user` is null.
  - Trigger: `<DropdownMenuTrigger asChild>` wrapping a `Button variant="ghost" size="icon" className="rounded-full"` with `aria-label="Account menu"`, containing `<Avatar>` + `<AvatarFallback className="bg-accent text-accent-foreground font-medium">{initials}</AvatarFallback>`.
  - `<DropdownMenuContent align="end" className="w-56">`, in order:
    1. `DropdownMenuLabel` (font-normal): Avatar + column of `name ?? email` (font-medium, truncate) and — only when `name` is set — `email` (text-xs muted, truncate).
    2. `DropdownMenuSeparator`
    3. `DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}` with items `light` (Sun, "Light"), `dark` (Moon, "Dark"), `system` (Monitor, "System").
    4. `DropdownMenuSeparator`
    5. `DropdownMenuItem asChild` → `<Link to="/settings">` with Settings icon, "Settings".
    6. `DropdownMenuSeparator`
    7. `DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}` with LogOut icon, "Log out".

- [ ] **Step 3: Export from barrel** — add `export { UserMenu } from "@/features/auth/components/UserMenu";`.

- [ ] **Step 4: Verify** — `cd src/client && npm run build`. Expected: `✓ built`, no TS errors.

### Task 2: Wire into header, remove old buttons

**Files:**
- Modify: `src/client/src/components/layout/Header.tsx` (replace `<ThemeToggle /><LogoutButton />` with `<UserMenu />`; fix imports)
- Delete: `src/client/src/components/ThemeToggle.tsx`, `src/client/src/features/auth/components/LogoutButton.tsx`
- Modify: `src/client/src/features/auth/index.ts` (remove `LogoutButton` export)

**Interfaces:**
- Consumes: `UserMenu` from `@/features/auth` (Task 1).

- [ ] **Step 1: Edit Header, delete files, update barrel** as listed above.

- [ ] **Step 2: Verify** — `cd src/client && npm run build && npm run lint`. Expected: `✓ built`; lint warnings only the four pre-existing ones (button.tsx, use-mobile.ts, DataTable.tsx, sidebar.tsx); `grep -rn "ThemeToggle\|LogoutButton" src` returns nothing.

- [ ] **Step 3: Manual check** (dev server, light and dark) — run through Review Focus 1–5.
