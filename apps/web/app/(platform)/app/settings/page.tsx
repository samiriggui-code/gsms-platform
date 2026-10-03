import { Bell } from "lucide-react";
import type { Metadata } from "next";
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
import {
  RolesMatrix,
  SsoApplications,
  TeamSettings,
  type RolesData,
  type SsoClients,
  type TeamData,
} from "@/components/platform/team-settings";
import { coreFetch, getWorkspaceContext } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const { workspaceId: ws, failure } = await getWorkspaceContext();
  const notifications = ws
    ? await coreFetch<unknown>(ENDPOINTS.settings.notifications(ws), { workspaceId: ws })
    : failure;
  // Équipe, rôles et réglages plateforme : rôles visibles par toute l'équipe GSMS ; le reste seulement pour le
  // super admin et les administrateurs (403 sinon).
  const [roles, team, sso, mail, llm, relances, rules] = await Promise.all([
    coreFetch<RolesData>(ENDPOINTS.admin.roles()),
    coreFetch<TeamData>(ENDPOINTS.admin.team()),
    coreFetch<SsoClients>(ENDPOINTS.admin.ssoClients()),
    coreFetch<MailSettings>(ENDPOINTS.admin.mail()),
    coreFetch<LlmSettings>(ENDPOINTS.admin.llm()),
    coreFetch<RelanceSettings>(ENDPOINTS.admin.relances()),
    coreFetch<RelanceRule[]>(ENDPOINTS.admin.relanceRules()),
  ]);
  const isPlatformAdmin = mail.ok && llm.ok;

  return (
    <>
      <PageHeader title="Paramètres" description="Équipe, rôles, applications connectées, messagerie et notifications." />
      {team.ok && roles.ok ? (
        <div className="mb-8 flex flex-col gap-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Équipe et accès</p>
          <TeamSettings initial={team.data} roles={roles.data} />
          <RolesMatrix roles={roles.data} />
          {sso.ok ? <SsoApplications initial={sso.data} /> : null}
        </div>
      ) : roles.ok ? (
        <div className="mb-8">
          <RolesMatrix roles={roles.data} />
        </div>
      ) : null}
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
      {/* Préférences de notification : pas encore servies par le Core (404) → panneau masqué jusque-là. */}
      {notifications && (notifications.ok || notifications.kind !== "not_found") ? (
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
      ) : null}
    </>
  );
}
