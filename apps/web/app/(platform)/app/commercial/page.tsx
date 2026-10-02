import { FileSignature, Handshake } from "lucide-react";
import type { Metadata } from "next";
import { formatAmount, StatusBadge } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { coreFetch, getWorkspaceContext } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";

export const metadata: Metadata = { title: "Commercial" };

export default async function CommercialPage() {
  const { workspaceId: ws, failure } = await getWorkspaceContext();
  const [opportunities, quotes] = ws
    ? await Promise.all([
        coreFetch<unknown>(ENDPOINTS.commercial.opportunities(ws), { workspaceId: ws }),
        coreFetch<unknown>(ENDPOINTS.commercial.quotes(ws), { workspaceId: ws }),
      ])
    : [failure, failure];

  return (
    <>
      <PageHeader title="Commercial" description="Opportunités et devis. Le pipeline complet reste dans l'outil commercial expert, ouvert par lien profond." />
      <div className="grid gap-5">
        <ResourcePanel
          title="Opportunités"
          result={opportunities}
          columns={[
            { key: "title", label: "Opportunité" },
            { key: "client", label: "Client" },
            { key: "stage", label: "Étape", render: (row) => <StatusBadge value={row.stage} /> },
            { key: "amount", label: "Montant", render: (row) => formatAmount(row.amount) },
            { key: "updated_at", label: "Mise à jour" },
          ]}
          empty={{ icon: Handshake, title: "Aucune opportunité", description: "Les demandes entrantes qualifiées et opportunités apparaîtront ici." }}
        />
        <ResourcePanel
          title="Devis"
          result={quotes}
          columns={[
            { key: "reference", label: "Référence" },
            { key: "client", label: "Client" },
            { key: "amount", label: "Montant", render: (row) => formatAmount(row.amount) },
            { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
            { key: "issued_at", label: "Émis le" },
          ]}
          empty={{ icon: FileSignature, title: "Aucun devis", description: "Les devis émis pour ce site apparaîtront ici." }}
        />
      </div>
    </>
  );
}
