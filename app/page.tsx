import Link from "next/link";
import { DealCard } from "@/components/DealCard";
import { repo } from "@/lib/data";
import { getT } from "@/lib/lang";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATS: (Category | "all")[] = ["all", "solar", "car", "tw"];

export default async function Home({ searchParams }: { searchParams: { cat?: string } }) {
  const { lang, t } = getT();
  const cat = CATS.includes(searchParams.cat as Category) ? (searchParams.cat as Category | "all") : "all";
  const deals = (await repo().listDeals()).filter((d) => cat === "all" || d.category === cat);
  const steps = [1, 2, 3, 4] as const;

  return (
    <>
      <section className="flex flex-col gap-4 sm:max-w-2xl">
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{t("hero_title")}</h1>
        <p className="text-base text-muted sm:text-lg">{t("hero_sub")}</p>
        <div><a href="#deals" className="btn-primary">{t("hero_cta")}</a></div>
      </section>

      <section id="deals" aria-labelledby="deals-h" className="flex scroll-mt-20 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="deals-h" className="text-xl font-semibold">{t("nav_deals")}</h2>
          <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Categories">
            {CATS.map((c) => (
              <Link key={c} href={c === "all" ? "/#deals" : `/?cat=${c}#deals`} scroll={false}
                className={c === cat ? "btn-primary btn-sm" : "btn btn-sm"} aria-current={c === cat ? "page" : undefined}>
                {c === "all" ? t("filter_all") : t(`cat_${c}`)}
              </Link>
            ))}
          </nav>
        </div>
        {deals.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => <DealCard key={d.id} deal={d} t={t} lang={lang} />)}
          </div>
        ) : (
          <div className="card text-center text-muted">
            {t("none_yet")} <Link href="/requests" className="text-brand underline">{t("nav_request")}</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="how" className="flex flex-col gap-3">
        <h2 id="how" className="text-xl font-semibold">{t("how_title")}</h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((n) => (
            <li key={n} className="card flex gap-3">
              <span className="font-display text-2xl text-accent">{n}</span>
              <div>
                <p className="font-semibold">{t(`how_${n}`)}</p>
                <p className="text-sm text-muted">{t(`how_${n}d`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
