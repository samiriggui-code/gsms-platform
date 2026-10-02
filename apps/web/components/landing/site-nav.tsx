import Link from "next/link";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/copy/landing";
import { cn } from "@/lib/utils";
import { MissionCta } from "./mission-cta";
import { MobileMenu } from "./mobile-menu";

export function SiteNav() {
  return (
    <header className="pointer-events-none sticky top-0 z-50 flex w-full justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="pointer-events-auto relative flex h-14 w-full max-w-5xl items-center gap-6 rounded-[14px] border border-border bg-background/80 px-3 shadow-lg shadow-black/[0.03] backdrop-blur-md sm:px-4">
        <Link href="/" aria-label="GSMS — accueil" className="rounded-[10px]">
          <Wordmark />
        </Link>

        <nav aria-label="Navigation principale" className="hidden min-w-0 grow md:block">
          <ul className="flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[13px]/5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden rounded-full sm:inline-flex")}
          >
            Espace client
          </Link>
          <MissionCta kind="audit" cta="nav" className="hidden h-9 px-4 text-[13px] sm:inline-flex" />
          <MobileMenu links={NAV_LINKS.map((l) => ({ label: l.label, href: l.href }))} />
        </div>
      </div>
    </header>
  );
}
