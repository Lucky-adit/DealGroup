import { ActionForm, SubmitButton } from "@/components/forms";
import { InstallTracker } from "@/components/InstallTracker";
import { Notice, PageHeader, PhasePill } from "@/components/ui";
import { adminSetInstallStage, createDeal, lockDeal, setVerified } from "@/lib/actions";
import { repo } from "@/lib/data";
import { getT } from "@/lib/lang";
import { formatINR } from "@/lib/pricing";
import { getSessionUser } from "@/lib/session";
import { INSTALL_STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: { notice?: string } }) {
  const { lang, t } = getT();
  const user = await getSessionUser();
  if (user?.role !== "admin") return <Notice>{user ? t("forbidden") : t("need_login")}</Notice>;

  const [deals, sellers, requests] = await Promise.all([repo().listDeals(), repo().listSellers(), repo().listRequests()]);
  const pledgesByDeal = await Promise.all(deals.map(async (d) => ({ deal: d, pledges: await repo().listDealPledges(d.id) })));
  const msgs = { required: t("required"), forbidden: t("forbidden"), lock_ok: t("lock_ok"), lock_no_bid: t("lock_no_bid"), lock_not_ready: t("lock_not_ready"), error: t("error") };

  return (
    <>
      <PageHeader title={t("admin_title")} sub={t("admin_sub")} />
      {searchParams.notice === "lock_ok" && <Notice tone="good">{t("lock_ok")}</Notice>}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("deals_table")}</h2>
        {/* Cards on phones, a table from tablet width up. */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {deals.map((d) => (
            <div key={d.id} className="card flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2"><b className="min-w-0">{d.title[lang]}</b><PhasePill phase={d.phase} t={t} /></div>
              <p className="text-sm tabular-nums text-muted">{d.pledged} / {d.target} · {formatINR(d.currentPrice)} · bids {d.bidCount}{d.bestVerifiedBid ? ` · best ${formatINR(d.bestVerifiedBid)}` : ""}</p>
              {d.phase === "bidding" && <LockForm id={d.id} label={t("lock")} msgs={msgs} />}
            </div>
          ))}
        </div>
        <div className="table-wrap hidden md:block">
          <table className="w-full min-w-[720px] overflow-hidden rounded-xl border border-line bg-surface text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>{[t("product"), t("demand"), t("group_price"), t("bids_title"), t("status"), t("action")].map((h) => <th key={h} className="border-b border-line px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-3 py-2">{d.title[lang]}<div className="text-xs text-muted">{d.area[lang]}{d.isExample ? ` · ${t("example")}` : ""}</div></td>
                  <td className="px-3 py-2 tabular-nums">{d.pledged} / {d.target}</td>
                  <td className="px-3 py-2 tabular-nums">{formatINR(d.currentPrice)}</td>
                  <td className="px-3 py-2 tabular-nums">{d.bidCount}{d.bestVerifiedBid ? ` · ${formatINR(d.bestVerifiedBid)}` : ""}</td>
                  <td className="px-3 py-2"><PhasePill phase={d.phase} t={t} /></td>
                  <td className="px-3 py-2">{d.phase === "bidding" ? <LockForm id={d.id} label={t("lock")} msgs={msgs} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card flex flex-col gap-3">
          <h2 className="font-semibold">{t("sellers_table")}</h2>
          {sellers.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <div className="min-w-0">
                <b>{s.company}</b> <span className={s.verified ? "text-good" : "text-warn"}>{s.verified ? `✓ ${t("verified")}` : t("unverified")}</span>
                <div className="break-all text-xs text-muted">GST {s.gstNumber} · {s.empanelmentId} · {s.city}{s.avgRating ? ` · ★ ${s.avgRating.toFixed(1)} (${s.reviewCount})` : ""}</div>
              </div>
              <form action={setVerified}>
                <input type="hidden" name="sellerId" value={s.id} />
                <input type="hidden" name="verified" value={s.verified ? "no" : "yes"} />
                <SubmitButton className="btn btn-sm">{s.verified ? t("unverify") : t("verify")}</SubmitButton>
              </form>
            </div>
          ))}
          {!sellers.length && <p className="text-sm text-muted">{t("none_yet")}</p>}
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="font-semibold">{t("new_deal")}</h2>
          <ActionForm action={createDeal} successText={t("created")} messages={msgs} resetOnSuccess className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="label sm:col-span-2">{t("title_en")}<input className="input" name="titleEn" required defaultValue="3 kW rooftop solar · Vastrapur" /></label>
            <label className="label sm:col-span-2">{t("title_hi")}<input className="input" name="titleHi" /></label>
            <label className="label">{t("category")}
              <select className="input" name="category" defaultValue="solar">
                <option value="solar">{t("cat_solar")}</option><option value="car">{t("cat_car")}</option><option value="tw">{t("cat_tw")}</option>
              </select>
            </label>
            <label className="label">{t("area")}<input className="input" name="area" required defaultValue="Vastrapur, Ahmedabad" /></label>
            <label className="label">{t("market_price")} (₹)<input className="input" name="marketPrice" type="number" required defaultValue={190000} /></label>
            <label className="label">{t("target")}<input className="input" name="target" type="number" required defaultValue={30} /></label>
            <label className="label">{t("deposit")} (₹)<input className="input" name="deposit" type="number" required defaultValue={5000} /></label>
            <label className="label">{t("days_open")}<input className="input" name="days" type="number" required defaultValue={21} /></label>
            <input type="hidden" name="city" value="Ahmedabad" />
            <div className="sm:col-span-2"><SubmitButton>{t("create")}</SubmitButton></div>
          </ActionForm>
        </section>
      </div>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">{t("pledges_table")}</h2>
        {pledgesByDeal.filter((x) => x.pledges.length).map(({ deal, pledges }) => (
          <div key={deal.id} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{deal.title[lang]}</h3>
            {pledges.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 rounded-lg border border-line p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><span><b>{p.name}</b> · {p.phone}</span><span className="tabular-nums">×{p.quantity} · {p.status}</span></div>
                {p.install && (
                  <>
                    <InstallTracker stage={p.install.stage} t={t} />
                    <form action={adminSetInstallStage} className="flex flex-wrap gap-2">
                      <input type="hidden" name="pledgeId" value={p.id} />
                      <select name="stage" className="input w-auto" defaultValue={p.install.stage} aria-label={t("set_stage")}>
                        {INSTALL_STAGES.map((s) => <option key={s} value={s}>{t(`stage_${s}`)}</option>)}
                      </select>
                      <SubmitButton className="btn">{t("set_stage")}</SubmitButton>
                    </form>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
        {!pledgesByDeal.some((x) => x.pledges.length) && <p className="text-sm text-muted">{t("none_yet")}</p>}
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="font-semibold">{t("requests_table")}</h2>
        {requests.length ? requests.map((r) => (
          <div key={r.id} className="flex justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
            <span className="min-w-0 break-words">{r.product} · {r.city}{r.budget ? ` · ${formatINR(r.budget)}` : ""}</span><span>×{r.quantity}</span>
          </div>
        )) : <p className="text-sm text-muted">{t("none_yet")}</p>}
      </section>
    </>
  );
}

function LockForm({ id, label, msgs }: { id: string; label: string; msgs: Record<string, string> }) {
  return (
    <ActionForm action={lockDeal} messages={msgs} className="flex flex-col gap-1">
      <input type="hidden" name="dealId" value={id} />
      <SubmitButton className="btn-primary btn-sm">{label}</SubmitButton>
    </ActionForm>
  );
}
