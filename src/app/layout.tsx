import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale}>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-leaf/20 py-6 text-center text-xs text-lime/40">{t.nav.footer}</footer>
        </I18nProvider>
      </body>
    </html>
  );
}
