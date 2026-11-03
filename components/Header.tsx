import Link from "next/link";
import { Suspense } from "react";
import { MobileMenu } from "./MobileMenu";
import { logout, setLang } from "@/lib/actions";
import type { T } from "@/lib/i18n";
import type { Lang, SessionUser } from "@/lib/types";

export function Header({ t, lang, user }: { t: T; lang: Lang; user: SessionUser | null }) {
  const links = [
    { href: "/", label: t("nav_deals") },
    { href: "/requests", label: t("nav_request") },
    ...(user ? [{ href: "/me", label: t("nav_my") }] : []),
    { href: "/seller", label: t("nav_seller") },
    ...(user?.role === "admin" ? [{ href: "/admin", label: t("nav_admin") }] : []),
  ];
  const langToggle = (
    <form action={setLang}>
      <input type="hidden" name="lang" value={lang === "en" ? "hi" : "en"} />
      <button className="btn btn-sm" aria-label="Switch language">{lang === "en" ? "हिन्दी" : "English"}</button>
    </form>
  );
  const auth = user ? (
    <form action={logout}><button className="btn btn-sm">{t("nav_logout")}</button></form>
  ) : (
    <Link href="/login" className="btn-primary btn-sm">{t("nav_login")}</Link>
  );
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="container-page flex h-14 items-center justify-between gap-3">
        <Link href="/" className="font-display text-lg font-bold">{t("brand")}</Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm hover:bg-chip">{l.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">{langToggle}{auth}</div>
        {/* Mobile and small tablets: a disclosure menu, no JavaScript needed. */}
        <Suspense>
          <MobileMenu label={t("menu")}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-3 text-sm hover:bg-chip">{l.label}</Link>
            ))}
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-2">{langToggle}{auth}</div>
          </MobileMenu>
        </Suspense>
      </div>
    </header>
  );
}
