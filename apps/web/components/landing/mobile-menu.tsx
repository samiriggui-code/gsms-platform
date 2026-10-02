"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileMenu({ links }: { links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-[10px] text-foreground hover:bg-muted"
      >
        {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
      </button>

      {open ? (
        <nav
          id={panelId}
          aria-label="Navigation mobile"
          className="absolute inset-x-0 top-[calc(100%+8px)] rounded-[14px] border border-border bg-background p-3 shadow-xl"
        >
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-[10px] px-3 py-2.5 text-[14px] font-medium hover:bg-muted"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
            <Link href="/login" onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
              Espace client
            </Link>
            <Link href="/demande?type=audit&cta=nav" onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "contrast", size: "md" }))}>
              Demander un audit
            </Link>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
