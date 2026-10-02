import { ListChecks, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { coreFetch, getWorkspaceContext } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";

export const metadata: Metadata = { title: "Constats & actions" };

export default async function FindingsPage() {
  const { workspaceId: ws, failure } = await getWorkspaceContext();
  const [findings, actions] = ws
    ? await Promise.all([
        coreFetch<unknown>(ENDPOINTS.findings(ws), { workspaceId: ws }),
        coreFetch<unknown>(ENDPOINTS.actions(ws), { workspaceId: ws }),
      ])
    : [failure, failure];

  return (
    <>
      <PageHeader title="Constats & actions" description="Constats normalisés issus des audits, actions correctives et CAPA liées." />
      <div className="grid gap-5">
        <ResourcePanel
          title="Constats"
          result={findings}
          columns={[
            { key: "title", label: "Constat" },
            { key: "severity", label: "Sévérité", render: (row) => <StatusBadge value={row.severity} /> },
            { key: "source", label: "Source" },
            { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
            { key: "detected_at", label: "Relevé le" },
          ]}
          empty={{ icon: TriangleAlert, title: "Aucun constat", description: "Les constats d'audit normalisés par le Core apparaîtront ici." }}
        />
        <ResourcePanel
          title="Actions et CAPA"
          result={actions}
          columns={[
            { key: "title", label: "Action" },
            { key: "owner", label: "Responsable" },
            { key: "capa_ref", label: "CAPA" },
            { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
            { key: "due_at", label: "Échéance" },
          ]}
          empty={{ icon: ListChecks, title: "Aucune action", description: "Les actions correctives et CAPA liées aux constats apparaîtront ici." }}
        />
      </div>
    </>
  );
}
