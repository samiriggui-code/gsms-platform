import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Shell } from "@/components/platform/shell";
import { asList, coreFetch, getCurrentWorkspaceId, getMe } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";
import type { Workspace } from "@/lib/core/types";

// Toujours rendu à la demande : données par utilisateur, jamais mises en cache statique.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Plateforme", template: "%s — GSMS Plateforme" },
  robots: { index: false, follow: false },
};

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const me = await getMe();

  // Jeton refusé par le Core : on nettoie la session et on renvoie vers /login.
  if (!me.ok && me.kind === "unauthorized") redirect("/api/auth/logout?next=/app");

  let workspaces: Workspace[] = me.ok ? (me.data.workspaces ?? []) : [];
  if (me.ok && workspaces.length === 0) {
    const list = await coreFetch<unknown>(ENDPOINTS.workspaces.list());
    if (list.ok) workspaces = asList<Workspace>(list.data);
  }

  const currentWorkspaceId = me.ok ? await getCurrentWorkspaceId() : null;

  return (
    <Shell
      user={me.ok ? { name: me.data.name || me.data.email, email: me.data.email } : null}
      organizationName={me.ok ? (me.data.organization_name ?? null) : null}
      workspaces={workspaces.map((w) => ({ id: w.id, name: w.label ?? w.name }))}
      currentWorkspaceId={currentWorkspaceId}
      core={me.ok ? { ok: true } : { ok: false, message: me.message }}
    >
      {children}
    </Shell>
  );
}
