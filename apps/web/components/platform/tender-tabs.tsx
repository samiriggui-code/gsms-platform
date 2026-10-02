"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";

export function TenderTabs({ missionId, tabs }: { missionId: string; tabs: { slug: string; label: string }[] }) {
  const segment = useSelectedLayoutSegment() ?? "synthese";
  const base = `/app/tenders/${encodeURIComponent(missionId)}`;

  return (
    <nav aria-label="Onglets du dossier d'appel d'offres" className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1">
        {tabs.map((tab) => {
          const active = segment === tab.slug;
          return (
            <li key={tab.slug}>
              <Link
                href={tab.slug === "synthese" ? base : `${base}/${tab.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
