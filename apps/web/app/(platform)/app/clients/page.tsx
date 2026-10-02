import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { loadForWorkspace } from "@/lib/core/load";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const { result } = await loadForWorkspace<unknown>(ENDPOINTS.clients);
  return (
    <>
      <PageHeader title="Clients" description="Organisations clientes, leurs sites et leurs contacts." />
      <ResourcePanel
        title="Organisations"
        description="Données consolidées par le Core (fiches clients et pipeline commercial)."
        result={result}
        columns={[
          { key: "name", label: "Organisation" },
          { key: "sites_count", label: "Sites" },
          { key: "contacts_count", label: "Contacts" },
          { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
          { key: "updated_at", label: "Mis à jour" },
        ]}
        empty={{ icon: Building2, title: "Aucun client pour l'instant", description: "Les organisations apparaîtront ici dès qu'elles seront créées dans le Core ou reprises depuis une demande entrante." }}
      />
    </>
  );
}
