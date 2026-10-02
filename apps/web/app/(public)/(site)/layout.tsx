import type { ReactNode } from "react";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteNav } from "@/components/landing/site-nav";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col items-center">
      <SiteNav />
      <main id="contenu" tabIndex={-1} className="flex w-full flex-1 flex-col items-center outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
