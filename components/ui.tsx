import type { DealPhase } from "@/lib/types";
import type { T } from "@/lib/i18n";

const phaseColor: Record<DealPhase, string> = {
  pledging: "text-brand", bidding: "text-warn", locked: "text-good", expired: "text-muted",
};

export function PhasePill({ phase, t }: { phase: DealPhase; t: T }) {
  return <span className={`pill ${phaseColor[phase]}`}>{t(`phase_${phase}`)}</span>;
}

export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(100, max ? (value / max) * 100 : 0);
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-chip" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="h-full rounded bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {sub && <p className="max-w-prose text-muted">{sub}</p>}
    </div>
  );
}

export function Notice({ children, tone = "warn" }: { children: React.ReactNode; tone?: "warn" | "good" }) {
  return <div className={`rounded-lg bg-chip px-3 py-2 text-sm ${tone === "good" ? "text-good" : "text-warn"}`}>{children}</div>;
}
