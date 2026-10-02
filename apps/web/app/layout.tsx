import type { Metadata, Viewport } from "next";
import { DM_Mono, Manrope, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import { THEME_INIT_SCRIPT } from "@/components/brand/theme";
import { GSMS_META } from "@/lib/copy/landing";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: GSMS_META.title, template: "%s — GSMS" },
  description: GSMS_META.description,
  applicationName: "GSMS",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#12151a" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${manrope.variable} ${dmMono.variable} ${newsreader.variable}`}
    >
      <head>
        {/* Applique le thème mémorisé avant le premier rendu (évite le flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-svh bg-background font-sans text-foreground">
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
