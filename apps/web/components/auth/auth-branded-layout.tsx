import { CalendarClock, FileText, FolderKanban } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";

const PANEL_ITEMS = [
  { icon: FolderKanban, label: "Vos missions et leur avancement" },
  { icon: FileText, label: "Vos documents et rapports, au même endroit" },
  { icon: CalendarClock, label: "Vos échéances réglementaires suivies" },
] as const;

/** Mise en page brandée split (inspirée de l'AuthBrandedLayout de l'espace client). */
export function AuthBrandedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh w-full bg-background lg:grid-cols-2">
      <div className="order-2 flex flex-col lg:order-1">
        <header className="flex h-14 items-center justify-between border-b border-border/70 px-4 sm:px-6 lg:hidden">
          <Link href="/" aria-label="GSMS — accueil">
            <Wordmark />
          </Link>
          <ThemeToggle />
        </header>

        <main id="contenu" tabIndex={-1} className="relative flex flex-1 items-center justify-center p-5 outline-none sm:p-8 lg:p-10">
          <div className="absolute end-6 top-6 hidden items-center gap-2 lg:flex">
            <Link href="/" className="text-[13px] text-muted-foreground hover:text-foreground">
              Retour au site
            </Link>
            <ThemeToggle />
          </div>
          <div className="surface-card w-full max-w-[420px] p-6 sm:p-7">{children}</div>
        </main>
      </div>

      <aside
        aria-label="Espace client GSMS"
        className="order-1 flex flex-col overflow-hidden bg-[#111721] text-white lg:order-2 lg:m-5 lg:rounded-[28px] lg:border lg:border-white/10"
      >
        <div className="flex flex-col gap-5 p-8 lg:px-12 lg:pt-12 lg:pb-6">
          <Link href="/" aria-label="GSMS — accueil" className="hidden w-fit lg:block">
            <Wordmark inverted />
          </Link>
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Espace client</p>
            <h2 className="text-balance text-2xl font-semibold tracking-[-0.035em] md:text-[30px]/[1.15]">
              Votre sécurité, <span className="font-serif font-normal italic text-white/60">suivie au quotidien.</span>
            </h2>
            <p className="max-w-md text-sm leading-6 text-white/60">
              Retrouvez vos missions, vos constats et plans d&apos;actions, vos documents et vos prochaines échéances.
            </p>
          </div>
        </div>

        <ul className="relative mt-auto hidden flex-1 flex-col justify-end gap-3 px-8 pb-8 sm:flex lg:px-12 lg:pb-12">
          {PANEL_ITEMS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="grid size-9 place-items-center rounded-xl bg-white/10">
                <Icon className="size-4" strokeWidth={2} aria-hidden />
              </span>
              <span className="text-sm font-medium text-white/85">{label}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
