"use client";

import { Check, Loader2, RotateCw, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

async function call(workspaceId: string, path: string, body?: unknown) {
  const res = await fetch(`/api/core/workspaces/${workspaceId}/communications${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-gsms-workspace-id": workspaceId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: (data as { error?: string }).error };
}

/** Prépare la relance des pièces manquantes relevées par le Digest (messages à valider ensuite). */
export function MissingPiecesButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const r = await call(workspaceId, "/relance-pieces");
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Préparation impossible.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="contrast" onClick={() => void run()} disabled={busy || pending}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        Relancer les pièces manquantes
      </Button>
      {error ? <span className="text-[12.5px] text-destructive">{error}</span> : null}
    </div>
  );
}

/** Valider (envoie), renvoyer après un échec, ou annuler un message. */
export function MessageActions({ workspaceId, messageId, status }: { workspaceId: string; messageId: string; status: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(kind: "valider" | "renvoyer" | "annuler") {
    setBusy(kind);
    setError(null);
    const body = kind === "annuler" ? { reason: "Annulé depuis la messagerie" } : undefined;
    const r = await call(workspaceId, `/${messageId}/${kind}`, body);
    setBusy(null);
    if (!r.ok) setError(r.error ?? "Action impossible.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "TO_VALIDATE" ? (
        <Button size="sm" onClick={() => void act("valider")} disabled={Boolean(busy)}>
          {busy === "valider" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
          Valider et envoyer
        </Button>
      ) : null}
      {status === "FAILED" ? (
        <Button size="sm" variant="outline" onClick={() => void act("renvoyer")} disabled={Boolean(busy)}>
          <RotateCw className="size-4" aria-hidden /> Renvoyer
        </Button>
      ) : null}
      {status === "TO_VALIDATE" || status === "FAILED" || status === "QUEUED" ? (
        <Button size="sm" variant="ghost" onClick={() => void act("annuler")} disabled={Boolean(busy)}>
          <X className="size-4" aria-hidden /> Annuler
        </Button>
      ) : null}
      {error ? <span className="text-[12.5px] text-destructive">{error}</span> : null}
    </div>
  );
}
