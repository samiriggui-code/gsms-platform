import { AlertCircle, CalendarClock, Activity, Briefcase } from "lucide-react";
import type { Metadata } from "next";
import { CoreFailureState, EmptyState, NoWorkspaceState } from "@/components/platform/core-state";
import { formatValue } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { asList } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { loadForWorkspace } from "@/lib/core/load";
import type { Row } from "@/lib/core/types";

export const metadata: Metadata = { title: "Tableau de bord" };

type Dashboard = { attention?: Row[]; deadlines?: Row[]; missions?: Row[]; activity?: Row[] };

const BLOCKS = [
  { key: "attention", title: "À traiter", icon: AlertCircle, empty: "Rien ne requiert votre attention pour l'instant." },
  { key: "deadlines", title: "Prochaines échéances", icon: CalendarClock, empty: "Aucune échéance à venir sur ce site." },
  { key: "missions", title: "Missions en cours", icon: Briefcase, empty: "Aucune mission en cours." },
  { key: "activity", title: "Activité récente", icon: Activity, empty: "Aucune activité récente." },
] as const;

export default async function DashboardPage() {
  const { result } = await loadForWorkspace<Dashboard>(ENDPOINTS.workspaces.dashboard);

  return (
    <>
      <PageHeader title="Tableau de bord" description="Ce qui demande votre attention, vos échéances, vos missions en cours et l'activité du site." />
      {result === null ? (
        <Card><NoWorkspaceState /></Card>
      ) : !result.ok ? (
        <Card><CoreFailureState failure={result} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {BLOCKS.map((block) => {
            const rows = asList<Row>(result.data?.[block.key]);
            return (
              <Card key={block.key} className="overflow-hidden">
                <CardHeader className="flex-row items-center gap-2">
                  <block.icon className="size-4 text-primary" aria-hidden />
                  <CardTitle>{block.title}</CardTitle>
                </CardHeader>
                {rows.length === 0 ? (
                  <EmptyState icon={block.icon} title={block.empty} className="py-8" />
                ) : (
                  <ul className="divide-y divide-border/70">
                    {rows.slice(0, 8).map((row, index) => (
                      <li key={String(row.id ?? index)} className="flex items-start justify-between gap-4 px-5 py-3 text-[13px]">
                        <span className="min-w-0 font-medium">{formatValue(row.title ?? row.label ?? row.name)}</span>
                        <span className="shrink-0 text-muted-foreground">{formatValue(row.due_at ?? row.date ?? row.at ?? row.status)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
