import { Separator } from "@/ui/separator";
import { SidebarTrigger } from "@/ui/sidebar";
import { UserMenu } from "@/features/auth";

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-top px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <p className="font-heading text-sm font-medium text-foreground">PocketLedger</p>
      <div className="ml-auto flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
}
