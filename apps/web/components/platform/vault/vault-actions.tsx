"use client";

import { FolderPlus, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type DragEvent, type FormEvent, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** Dépôt dans le dossier courant (glisser-déposer ou sélection) : chiffré et analysé par le Core. */
export function VaultUpload({ workspaceId, folderId }: { workspaceId: string; folderId: string }) {
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function send(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    for (const [index, file] of list.entries()) {
      setBusy(`${index + 1}/${list.length} · ${file.name}`);
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("folder_id", folderId);
      const res = await fetch(`/api/vault/${workspaceId}/upload`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(`${file.name} : ${body.error ?? "dépôt refusé"}`);
        break;
      }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    startTransition(() => router.refresh());
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) void send(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed px-4 py-4 text-[13px] text-muted-foreground transition-colors",
          dragging ? "border-primary bg-primary/[0.06] text-primary" : "border-border hover:border-foreground/30",
          busy ? "pointer-events-none opacity-70" : "",
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
        <span>{busy ? `Chiffrement et dépôt… ${busy}` : "Déposer des fichiers ici, ou cliquer pour choisir"}</span>
        <input
          id={inputId}
          ref={input}
          type="file"
          multiple
          className="sr-only"
          disabled={Boolean(busy)}
          onChange={(event) => event.target.files?.length && void send(event.target.files)}
        />
      </label>
      {error ? (
        <p role="alert" className="text-[12.5px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Nouveau sous-dossier dans le dossier courant. */
export function VaultNewFolder({ workspaceId, parentId }: { workspaceId: string; parentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch(`/api/core/workspaces/${workspaceId}/vault/folders`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-gsms-workspace-id": workspaceId },
      body: JSON.stringify({ name, parent_id: parentId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Création impossible.");
      return;
    }
    setName("");
    setOpen(false);
    startTransition(() => router.refresh());
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FolderPlus className="size-4" aria-hidden /> Nouveau dossier
      </Button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        autoFocus
        aria-label="Nom du dossier"
        value={name}
        maxLength={200}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nom du dossier"
        className="h-8 w-48 text-[13px]"
      />
      <Button type="submit" size="sm" variant="contrast" disabled={pending || !name.trim()}>
        Créer
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Annuler
      </Button>
      {error ? <span className="text-[12px] text-destructive">{error}</span> : null}
    </form>
  );
}

type VerifyResult = { ok: boolean; detail: string };

/** Relit et déchiffre toutes les versions : authentification des blocs + empreinte SHA-256. */
export function VaultVerify({ workspaceId, documentId }: { workspaceId: string; documentId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "ko">("idle");
  const [detail, setDetail] = useState<string | null>(null);

  async function run() {
    setState("busy");
    const res = await fetch(`/api/core/workspaces/${workspaceId}/vault/documents/${documentId}/verify`, {
      method: "POST",
      headers: { "x-gsms-workspace-id": workspaceId },
    });
    const body = (await res.json().catch(() => null)) as VerifyResult[] | { error?: string } | null;
    if (!res.ok || !Array.isArray(body)) {
      setState("ko");
      setDetail((body as { error?: string } | null)?.error ?? "Vérification impossible.");
      return;
    }
    const failed = body.find((v) => !v.ok);
    setState(failed ? "ko" : "ok");
    setDetail(failed ? failed.detail : `${body.length} version(s) intègre(s)`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => void run()} disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
        Vérifier l’intégrité
      </Button>
      {detail ? (
        <span className={cn("text-[12.5px]", state === "ko" ? "text-destructive" : "text-success")}>{detail}</span>
      ) : null}
    </div>
  );
}
