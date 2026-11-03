import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { isDemo } from "@/lib/data";
import { getT } from "@/lib/lang";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "DealGroup",
  description: "Buy together, pay less. Group deals on rooftop solar and more.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = getT();
  const user = await getSessionUser();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;600&display=swap" />
      </head>
      <body className="min-h-screen">
        <Header t={t} lang={lang} user={user} />
        {isDemo() && (
          <div className="border-b border-line bg-chip">
            <p className="container-page py-2 text-xs text-warn sm:text-sm">{t("demo_banner")}</p>
          </div>
        )}
        <main className="container-page flex flex-col gap-6 py-6 sm:gap-8 sm:py-10">{children}</main>
        <footer className="container-page pb-8 text-xs text-muted">{t("footer")}</footer>
      </body>
    </html>
  );
}
