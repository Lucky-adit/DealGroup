import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requestDeal } from "@/lib/actions";
import { repo } from "@/lib/data";
import { getT } from "@/lib/lang";
import { formatINR } from "@/lib/pricing";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const { t } = getT();
  const user = await getSessionUser();
  const mine = user ? await repo().listMyRequests(user.id) : [];
  return (
    <>
      <PageHeader title={t("req_title")} sub={t("req_sub")} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="card">
          {user ? (
            <ActionForm action={requestDeal} successText={t("req_sent")} resetOnSuccess messages={{ need_login: t("need_login"), required: t("required"), error: t("error") }}>
              <label className="label">{t("product")}<input className="input" name="product" required placeholder="5 kW solar, Hyundai Creta…" /></label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="label">{t("city")}<input className="input" name="city" defaultValue="Ahmedabad" /></label>
                <label className="label">{t("quantity")}<input className="input" name="quantity" type="number" min={1} defaultValue={1} /></label>
              </div>
              <label className="label">{t("budget")}<input className="input" name="budget" type="number" min={0} inputMode="numeric" /></label>
              <SubmitButton>{t("send_req")}</SubmitButton>
            </ActionForm>
          ) : (
            <Link href="/login" className="btn-primary">{t("nav_login")}</Link>
          )}
        </section>
        <section className="card flex flex-col gap-2">
          <h2 className="font-semibold">{t("your_requests")}</h2>
          {mine.length ? (
            <ul className="flex flex-col gap-2">
              {mine.map((r) => (
                <li key={r.id} className="flex justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                  <span className="min-w-0 break-words">{r.product} · {r.city}{r.budget ? ` · ${formatINR(r.budget)}` : ""}</span>
                  <span className="tabular-nums">×{r.quantity}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">{t("none_yet")}</p>}
        </section>
      </div>
    </>
  );
}
