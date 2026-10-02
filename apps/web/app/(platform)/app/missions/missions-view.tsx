import { Briefcase } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { loadForWorkspace } from "@/lib/core/load";
import { MISSION_TYPES } from "@/lib/copy/platform";
import { cn } from "@/lib/utils";

export async function MissionsView({ typeSlug }: { typeSlug?: string }) {
  const type = MISSION_TYPES.find((item) => item.slug === typeSlug);
  const { result } = await loadForWorkspace<unknown>(ENDPOINTS.missions, { query: { type: type?.coreType } });

  const tabs = [{ href: "/app/missions", label: "Toutes", active: !type }, ...MISSION_TYPES.map((item) => ({ href: `/app/missions/${item.slug}`, label: item.label, active: item.slug === type?.slug }))];

  return (
    <>
      <PageHeader eyebrow="Missions" title={type ? type.label : "Toutes les missions"} description="Missions du site courant : participants, jalons et références externes." />
      <nav aria-label="Types de mission" className="-mx-1 mb-5 overflow-x-auto px-1">
        <ul className="flex w-max gap-1.5">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={cn(
                  "block rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  tab.active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ResourcePanel
        title={type ? `Missions · ${type.label}` : "Missions"}
        result={result}
        columns={[
          { key: "title", label: "Mission" },
          { key: "type", label: "Type" },
          { key: "client", label: "Client" },
          { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
          { key: "next_milestone_at", label: "Prochain jalon" },
        ]}
        rowHref={(row) => (row.type === "appel_offres" && row.id ? `/app/tenders/${encodeURIComponent(String(row.id))}` : null)}
        empty={{ icon: Briefcase, title: type ? `Aucune mission « ${type.label} »` : "Aucune mission", description: "Les missions créées dans le Core (ou issues d'une demande qualifiée) apparaîtront ici." }}
      />
    </>
  );
}
