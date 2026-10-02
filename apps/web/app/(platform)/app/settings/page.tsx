import { Bell, Plug, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/platform/format";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { coreFetch, getWorkspaceContext } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const { workspaceId: ws, failure } = await getWorkspaceContext();
  const [members, roles, notifications, integrations] = ws
    ? await Promise.all([
        coreFetch<unknown>(ENDPOINTS.settings.members(ws), { workspaceId: ws }),
        coreFetch<unknown>(ENDPOINTS.settings.roles(ws), { workspaceId: ws }),
        coreFetch<unknown>(ENDPOINTS.settings.notifications(ws), { workspaceId: ws }),
        coreFetch<unknown>(ENDPOINTS.settings.integrations(ws), { workspaceId: ws }),
      ])
    : [failure, failure, failure, failure];

  return (
    <>
      <PageHeader title="Paramètres" description="Équipe, sites, rôles, notifications et intégrations." />
      <div className="grid gap-5 xl:grid-cols-2">
        <ResourcePanel
          title="Équipe"
          result={members}
          columns={[
            { key: "name", label: "Membre" },
            { key: "email", label: "E-mail" },
            { key: "role", label: "Rôle" },
          ]}
          empty={{ icon: Users, title: "Aucun membre", description: "Invitez votre équipe sur ce site." }}
        />
        <ResourcePanel
          title="Rôles"
          result={roles}
          columns={[
            { key: "name", label: "Rôle" },
            { key: "description", label: "Description" },
          ]}
          empty={{ icon: ShieldCheck, title: "Aucun rôle défini" }}
        />
        <ResourcePanel
          title="Notifications"
          result={notifications}
          columns={[
            { key: "event", label: "Événement" },
            { key: "channel", label: "Canal" },
            { key: "enabled", label: "Actif" },
          ]}
          empty={{ icon: Bell, title: "Préférences par défaut", description: "Aucune préférence personnalisée." }}
        />
        <ResourcePanel
          title="Intégrations"
          description="Connecteurs gérés par le Core (comptes de service)."
          result={integrations}
          columns={[
            { key: "name", label: "Intégration" },
            { key: "status", label: "État", render: (row) => <StatusBadge value={row.status} /> },
            { key: "last_sync_at", label: "Dernière synchro" },
          ]}
          empty={{ icon: Plug, title: "Aucune intégration", description: "Les connecteurs actifs apparaîtront ici." }}
        />
      </div>
    </>
  );
}
