import { Bell, Plug, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/platform/format";
import {
  CoreDiagnostics,
  LlmSettingsForm,
  MailSettingsForm,
  RelancesSettingsForm,
  type LlmSettings,
  type MailSettings,
  type RelanceRule,
  type RelanceSettings,
} from "@/components/platform/admin-settings";
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
  // Réglages plateforme : seulement pour le super admin et les administrateurs de l'équipe (403 sinon).
  const [mail, llm, relances, rules] = await Promise.all([
    coreFetch<MailSettings>(ENDPOINTS.admin.mail()),
    coreFetch<LlmSettings>(ENDPOINTS.admin.llm()),
    coreFetch<RelanceSettings>(ENDPOINTS.admin.relances()),
    coreFetch<RelanceRule[]>(ENDPOINTS.admin.relanceRules()),
  ]);
  const isPlatformAdmin = mail.ok && llm.ok;

  return (
    <>
      <PageHeader title="Paramètres" description="Équipe, sites, rôles, notifications et intégrations." />
      {isPlatformAdmin ? (
        <div className="mb-8 flex flex-col gap-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Plateforme — administrateurs</p>
          <CoreDiagnostics />
          <div className="grid gap-5 xl:grid-cols-2">
            <MailSettingsForm initial={mail.data} />
            <LlmSettingsForm initial={llm.data} />
          </div>
          {relances.ok && rules.ok ? <RelancesSettingsForm initial={relances.data} rules={rules.data} /> : null}
        </div>
      ) : null}
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
