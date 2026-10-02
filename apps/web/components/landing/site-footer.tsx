import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { FOOTER } from "@/lib/copy/landing";
import { MissionCta } from "./mission-cta";

export function SiteFooter() {
  return (
    <footer className="flex w-full flex-col items-center border-t border-border">
      <div className="grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:gap-10">
        <div className="flex max-w-sm flex-col items-start gap-4">
          <Wordmark />
          <p className="text-[13px]/[1.65] text-muted-foreground">{FOOTER.blurb}</p>
          <MissionCta kind="audit" cta="footer" className="h-10 px-5 text-[13px]" />
        </div>

        {FOOTER.columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex min-w-0 flex-col items-start gap-3.5">
            <p className="font-mono text-[11px]/4 uppercase tracking-widest text-muted-foreground">{column.title}</p>
            <ul className="flex flex-col gap-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[13px]/5 text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="flex w-full justify-center border-t border-border">
        <div className="flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6 md:h-[60px] md:py-0">
          <p className="flex-1 text-[13px]/5 text-muted-foreground">{FOOTER.legal}</p>
          <p className="text-[13px]/5 text-muted-foreground">Sécurité, sûreté et prévention · France</p>
        </div>
      </div>
    </footer>
  );
}
