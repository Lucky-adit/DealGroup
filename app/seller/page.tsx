import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { InstallTracker } from "@/components/InstallTracker";
import { Notice, PageHeader, PhasePill } from "@/components/ui";
import { placeBid, saveSeller, sellerSetInstallStage } from "@/lib/actions";
import { repo } from "@/lib/data";
import { getT } from "@/lib/lang";
import { formatINR } from "@/lib/pricing";
import { getSessionUser } from "@/lib/session";
import { INSTALL_STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SellerPage() {
  const { lang, t } = getT();
  const user = await getSessionUser();
  const seller = user ? await repo().getSellerByUser(user.id) : null;
  const deals = await repo().listDeals();
  const myBids = seller ? await repo().listBidsBySeller(seller.id) : [];
  const won = seller ? deals.filter((d) => d.winningSellerId === seller.id) : [];
  const wonPledges = await Promise.all(won.map(async (d) => ({ deal: d, pledges: (await repo().listDealPledges(d.id)).filter((p) => p.status === "accepted") })));
  const msgs = { need_login: t("need_login"), forbidden: t("forbidden"), required: t("required"), pledge_closed: t("pledge_closed"), error: t("error") };

  return (
    <>
      <PageHeader title={t("seller_title")} sub={t("seller_sub")} />
      {!user ? (
        <Link href="/login" className="btn-primary self-start">{t("nav_login")}</Link>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
          <section className="card flex flex-col gap-3 self-start">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{t("seller_register")}</h2>
              {seller && <span className={`pill ${seller.verified ? "text-good" : "text-warn"}`}>{seller.verified ? `✓ ${t("verified")}` : t("unverified")}</span>}
            </div>
            {seller && !seller.verified && <Notice>{t("verify_note")}</Notice>}
            <ActionForm action={saveSeller} successText={t("saved")} messages={msgs}>
              <label className="label">{t("company")}<input className="input" name="company" required defaultValue={seller?.company} /></label>
              <label className="label">{t("gst")}<input className="input uppercase" name="gst" required maxLength={15} defaultValue={seller?.gstNumber} /></label>
              <label className="label">{t("empanelment")}<input className="input" name="empanelment" required defaultValue={seller?.empanelmentId} /></label>
              <label className="label">{t("city")}<input className="input" name="city" defaultValue={seller?.city ?? "Ahmedabad"} /></label>
              <SubmitButton>{t("save")}</SubmitButton>
            </ActionForm>
          </section>

          <section className="flex min-w-0 flex-col gap-4">
            <h2 className="text-lg font-semibold">{t("open_for_bids")}</h2>
            {deals.filter((d) => d.phase === "bidding" || d.phase === "pledging").map((d) => {
              const bid = myBids.find((b) => b.dealId === d.id);
              return (
                <article key={d.id} className="card flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tag">{t(`cat_${d.category}`)} · {d.area[lang]}</span>
                    <PhasePill phase={d.phase} t={t} />
                  </div>
                  <h3 className="font-semibold">{d.title[lang]}</h3>
                  <p className="text-sm tabular-nums">
                    {d.phase === "bidding" ? t("demand") : t("upcoming")}: <b>{d.pledged}</b> {t("buyers")} · {t("market_price")} {formatINR(d.marketPrice)}
                  </p>
                  {d.phase === "bidding" && seller && (
                    <ActionForm action={placeBid} successText={t("bid_saved")} messages={msgs} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input type="hidden" name="dealId" value={d.id} />
                      <label className="label">{t("bid_price")}<input className="input" name="price" type="number" inputMode="numeric" min={1} required defaultValue={bid?.pricePerUnit} /></label>
                      <label className="label">{t("terms")}<input className="input" name="terms" defaultValue={bid?.terms} /></label>
                      <div className="sm:col-span-2"><SubmitButton>{bid ? `${t("your_bid")}: ${formatINR(bid.pricePerUnit)} ✎` : t("submit_bid")}</SubmitButton></div>
                    </ActionForm>
                  )}
                </article>
              );
            })}
            {!deals.some((d) => d.phase === "bidding" || d.phase === "pledging") && <p className="card text-muted">{t("no_open")}</p>}

            {wonPledges.map(({ deal, pledges }) => (
              <article key={deal.id} className="card flex flex-col gap-3 border-good">
                <h3 className="font-semibold">✓ {deal.title[lang]} · {formatINR(deal.lockedPrice!)}</h3>
                {pledges.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                    <div className="flex flex-wrap justify-between gap-2 text-sm"><b>{p.name}</b><span className="tabular-nums">{p.phone} · ×{p.quantity}</span></div>
                    {p.install && <InstallTracker stage={p.install.stage} t={t} />}
                    <form action={sellerSetInstallStage} className="flex flex-wrap gap-2">
                      <input type="hidden" name="dealId" value={deal.id} />
                      <input type="hidden" name="pledgeId" value={p.id} />
                      <select name="stage" className="input w-auto" defaultValue={p.install?.stage} aria-label={t("set_stage")}>
                        {INSTALL_STAGES.filter((s) => s !== "complete").map((s) => <option key={s} value={s}>{t(`stage_${s}`)}</option>)}
                      </select>
                      <SubmitButton className="btn">{t("set_stage")}</SubmitButton>
                    </form>
                  </div>
                ))}
              </article>
            ))}
          </section>
        </div>
      )}
    </>
  );
}
