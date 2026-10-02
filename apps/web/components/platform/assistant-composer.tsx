"use client";

import { Loader2, Send } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

type Reply = { reply?: string; conversation_id?: string; proposals?: unknown[] };

/**
 * Composeur de l'assistant. Passe par /api/core/* (relais authentifié) :
 * le navigateur ne connaît ni l'URL du Core ni le jeton.
 */
export function AssistantComposer({ workspaceId, disabled }: { workspaceId: string | null; disabled: boolean }) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [exchanges, setExchanges] = useState<{ q: string; a: string; proposals: number }[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) return;
    const form = event.currentTarget;
    const message = String(new FormData(form).get("message") ?? "").trim();
    if (!message) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/core/workspaces/${encodeURIComponent(workspaceId)}/assistant/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-gsms-workspace-id": workspaceId },
        body: JSON.stringify({ message, conversation_id: conversationId }),
      });
      const data = (await res.json().catch(() => ({}))) as Reply & { error?: string };
      if (!res.ok) throw new Error(res.status === 503 ? "Core indisponible : l'assistant ne peut pas répondre." : (data.error ?? "Erreur de l'assistant."));
      setConversationId(data.conversation_id ?? conversationId);
      setExchanges((prev) => [...prev, { q: message, a: data.reply ?? "", proposals: data.proposals?.length ?? 0 }]);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de l'assistant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {exchanges.length > 0 ? (
        <ol aria-live="polite" className="flex flex-col gap-4">
          {exchanges.map((exchange, index) => (
            <li key={index} className="flex flex-col gap-2">
              <p className="ml-auto max-w-[85%] rounded-[14px] bg-foreground px-4 py-2.5 text-[13.5px] text-background">{exchange.q}</p>
              <div className="max-w-[85%] rounded-[14px] border border-border bg-surface-subtle px-4 py-2.5 text-[13.5px]/[1.6] whitespace-pre-wrap">
                {exchange.a || <span className="text-muted-foreground">Réponse vide.</span>}
                {exchange.proposals > 0 ? (
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">{exchange.proposals} proposition(s) à valider par un humain.</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <label htmlFor={id} className="text-[13px] font-medium">
          Votre question
        </label>
        <Textarea
          id={id}
          name="message"
          rows={3}
          disabled={disabled || pending}
          placeholder={disabled ? "Assistant indisponible tant que le Core ne répond pas." : "Ex. : quelles échéances arrivent dans les 7 prochains jours ?"}
        />
        {error ? (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">L&apos;assistant explique et propose ; les décisions restent humaines.</p>
          <Button type="submit" variant="contrast" disabled={disabled || pending} aria-busy={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            Envoyer
          </Button>
        </div>
      </form>
    </div>
  );
}
