export function Footer() {
  return (
    <footer className="sticky bottom-0 z-20 flex h-12 shrink-0 items-center justify-between border-t border-border bg-background px-4 text-xs text-muted-foreground">
      <p>© {new Date().getFullYear()} Effica Nova · PocketLedger</p>
      <p>v1.0.0</p>
    </footer>
  );
}
