import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { THEME_INIT_SCRIPT } from "@/components/brand/theme";
import { GSMS_META } from "@/lib/copy/landing";
import "./globals.css";

// Polices auto-hébergées (app/fonts, licence OFL) : aucun appel à Google Fonts, au build comme chez le visiteur.
const manrope = localFont({
  src: "./fonts/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});

const dmMono = localFont({
  src: [
    { path: "./fonts/dm-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
});

const newsreader = localFont({
  src: "./fonts/newsreader-latin-400-italic.woff2",
  weight: "400",
  style: "italic",
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
