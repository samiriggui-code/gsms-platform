import { BarChart3 } from "lucide-react";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { loadForWorkspace } from "@/lib/core/load";

export const metadata: Metadata = { title: "Rapports" };

export default async function ReportsPage() {
  const { result } = await loadForWorkspace<unknown>(ENDPOINTS.reports);
  return (
    <>
      <PageHeader title="Rapports" description="Exports par mission et par site, générés et versionnés par le Core." />
      <ResourcePanel
        title="Rapports disponibles"
        result={result}
        columns={[
          { key: "title", label: "Rapport" },
          { key: "scope", label: "Périmètre" },
          { key: "format", label: "Format" },
          { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
          { key: "generated_at", label: "Généré le" },
        ]}
        empty={{ icon: BarChart3, title: "Aucun rapport", description: "Les exports de mission et de site apparaîtront ici une fois générés." }}
      />
    </>
  );
}
