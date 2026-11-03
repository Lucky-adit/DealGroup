import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { InstallTracker } from "@/components/InstallTracker";
import { PageHeader, PhasePill } from "@/components/ui";
import { confirmInstall, review } from "@/lib/actions";
import { repo } from "@/lib/data";
import { getT } from "@/lib/lang";
import { formatINR } from "@/lib/pricing";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MyDeals() {
  const { lang, t } = getT();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const rows = await repo().listMyPledges(user.id);
  return (
    <>
      <PageHeader title={t("my_title")} />
      {!rows.length && <div className="card text-muted">{t("my_empty")} <Link href="/" className="text-brand underline">{t("hero_cta")}</Link></div>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((p) => (
          <article key={p.id} className="card flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="tag">{t(`cat_${p.deal.category}`)} · {p.deal.area[lang]}</span>
              <PhasePill phase={p.deal.phase} t={t} />
            </div>
            <Link href={`/deals/${p.dealId}`} className="text-lg font-semibold hover:text-brand">{p.deal.title[lang]}</Link>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span>×{p.quantity} · <b className="tabular-nums">{formatINR(p.deal.currentPrice)}</b> {t("per_unit")}</span>
              <span className="text-muted">{t(`deposit_${p.depositStatus}`)} · {formatINR(p.deal.deposit)}</span>
            </div>
            {p.winner && <p className="text-sm">{t("winner")}: <b>{p.winner.company}</b></p>}
            {p.install && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">{t("install_title")}</h3>
                <InstallTracker stage={p.install.stage} t={t} />
                {p.install.stage === "subsidy_filed" && (
                  <form action={confirmInstall}><input type="hidden" name="pledgeId" value={p.id} /><SubmitButton>{t("confirm_install")}</SubmitButton></form>
                )}
                {p.install.stage === "complete" && <p className="text-sm text-good">{t("install_confirmed")}</p>}
              </div>
            )}
            {p.install?.stage === "complete" && (
              <ActionForm action={review} successText={t("review_saved")} messages={{ required: t("required"), forbidden: t("forbidden"), error: t("error") }}>
                <h3 className="text-sm font-semibold">{t("review_title")}</h3>
                <input type="hidden" name="pledgeId" value={p.id} />
                <fieldset className="flex gap-1" aria-label={t("rating")}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="cursor-pointer">
                      <input type="radio" name="rating" value={n} defaultChecked={p.review?.rating === n} className="peer sr-only" />
                      <span className="btn btn-sm peer-checked:border-accent peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">★ {n}</span>
                    </label>
                  ))}
                </fieldset>
                <label className="label">{t("comment")}<textarea className="input min-h-[80px]" name="comment" defaultValue={p.review?.comment ?? ""} /></label>
                <SubmitButton>{t("send_review")}</SubmitButton>
              </ActionForm>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
