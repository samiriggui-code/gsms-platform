import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import { AssistantComposer } from "@/components/platform/assistant-composer";
import { PageHeader } from "@/components/platform/page-header";
import { ResourcePanel } from "@/components/platform/resource-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { loadForWorkspace } from "@/lib/core/load";

export const metadata: Metadata = { title: "Assistant" };

export default async function AssistantPage() {
  const { workspaceId, result } = await loadForWorkspace<unknown>(ENDPOINTS.assistant.conversations);
  const available = !!result?.ok;

  return (
    <>
      <PageHeader
        title="Assistant"
        description="Posez vos questions sur le site : missions, documents, échéances, appels d'offres. Lecture d'abord ; toute écriture est une proposition à valider."
      />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <AssistantComposer workspaceId={workspaceId} disabled={!available} />
          </CardContent>
        </Card>
        <ResourcePanel
          title="Conversations récentes"
          result={result}
          columns={[
            { key: "title", label: "Sujet" },
            { key: "updated_at", label: "Dernier échange" },
          ]}
          empty={{ icon: MessagesSquare, title: "Aucune conversation", description: "Vos échanges avec l'assistant apparaîtront ici." }}
        />
      </div>
    </>
  );
}
