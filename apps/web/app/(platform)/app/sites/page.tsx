import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { coreFetch } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";

export const metadata: Metadata = { title: "Sites" };

export default async function SitesPage() {
  const result = await coreFetch<unknown>(ENDPOINTS.workspaces.list());
  return (
    <>
      <PageHeader title="Sites" description="Fiche site, documents, audits, actions et missions de chaque établissement." />
      <ResourcePanel
        title="Sites accessibles"
        description="Chaque site est un espace de travail : ses données restent cloisonnées."
        result={result}
        columns={[
          { key: "name", label: "Site", render: (row) => String(row.label ?? row.name ?? "—") },
          { key: "organization_name", label: "Organisation" },
          { key: "address", label: "Adresse" },
          { key: "open_missions", label: "Missions en cours" },
          { key: "open_actions", label: "Actions ouvertes" },
        ]}
        empty={{ icon: MapPin, title: "Aucun site", description: "Aucun site n'est rattaché à votre compte. Un administrateur peut vous y inviter depuis Paramètres." }}
      />
    </>
  );
}
