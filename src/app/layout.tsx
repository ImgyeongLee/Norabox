import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { Header } from "@/components/Header";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
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
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* Extensions such as Grammarly add attributes to <body> before React loads; don't warn about those. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <I18nProvider locale={locale}>
          <ConfirmProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-leaf/20 px-4 py-6 text-center text-xs text-lime/40">
              <span>{t.nav.footer}</span>
              <span aria-hidden>·</span>
              <Link href="/announcements" className="text-lime/60 underline-offset-4 hover:text-lime hover:underline">
                {t.nav.announcements}
              </Link>
              {contactEmail && (
                <>
                  <span aria-hidden>·</span>
                  <a
                    href={`mailto:${contactEmail}?subject=${encodeURIComponent(t.nav.contactSubject)}`}
                    title={t.nav.contactTitle}
                    className="text-lime/60 underline-offset-4 hover:text-lime hover:underline"
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
