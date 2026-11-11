import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { Header } from "@/components/Header";
import { NavigationProgress } from "@/components/NavigationProgress";
import { KeepPlainTheme } from "@/components/home/PlainThemeButton";
import { Snowfall } from "@/components/Snowfall";
import type { Locale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { MOTION_COOKIE, paletteCss, THEME_PALETTES } from "@/lib/room-themes";
import { isPlainTheme, PLAIN_THEME_COOKIE, SEASON, seasonOn, sitePalette } from "@/lib/site-theme";
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

const plainThemeOn = async () => isPlainTheme((await cookies()).get(PLAIN_THEME_COOKIE)?.value);

export async function generateViewport(): Promise<Viewport> {
  return { themeColor: (sitePalette(await plainThemeOn()) ?? THEME_PALETTES.default).pine };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ locale, t }, cookieStore] = await Promise.all([getI18n(), cookies()]);
  const plain = isPlainTheme(cookieStore.get(PLAIN_THEME_COOKIE)?.value);
  const palette = sitePalette(plain);
  const season = seasonOn(plain) ? SEASON : null;
  // The same per-browser switch that turns room backdrops off also stops the snow.
  const snow = season === "christmas" && cookieStore.get(MOTION_COOKIE)?.value !== "off";
  // Where "Contact" in the footer sends email; set CONTACT_EMAIL in .env / Vercel. Hidden when unset.
  const contactEmail = process.env.CONTACT_EMAIL?.trim();
  return (
    <html
      lang={locale}
      data-season={season ?? undefined}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Extensions such as Grammarly add attributes to <body> before React loads; don't warn about those. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {/* React puts this in <head> and holds the first paint until it loads, so the font is
            known before any text shows. */}
        {CJK_FONTS[locale] && <link rel="stylesheet" href={CJK_FONTS[locale]} precedence="default" />}
        {/* White & black (from the home page's PlainThemeButton) or the season's look. */}
        {palette && <style>{paletteCss(palette)}</style>}
        {plain && <KeepPlainTheme />}
        {snow && <Snowfall />}
        {/* It reads the URL's query, which needs a Suspense boundary. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <I18nProvider locale={locale}>
          <ConfirmProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-leaf/20 px-4 py-6 text-center text-xs text-lime/40">
              <span>{t.nav.footer}</span>
              <span aria-hidden>·</span>
              {/* The source code, as the AGPL asks of a network service (see LICENSE). */}
              <a
                href="https://github.com/ImgyeongLee/Norabox"
                target="_blank"
                rel="noopener noreferrer"
                className="muted underline-offset-4 hover:text-lime hover:underline"
              >
                GitHub
              </a>
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
