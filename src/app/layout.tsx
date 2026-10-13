import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { Header } from "@/components/Header";
import type { Locale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import "./globals.css";

// All fonts use font-display: optional, so text is never redrawn in another font after it shows
// (no "popping"). Inter (Latin) is small and preloaded on every page. The Korean and Japanese
// fonts are big, so each page loads only its own language's (CJK_FONTS); characters from other
// languages use system fonts. The font order per language is in globals.css.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "optional" });

/** Self-hosted, split by character range (public/fonts): only the pieces a page uses download. */
const CJK_FONTS: Partial<Record<Locale, string>> = {
  ko: "/fonts/v1/pretendard.css",
  ja: "/fonts/v1/noto-sans-jp.css",
};
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: t.meta.title, template: "%s · Norabox" },
    description: t.meta.description,
  };
}

export const viewport: Viewport = { themeColor: "#132a13" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, t } = await getI18n();
  // Where "Contact" in the footer sends email; set CONTACT_EMAIL in .env / Vercel. Hidden when unset.
  const contactEmail = process.env.CONTACT_EMAIL?.trim();
  return (
    <html lang={locale} className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      {/* Extensions such as Grammarly add attributes to <body> before React loads; don't warn about those. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {/* React puts this in <head> and holds the first paint until it loads, so the font is
            known before any text shows. */}
        {CJK_FONTS[locale] && <link rel="stylesheet" href={CJK_FONTS[locale]} precedence="default" />}
        <I18nProvider locale={locale}>
          <ConfirmProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-leaf/20 px-4 py-6 text-center text-xs text-lime/40">
              <span>{t.nav.footer}</span>
              <span aria-hidden>·</span>
              <Link href="/announcements" className="muted underline-offset-4 hover:text-lime hover:underline">
                {t.nav.announcements}
              </Link>
              <span aria-hidden>·</span>
              <Link href="/terms" className="muted underline-offset-4 hover:text-lime hover:underline">
                {t.nav.terms}
              </Link>
              <span aria-hidden>·</span>
              <Link href="/privacy" className="muted underline-offset-4 hover:text-lime hover:underline">
                {t.nav.privacy}
              </Link>
              {contactEmail && (
                <>
                  <span aria-hidden>·</span>
                  <a
                    href={`mailto:${contactEmail}?subject=${encodeURIComponent(t.nav.contactSubject)}`}
                    title={t.nav.contactTitle}
                    className="muted underline-offset-4 hover:text-lime hover:underline"
                  >
                    {t.nav.contact}
                  </a>
                </>
              )}
            </footer>
          </ConfirmProvider>
        </I18nProvider>
        {/* Vercel Web Analytics: page views only; does nothing outside Vercel deployments. */}
        <Analytics />
      </body>
    </html>
  );
}
