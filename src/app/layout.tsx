import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Norabox — listen together", template: "%s · Norabox" },
  description: "Create a room, invite friends, and listen to the same music at the same time.",
};

export const viewport: Viewport = { themeColor: "#132a13" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-leaf/20 py-6 text-center text-xs text-lime/40">
          Norabox · music from YouTube
        </footer>
      </body>
    </html>
  );
}
