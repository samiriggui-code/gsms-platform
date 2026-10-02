import { CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { loadForWorkspace } from "@/lib/core/load";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Échéances" };

const KINDS = [
  { value: "", label: "Toutes" },
  { value: "reglementaire", label: "Réglementaires" },
  { value: "contractuel", label: "Contractuelles" },
  { value: "appel_offres", label: "Appels d'offres" },
] as const;

export default async function DeadlinesPage({ searchParams }: { searchParams: Promise<{ kind?: string | string[] }> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const kind = KINDS.find((k) => k.value === raw)?.value ?? "";
  const { result } = await loadForWorkspace<unknown>(ENDPOINTS.deadlines, { query: { kind } });

  return (
    <>
      <PageHeader title="Échéances" description="Calendrier réglementaire, contractuel et appels d'offres du site." />
      <nav aria-label="Filtrer les échéances" className="mb-5 overflow-x-auto">
        <ul className="flex w-max gap-1.5">
          {KINDS.map((k) => (
            <li key={k.value}>
              <Link
                href={k.value ? `/app/deadlines?kind=${k.value}` : "/app/deadlines"}
                aria-current={k.value === kind ? "page" : undefined}
                className={cn(
                  "block rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium",
                  k.value === kind ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {k.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ResourcePanel
        title="Calendrier"
        result={result}
        columns={[
          { key: "title", label: "Échéance" },
          { key: "kind", label: "Nature" },
          { key: "mission", label: "Mission" },
          { key: "due_at", label: "Date" },
          { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
        ]}
        empty={{ icon: CalendarClock, title: "Aucune échéance", description: "Les échéances calculées par le Core (règles et jalons de mission) apparaîtront ici." }}
      />
    </>
  );
}
