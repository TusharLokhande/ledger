import { Compass, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/15">
            <Wallet className="size-6" />
          </div>
          <h1 className="font-heading text-xl font-semibold text-foreground">PocketLedger</h1>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-black/5">
          <Compass className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 text-3xl font-semibold text-card-foreground">404</p>
          <p className="mt-1 text-sm text-muted-foreground">This page doesn&apos;t exist.</p>

          <Button asChild size="lg" className="mt-6 w-full rounded-full">
            <Link to="/">Back to PocketLedger</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
