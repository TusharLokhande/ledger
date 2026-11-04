import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

// Decorative sample numbers, never real data.
const cards = [
  { label: "Net worth", value: "₹4,82,350", className: "top-[22%] left-[10%]", delay: "0s" },
  { label: "This month", value: "+₹12,400", valueClass: "text-emerald-300", className: "top-[42%] left-[38%]", delay: "-2.3s" },
  { label: "Credit card due", value: "₹8,210 · 6 days", className: "top-[62%] left-[14%]", delay: "-4.6s" },
];

function SampleCard({ label, value, valueClass, className, delay }: (typeof cards)[number] & { valueClass?: string }) {
  return (
    <div
      style={{ animationDelay: delay }}
      className={cn(
        "rounded-2xl border border-white/15 bg-white/[0.07] px-5 py-4 shadow-2xl shadow-black/30 backdrop-blur-md motion-safe:animate-float",
        className,
      )}
    >
      <p className="text-xs text-white/60">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tracking-tight tabular-nums", valueClass)}>{value}</p>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/40">
        <Wallet className="size-5" aria-hidden="true" />
      </div>
      <span className="text-lg font-semibold tracking-tight">PocketLedger</span>
    </div>
  );
}

/** Always-dark brand side of the login page. Full panel on large screens, a short band on small ones. */
export function LoginBrandPanel() {
  return (
    <div className="relative overflow-hidden bg-[#0E1A36] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-32 size-[28rem] rounded-full bg-[radial-gradient(circle,#4169F5_0%,transparent_70%)] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 size-96 rounded-full bg-[radial-gradient(circle,#7C9BFF_0%,transparent_70%)] opacity-20"
      />

      {/* Small screens: logo + one card */}
      <div className="relative flex items-center justify-between gap-4 px-6 py-6 lg:hidden">
        <Logo />
        <div aria-hidden="true" className="hidden sm:block">
          <SampleCard {...cards[0]} className="" />
        </div>
      </div>

      {/* Large screens */}
      <div className="relative hidden h-full min-h-svh flex-col justify-between p-12 lg:flex">
        <Logo />
        <div aria-hidden="true">
          {cards.map((card) => (
            <SampleCard key={card.label} {...card} className={cn("absolute", card.className)} />
          ))}
        </div>
        <p className="max-w-sm text-sm text-white/60">
          Accounts, cards, budgets and imports, all in one calm place.
        </p>
      </div>
    </div>
  );
}
