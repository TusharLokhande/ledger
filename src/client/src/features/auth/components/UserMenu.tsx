import { Link } from "react-router-dom";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore, type Theme } from "@/store/themeStore";
import { useLogout } from "@/features/auth/hooks/mutations/useLogout";
import { useAvatar } from "@/features/auth/hooks/queries/useAvatar";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/** First letters of the first two words of the name; falls back to the email's first letter. */
function initials(name: string | null, email: string): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return email.charAt(0).toUpperCase();
  return words.slice(0, 2).map((w) => w.charAt(0)).join("").toUpperCase();
}

function UserAvatar({ text, src }: { text: string; src?: string }) {
  return (
    <Avatar>
      <AvatarImage src={src} alt="" />
      <AvatarFallback className="bg-accent font-medium text-accent-foreground">{text}</AvatarFallback>
    </Avatar>
  );
}

/** Header account menu: identity, theme choice, settings and sign-out. */
export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
  const logout = useLogout();
  const avatarSrc = useAvatar(user?.avatarUrl ?? null);

  if (!user) return null;
  const name = user.name?.trim() || null;
  const text = initials(name, user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <UserAvatar text={text} src={avatarSrc} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2 py-1.5 font-normal">
          <UserAvatar text={text} src={avatarSrc} />
          <span className="grid min-w-0 text-left">
            <span className="truncate text-sm font-medium text-foreground">{name ?? user.email}</span>
            {name && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-1.5 py-1 text-sm">
          <span>Theme</span>
          {/* Icon segments are real menu radio items, so arrow keys reach them; picking one keeps the menu open. */}
          <DropdownMenuPrimitive.RadioGroup
            aria-label="Theme"
            value={theme}
            onValueChange={(v) => setTheme(v as Theme)}
            className="flex rounded-lg border border-border bg-muted p-0.5"
          >
            {themes.map(({ value, label, icon: Icon }) => (
              <DropdownMenuPrimitive.RadioItem
                key={value}
                value={value}
                aria-label={label}
                title={label}
                onSelect={(e) => e.preventDefault()}
                className="flex size-7 cursor-default items-center justify-center rounded-md text-muted-foreground outline-none transition-colors data-highlighted:text-foreground data-highlighted:ring-2 data-highlighted:ring-ring/50 data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-sm dark:data-[state=checked]:bg-input [&_svg]:size-4"
              >
                <Icon aria-hidden="true" />
              </DropdownMenuPrimitive.RadioItem>
            ))}
          </DropdownMenuPrimitive.RadioGroup>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="py-1.5">
          <Link to="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="py-1.5" disabled={logout.isPending} onSelect={() => logout.mutate()}>
          <LogOut />
          {logout.isPending ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
