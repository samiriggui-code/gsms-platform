"use client";

import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

export type WorkspaceOption = { id: string; name: string };

/** Sélecteur de site (workspace). Le choix est mémorisé côté serveur (cookie) ; le Core revérifie le membership. */
export function WorkspaceSwitcher({
  workspaces,
  currentId,
  disabled,
}: {
  workspaces: WorkspaceOption[];
  currentId: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onChange(workspaceId: string) {
    setError(null);
    const res = await fetch("/api/session/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    if (!res.ok) {
      setError("Changement de site impossible.");
      return;
    }
    startTransition(() => router.refresh());
  }

  const empty = workspaces.length === 0;

  return (
    <div className="flex min-w-0 items-center">
      <label htmlFor={id} className="sr-only">
        Site courant
      </label>
      <div className="relative flex min-w-0 items-center">
        <MapPin className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" aria-hidden />
        <select
          id={id}
          value={currentId ?? ""}
          disabled={disabled || empty || pending}
          onChange={(event) => void onChange(event.target.value)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-9 max-w-[170px] min-w-0 truncate rounded-[10px] border border-border bg-background pr-7 pl-7 text-[12.5px] font-medium disabled:opacity-60 sm:max-w-[240px]"
        >
          {empty ? <option value="">{disabled ? "Sites indisponibles" : "Aucun site"}</option> : null}
          {!empty && !currentId ? <option value="">Choisir un site…</option> : null}
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <span id={`${id}-error`} role="alert" className="sr-only">
          {error}
        </span>
      ) : null}
    </div>
  );
}
