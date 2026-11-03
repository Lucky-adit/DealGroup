import Link from "next/link";
import { daysLeft, formatINR } from "@/lib/pricing";
import type { T } from "@/lib/i18n";
import type { DealWithStats, Lang } from "@/lib/types";
import { PhasePill, Progress } from "./ui";

export function DealCard({ deal, t, lang }: { deal: DealWithStats; t: T; lang: Lang }) {
  const dl = daysLeft(deal.closesAt);
  return (
    <Link href={`/deals/${deal.id}`} className="card flex flex-col gap-3 transition hover:border-brand">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="tag">{t(`cat_${deal.category}`)} · {deal.area[lang]}</span>
        <span className="flex gap-1">
          {deal.isExample && <span className="pill text-muted">{t("example")}</span>}
          <PhasePill phase={deal.phase} t={t} />
        </span>
      </div>
      <h3 className="text-lg font-semibold leading-snug">{deal.title[lang]}</h3>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-2xl tabular-nums">{formatINR(deal.currentPrice)}</span>
        <span className="text-sm tabular-nums text-muted line-through">{formatINR(deal.marketPrice)}</span>
      </div>
      <Progress value={deal.pledged} max={deal.target} label={`${deal.pledged} ${t("of")} ${deal.target}`} />
      <div className="flex justify-between text-sm tabular-nums text-muted">
        <span>{deal.pledged} {t("of")} {deal.target} {t("joined")}</span>
        <span>{deal.phase === "pledging" || deal.phase === "bidding" ? `${dl} ${t("days_left")}` : t("closed")}</span>
      </div>
    </Link>
  );
}
