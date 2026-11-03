import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ShareButton } from "@/components/ShareButton";
import { Notice, PhasePill, Progress } from "@/components/ui";
import { pledge, respondToLock, withdraw } from "@/lib/actions";
import { isDemo, repo } from "@/lib/data";
import { getT } from "@/lib/lang";
import { daysLeft, formatINR, nextTier } from "@/lib/pricing";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: { id: string } }) {
  const { lang, t } = getT();
  const deal = await repo().getDeal(params.id);
  if (!deal) notFound();
  const user = await getSessionUser();
  const mine = user ? await repo().getMyPledge(deal.id, user.id) : null;
  const winner = deal.winningSellerId ? (await repo().listSellers()).find((s) => s.id === deal.winningSellerId) : null;
  const next = nextTier(deal.tiers, deal.pledged);
  const open = deal.phase === "pledging" || deal.phase === "bidding";
  const stepIndex = { pledging: 0, bidding: deal.bidCount ? 2 : 1, locked: 3, expired: 0 }[deal.phase];
  const messages = { need_login: t("need_login"), bad_phone: t("bad_phone"), required: t("required"), pledge_closed: t("pledge_closed"), error: t("error") };

  return (
    <>
      <Link href="/" className="text-sm text-brand">{t("back")}</Link>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag">{t(`cat_${deal.category}`)} · {deal.area[lang]}</span>
          {deal.isExample && <span className="pill text-muted">{t("example")}</span>}
          <PhasePill phase={deal.phase} t={t} />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">{deal.title[lang]}</h1>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t("steps_title")}>
        {([1, 2, 3, 4] as const).map((n, i) => (
          <li key={n} className={`rounded-lg p-3 text-xs ${i < stepIndex ? "bg-chip text-good" : i === stepIndex ? "bg-chip text-brand ring-1 ring-brand" : "bg-chip text-muted"}`}>
            <b className="block">{i < stepIndex ? "✓" : n} {t(`how_${n}`)}</b>{t(`how_${n}d`)}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="card flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted">{deal.phase === "locked" ? t("locked_price") : t("group_price")}</p>
                <p className="font-display text-3xl tabular-nums">{formatINR(deal.currentPrice)} <span className="text-sm text-muted">{t("per_unit")}</span></p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted">{t("market_price")}</p>
                <p className="tabular-nums text-muted line-through">{formatINR(deal.marketPrice)}</p>
              </div>
            </div>
            <Progress value={deal.pledged} max={deal.target} label={`${deal.pledged} ${t("of")} ${deal.target}`} />
            <div className="flex flex-wrap justify-between gap-2 text-sm tabular-nums">
              <span>{deal.pledged} {t("of")} {deal.target} {t("joined")}{open ? ` · ${daysLeft(deal.closesAt)} ${t("days_left")}` : ""}</span>
              <span className="font-semibold text-good">{t("savings")}: {formatINR((deal.marketPrice - deal.currentPrice) * deal.pledged)}</span>
            </div>
            {next && open && <p className="text-sm text-brand">{t("next_tier", { n: next.minBuyers - deal.pledged, price: formatINR(next.price) })}</p>}
          </section>

          <section className="card flex flex-col gap-3">
            <h2 className="font-semibold">{t("ladder")}</h2>
            <ul className="flex flex-col gap-2">
              {deal.tiers.map((tier) => {
                const hit = deal.pledged >= tier.minBuyers;
                return (
                  <li key={tier.minBuyers} className={`flex justify-between rounded-lg border px-3 py-2 text-sm ${hit ? "border-good" : "border-line"}`}>
                    <span>{hit ? "✓ " : ""}{tier.minBuyers}+ {t("buyers")}</span>
                    <span className="tabular-nums">{formatINR(tier.price)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card flex flex-col gap-2">
            <h2 className="font-semibold">{t("bids_title")}</h2>
            {deal.phase === "locked" && winner ? (
              <p className="text-sm">{t("winner")}: <b>{winner.company}</b> {winner.verified && <span className="text-good">✓ {t("verified")}</span>} · {formatINR(deal.lockedPrice!)}</p>
            ) : deal.phase === "bidding" ? (
              <p className="text-sm text-muted">{t("bids_sealed", { n: deal.bidCount })}</p>
            ) : (
              <p className="text-sm text-muted">{t("bids_waiting")}</p>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {mine && deal.phase === "locked" && mine.status === "active" && (
            <section className="card flex flex-col gap-3 border-brand">
              <h2 className="font-semibold">{t("confirm_title")}</h2>
              <p className="text-sm text-muted">{t("confirm_sub")}</p>
              <div className="flex flex-wrap gap-2">
                <form action={respondToLock}><input type="hidden" name="pledgeId" value={mine.id} /><input type="hidden" name="accept" value="yes" /><SubmitButton>{t("accept")}</SubmitButton></form>
                <form action={respondToLock}><input type="hidden" name="pledgeId" value={mine.id} /><input type="hidden" name="accept" value="no" /><SubmitButton className="btn">{t("decline")}</SubmitButton></form>
              </div>
            </section>
          )}
          {mine && mine.status === "accepted" && <Notice tone="good">{t("accepted")}</Notice>}
          {mine && mine.status === "declined" && <Notice>{t("declined")}</Notice>}

          <section className="card flex flex-col gap-3">
            <h2 className="font-semibold">{t("join_title")}</h2>
            {!open ? (
              <p className="text-sm text-muted">{t("pledge_closed")}</p>
            ) : !user ? (
              <Link href="/login" className="btn-primary">{t("sign_in_to_join")}</Link>
            ) : (
              <>
                {mine && <p className="text-sm font-semibold text-good">{t("you_pledged", { n: mine.quantity })}</p>}
                <ActionForm action={pledge} messages={messages} successText={t("you_pledged", { n: "✓" })}>
                  <input type="hidden" name="dealId" value={deal.id} />
                  <label className="label">{t("your_name")}<input className="input" name="name" required autoComplete="name" defaultValue={mine?.name ?? user.name ?? ""} /></label>
                  <label className="label">{t("phone")}<input className="input" name="phone" required inputMode="tel" autoComplete="tel" defaultValue={mine?.phone ?? user.phone ?? ""} /></label>
                  <label className="label">{t("quantity")}<input className="input" name="quantity" type="number" min={1} max={5} defaultValue={mine?.quantity ?? 1} /></label>
                  <div className="flex justify-between text-sm"><span className="text-muted">{t("deposit")}</span><b className="tabular-nums">{formatINR(deal.deposit)}</b></div>
                  {isDemo() && <p className="text-xs text-warn">{t("demo_payment")}</p>}
                  <SubmitButton>{mine ? t("update_btn") : t("pledge_btn")}</SubmitButton>
                </ActionForm>
                {mine && (
                  <form action={withdraw}><input type="hidden" name="dealId" value={deal.id} /><SubmitButton className="btn w-full">{t("leave_btn")}</SubmitButton></form>
                )}
              </>
            )}
            <ShareButton label={t("share")} copiedLabel={t("copied")} text={t("share_text")} path={`/deals/${deal.id}`} />
          </section>

          <section className="card flex flex-col gap-2">
            <h2 className="font-semibold">{t("trust_title")}</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {(["trust_1", "trust_2", "trust_3", "trust_4"] as const).map((k) => <li key={k} className="flex gap-2"><span aria-hidden>🛡</span>{t(k)}</li>)}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
