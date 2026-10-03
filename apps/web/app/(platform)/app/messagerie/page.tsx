import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { CoreFailureState, EmptyState } from "@/components/platform/core-state";
import { formatDate } from "@/components/platform/format";
import { MessageActions, MissingPiecesButton } from "@/components/platform/messaging-actions";
import { PageHeader } from "@/components/platform/page-header";
import { Badge } from "@/components/ui/badge";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { loadForWorkspace } from "@/lib/core/load";

export const metadata: Metadata = { title: "Messagerie" };

type Message = {
  id: string;
  reference: string;
  template: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body_text: string;
  status: "TO_VALIDATE" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
  created_at: string;
  validated_by: string | null;
  sent_at: string | null;
  attempts: number;
  last_error: string | null;
};

const STATUS: Record<Message["status"], { label: string; tone: "neutral" | "primary" | "success" | "warning" | "danger" }> = {
  TO_VALIDATE: { label: "À valider", tone: "warning" },
  QUEUED: { label: "En file", tone: "primary" },
  SENT: { label: "Envoyé", tone: "success" },
  FAILED: { label: "Échec", tone: "danger" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
};

export default async function MessagingPage() {
  const { workspaceId, result } = await loadForWorkspace<Message[]>(ENDPOINTS.communications.list);
  return (
    <>
      <PageHeader
        title="Messagerie"
        description="E-mails de la prestation courante. Rien ne part chez un client sans validation de l’équipe ; chaque envoi est journalisé."
        actions={workspaceId ? <MissingPiecesButton workspaceId={workspaceId} /> : undefined}
      />
      <div className="overflow-hidden rounded-[16px] border border-border bg-card">
        {!result ? (
          <EmptyState icon={Mail} title="Choisissez une prestation" description="Sélectionnez un site ou une prestation en haut de page." />
        ) : !result.ok ? (
          <CoreFailureState failure={result} />
        ) : result.data.length === 0 ? (
          <EmptyState icon={Mail} title="Aucun message" description="Les relances et notifications de cette prestation apparaîtront ici." />
        ) : (
          <ul className="divide-y divide-border">
            {result.data.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {m.reference} · {formatDate(m.created_at)}
                    </p>
                    <p className="truncate text-[14px] font-semibold">{m.subject}</p>
                    <p className="text-[12.5px] text-muted-foreground">
                      À : {m.recipient_name ? `${m.recipient_name} <${m.recipient_email}>` : m.recipient_email}
                    </p>
                  </div>
                  <Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge>
                </div>
                {m.last_error ? <p className="text-[12.5px] text-destructive">{m.last_error}</p> : null}
                <details className="text-[13px]">
                  <summary className="cursor-pointer text-muted-foreground">Aperçu du message</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-[10px] border border-border bg-surface-subtle p-3 font-sans">{m.body_text}</pre>
                </details>
                <MessageActions workspaceId={workspaceId ?? ""} messageId={m.id} status={m.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
