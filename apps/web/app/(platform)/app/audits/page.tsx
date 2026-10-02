import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { loadForWorkspace } from "@/lib/core/load";

export const metadata: Metadata = { title: "Audits" };

export default async function AuditsPage() {
  const { result } = await loadForWorkspace<unknown>(ENDPOINTS.audits);
  return (
    <>
      <PageHeader
        title="Audits"
        description="Évaluations et rapports du site. La saisie terrain se fait dans l'outil d'audit expert, ouvert par lien profond fourni par le Core."
      />
      <ResourcePanel
        title="Évaluations"
        result={result}
        columns={[
          { key: "title", label: "Audit" },
          { key: "framework", label: "Référentiel" },
          { key: "score", label: "Score" },
          { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
          { key: "performed_at", label: "Date" },
          {
            key: "external_url",
            label: "Saisie terrain",
            render: (row) =>
              typeof row.external_url === "string" ? (
                <a href={row.external_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
                  Ouvrir l&apos;outil expert<span className="sr-only"> (nouvel onglet)</span>
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
        ]}
        empty={{ icon: ClipboardCheck, title: "Aucun audit", description: "Les évaluations synchronisées par le Core apparaîtront ici avec leur rapport." }}
      />
    </>
  );
}
