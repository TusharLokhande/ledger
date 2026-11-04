import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";

export function SectionCard({ title, subtitle, action, children }: { title: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-card font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-destructive">
      Couldn&apos;t load this.
      <Button variant="outline" size="sm" onClick={() => onRetry()}>
        <RefreshCw /> Retry
      </Button>
    </div>
  );
}

/** Label + value line over a thin bar — the shape of every list widget row. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
