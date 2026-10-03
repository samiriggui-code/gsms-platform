"use client";

import { FilePlus2, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type DragEvent, type FormEvent, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

async function postJson(path: string, body: unknown): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const res = await fetch(`/api/core/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res) return { ok: false, error: "Le portail est injoignable." };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: typeof data?.error === "string" ? data.error : `Refusé (${res.status}).` };
  return { ok: true, data };
}

/** Nouveau dossier AO : le Core crée un workspace dédié et sa référence WS-AO-AAAA-NNNN. */
export function NewTenderForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim() || undefined;
    const deadline = text("submission_deadline");
    const result = await postJson("tenders", {
      title: text("title"),
      buyer: text("buyer"),
      consultation_ref: text("consultation_ref"),
      submission_deadline: deadline ? new Date(deadline).toISOString() : undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const ws = String(result.data.workspace_id ?? "");
    startTransition(() => router.push(`/app/tenders/${encodeURIComponent(ws)}/pieces`));
  }

  if (!open) {
    return (
      <Button variant="contrast" size="sm" onClick={() => setOpen(true)}>
        <FilePlus2 className="size-4" aria-hidden />
        Nouveau dossier AO
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="surface-card grid w-full gap-3 p-5 sm:grid-cols-2" aria-label="Nouveau dossier d'appel d'offres">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="ao-title">Objet du marché</Label>
        <Input id="ao-title" name="title" required maxLength={300} placeholder="Gardiennage et sécurité incendie du CHU…" autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ao-buyer">Acheteur</Label>
        <Input id="ao-buyer" name="buyer" maxLength={300} placeholder="Hospices civils de Lyon" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ao-ref">Référence de la consultation</Label>
        <Input id="ao-ref" name="consultation_ref" maxLength={120} placeholder="2026-AO-017" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ao-deadline">Date limite de remise</Label>
        <Input id="ao-deadline" name="submission_deadline" type="datetime-local" />
      </div>
      <div className="flex items-end justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" variant="contrast" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FilePlus2 className="size-4" aria-hidden />}
          Créer le dossier
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-[12.5px] text-destructive sm:col-span-2">
          {error}
        </p>
      ) : null}
    </form>
  );
}

type DceResult = { files?: { filename: string; version_created: boolean }[]; skipped?: { name: string; reason: string }[] };

/** Dépôt du DCE (fichiers ou ZIP) : rangé dans « Dossier de consultation » puis analysé par le Core. */
export function DceUpload({ workspaceId, missionId }: { workspaceId: string; missionId: string }) {
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function send(files: FileList | File[]) {
    setError(null);
    setReport(null);
    setBusy(true);
    const form = new FormData();
    for (const file of Array.from(files)) form.append("files", file, file.name);
    const res = await fetch(`/api/tenders/${workspaceId}/${missionId}/dce`, { method: "POST", body: form }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as DceResult & { error?: string };
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!res || !res.ok) {
      setError(body?.error ?? "Dépôt refusé.");
      return;
    }
    const added = body.files?.filter((f) => f.version_created).length ?? 0;
    const same = (body.files?.length ?? 0) - added;
    const parts = [`${added} pièce${added > 1 ? "s" : ""} reçue${added > 1 ? "s" : ""}, analyse en cours`];
    if (same) parts.push(`${same} déjà présente${same > 1 ? "s" : ""}`);
    for (const s of body.skipped ?? []) parts.push(`ignoré : ${s.name} (${s.reason})`);
    setReport(parts.join(" · "));
    startTransition(() => router.refresh());
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) void send(event.dataTransfer.files);
  }

  return (
    <div className="mb-5 flex flex-col gap-2">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed px-4 py-6 text-center text-[13px] text-muted-foreground transition-colors",
          dragging ? "border-primary bg-primary/[0.06] text-primary" : "border-border hover:border-foreground/30",
          busy ? "pointer-events-none opacity-70" : "",
        )}
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          {busy ? "Chiffrement et dépôt du DCE…" : "Déposer le DCE"}
        </span>
        <span>Glissez le ZIP ou les pièces (RC, CCTP, CCAP, AE, BPU, DPGF, DQE, annexes), ou cliquez pour choisir.</span>
        <input
          id={inputId}
          ref={input}
          type="file"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(event) => event.target.files?.length && void send(event.target.files)}
        />
      </label>
      {report ? <p className="text-[12.5px] text-muted-foreground" role="status">{report}</p> : null}
      {error ? (
        <p role="alert" className="text-[12.5px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Transition = { to: string; label: string; comment_required: boolean; requires_go: boolean };

/** Boutons de validation du dossier ; chaque passage est une décision humaine, motivée quand il le faut. */
export function DossierStatusActions({
  workspaceId,
  missionId,
  transitions,
  decision,
}: {
  workspaceId: string;
  missionId: string;
  transitions: Transition[];
  decision: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Transition | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function apply(t: Transition, note?: string) {
    setError(null);
    const result = await postJson(`workspaces/${workspaceId}/tenders/${missionId}/status`, { to: t.to, comment: note || undefined });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSelected(null);
    setComment("");
    startTransition(() => router.refresh());
  }

  if (transitions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => {
          const blocked = t.requires_go && decision !== "GO";
          return (
            <Button
              key={t.to}
              size="sm"
              variant={t.to === "SUBMITTED" || t.to === "APPROVED" ? "contrast" : "outline"}
              disabled={pending || blocked}
              title={blocked ? "Décision GO requise (onglet Go / No-Go)" : undefined}
              onClick={() => (t.comment_required ? setSelected(t) : void apply(t))}
            >
              {t.label}
            </Button>
          );
        })}
      </div>
      {selected ? (
        <form
          className="flex flex-col gap-2 rounded-[12px] border border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void apply(selected, comment.trim());
          }}
        >
          <Label htmlFor="status-comment">
            {selected.to === "SUBMITTED" ? "Où et comment le dossier a été déposé (plateforme, accusé de réception)" : `Motif — ${selected.label}`}
          </Label>
          <Textarea id="status-comment" value={comment} onChange={(e) => setComment(e.target.value)} required maxLength={4000} className="min-h-20" />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setSelected(null)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" variant="contrast" disabled={pending || !comment.trim()}>
              Confirmer
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-[12.5px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Décision Go / No-Go : humaine, motivée, définitive. */
export function GoNoGoDecision({ workspaceId, missionId }: { workspaceId: string; missionId: string }) {
  const router = useRouter();
  const [choice, setChoice] = useState<"GO" | "NO_GO" | null>(null);
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choice) return;
    setError(null);
    const result = await postJson(`workspaces/${workspaceId}/tenders/${missionId}/go-no-go/decision`, {
      decision: choice,
      rationale: rationale.trim(),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={choice === "GO" ? "contrast" : "outline"} onClick={() => setChoice("GO")} aria-pressed={choice === "GO"}>
          Go
        </Button>
        <Button type="button" size="sm" variant={choice === "NO_GO" ? "contrast" : "outline"} onClick={() => setChoice("NO_GO")} aria-pressed={choice === "NO_GO"}>
          No-Go
        </Button>
      </div>
      {choice ? (
        <>
          <Label htmlFor="gng-rationale">Motivation (obligatoire)</Label>
          <Textarea id="gng-rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} required maxLength={4000} className="min-h-20" />
          <Button type="submit" size="sm" variant="contrast" disabled={pending || !rationale.trim()}>
            Enregistrer la décision {choice === "GO" ? "Go" : "No-Go"}
          </Button>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="text-[12.5px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}


/** Montant estimé et date limite du dossier : servent à la matrice de faisabilité (capacité financière, délai). */
export function TenderFactsForm({
  workspaceId,
  missionId,
  amount,
  deadline,
}: {
  workspaceId: string;
  missionId: string;
  amount: number | null;
  deadline: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const local = deadline ? new Date(deadline) : null;
  const localValue = local
    ? new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const rawAmount = String(form.get("estimated_amount") ?? "").replace(/\s/g, "").replace(",", ".");
    const rawDeadline = String(form.get("submission_deadline") ?? "");
    const res = await fetch(`/api/core/workspaces/${workspaceId}/tenders/${missionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estimated_amount: rawAmount ? Number(rawAmount) : null,
        submission_deadline: rawDeadline ? new Date(rawDeadline).toISOString() : null,
      }),
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (!res || !res.ok) {
      setError(typeof body?.error === "string" ? body.error : "Modification refusée.");
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Modifier le montant ou la date
      </Button>
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[12px] border border-border p-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="estimated_amount">Montant annuel estimé (€ HT)</Label>
        <Input id="estimated_amount" name="estimated_amount" inputMode="decimal" defaultValue={amount ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="submission_deadline">Date limite de remise</Label>
        <Input id="submission_deadline" name="submission_deadline" type="datetime-local" defaultValue={localValue} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <Button type="submit" size="sm" variant="contrast" disabled={pending}>
          Enregistrer
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-[12.5px] text-destructive sm:col-span-2">
          {error}
        </p>
      ) : null}
    </form>
  );
}
