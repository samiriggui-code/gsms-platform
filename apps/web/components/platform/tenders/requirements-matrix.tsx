"use client";

import { FileSearch, Loader2, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, Fragment, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type Requirement = {
  id: string;
  code: string;
  origin: string;
  type: string;
  type_label: string;
  text: string;
  mandatory: boolean;
  source?: { document_id?: string; page?: number | null; filename?: string } | null;
  source_label?: string | null;
  planned_response?: string | null;
  evidence?: string | null;
  target_document?: string | null;
  owner?: string | null;
  status: string;
  stale: boolean;
  updated_by?: string | null;
  updated_at?: string | null;
};

export type Compliance = {
  summary: {
    total: number;
    stale: number;
    mandatory: number;
    mandatory_covered: number;
    coverage_rate: number | null;
    by_status: Record<string, number>;
    unassigned: number;
  };
  types: Record<string, string>;
  targets: Record<string, string>;
  rows: Requirement[];
};

const STATUSES: { value: string; label: string }[] = [
  { value: "TODO", label: "À faire" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COVERED", label: "Couverte" },
  { value: "PARTIAL", label: "Partielle" },
  { value: "BLOCKED", label: "Bloquée" },
  { value: "NOT_APPLICABLE", label: "Sans objet" },
];
const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));
const STATUS_TONE: Record<string, "neutral" | "primary" | "success" | "warning" | "danger"> = {
  TODO: "neutral",
  IN_PROGRESS: "primary",
  COVERED: "success",
  PARTIAL: "warning",
  BLOCKED: "danger",
  NOT_APPLICABLE: "neutral",
};

function sourceHref(workspaceId: string, r: Requirement): string | null {
  const id = r.source?.document_id;
  if (!id) return null;
  const page = r.source?.page ? `#page=${r.source.page}` : "";
  return `/api/vault/${workspaceId}/documents/${id}/content${page}`;
}

function Source({ workspaceId, r }: { workspaceId: string; r: Requirement }) {
  const href = sourceHref(workspaceId, r);
  const label = r.source_label ?? "—";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline">
      <FileSearch className="size-3 shrink-0" aria-hidden />
      {label}
    </a>
  ) : (
    <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
  );
}

async function send(path: string, method: "POST" | "PATCH", body?: unknown) {
  const res = await fetch(`/api/core/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  const data = await res?.json().catch(() => ({}));
  if (!res || !res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Action refusée.");
  return data;
}

/** Matrice d'exigences : « exigences » (lecture, provenance, ajout) ou « conformité » (réponses, statuts). */
export function RequirementsMatrix({
  workspaceId,
  missionId,
  data,
  mode,
}: {
  workspaceId: string;
  missionId: string;
  data: Compliance;
  mode: "exigences" | "conformite";
}) {
  const router = useRouter();
  const base = `workspaces/${workspaceId}/tenders/${missionId}/requirements`;
  const [rows, setRows] = useState(data.rows);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [mandatoryOnly, setMandatoryOnly] = useState(false);
  const [showStale, setShowStale] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (showStale || !r.stale) &&
        (!type || r.type === type) &&
        (!status || r.status === status) &&
        (!mandatoryOnly || r.mandatory) &&
        (!needle || `${r.code} ${r.text} ${r.owner ?? ""} ${r.source_label ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [rows, q, type, status, mandatoryOnly, showStale]);

  const usedTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.type))), [rows]);

  async function patch(id: string, changes: Partial<Requirement>) {
    setError(null);
    try {
      const updated = (await send(`${base}/${id}`, "PATCH", changes)) as Requirement;
      setRows((current) => current.map((r) => (r.id === id ? updated : r)));
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function sync() {
    setError(null);
    try {
      const report = (await send(`${base}/sync`, "POST")) as { added: number; refreshed: number; stale: number };
      setNotice(`${report.added} nouvelle(s), ${report.refreshed} mise(s) à jour, ${report.stale} disparue(s) du DCE.`);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const s = data.summary;
  return (
    <div className="flex flex-col gap-5">
      {mode === "conformite" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Obligatoires couvertes" value={`${s.mandatory_covered} / ${s.mandatory}`} hint={s.coverage_rate === null ? "Aucune exigence obligatoire" : `${Math.round(s.coverage_rate * 100)} %`} />
          <Stat label="À traiter" value={String((s.by_status.TODO ?? 0) + (s.by_status.IN_PROGRESS ?? 0))} hint="à faire ou en cours" />
          <Stat label="Partielles ou bloquées" value={String((s.by_status.PARTIAL ?? 0) + (s.by_status.BLOCKED ?? 0))} hint="à arbitrer" tone={(s.by_status.BLOCKED ?? 0) > 0 ? "danger" : undefined} />
          <Stat label="Sans responsable" value={String(s.unassigned)} hint={s.stale ? `${s.stale} exigence(s) disparue(s) du DCE` : "à attribuer"} />
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{mode === "conformite" ? "Matrice de conformité" : "Exigences du DCE"}</CardTitle>
            {mode === "exigences" ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void sync()} disabled={pending}>
                  {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
                  Relire le DCE
                </Button>
                <Button size="sm" variant="outline" onClick={() => setOpen(open === "new" ? null : "new")}>
                  <Plus className="size-3.5" aria-hidden />
                  Ajouter une exigence
                </Button>
              </div>
            ) : null}
          </div>
          {open === "new" ? (
            <NewRequirement
              types={data.types}
              onCancel={() => setOpen(null)}
              onCreate={async (body) => {
                setError(null);
                try {
                  const created = (await send(base, "POST", body)) as Requirement;
                  setRows((current) => [...current, created]);
                  setOpen(null);
                  startTransition(() => router.refresh());
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <Input aria-label="Rechercher" placeholder="Rechercher (code, texte, responsable, source)…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 text-[13px]" />
            <Select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} className="h-9 text-[13px]">
              <option value="">Tous les types</option>
              {usedTypes.map((t) => (
                <option key={t} value={t}>
                  {data.types[t] ?? t}
                </option>
              ))}
            </Select>
            <Select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 text-[13px]">
              <option value="">Tous les statuts</option>
              {STATUSES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={mandatoryOnly} onChange={(e) => setMandatoryOnly(e.target.checked)} />
                Obligatoires
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={showStale} onChange={(e) => setShowStale(e.target.checked)} />
                Disparues
              </label>
            </div>
          </div>
          {notice ? <p role="status" className="text-[12.5px] text-muted-foreground">{notice}</p> : null}
          {error ? (
            <p role="alert" className="text-[12.5px] text-destructive">
              {error}
            </p>
          ) : null}
        </CardHeader>

        {rows.length === 0 ? (
          <CardContent className="text-[13px] text-muted-foreground">
            Aucune exigence pour l&apos;instant. Déposez le DCE (onglet « DCE / Pièces ») : la matrice se remplit après l&apos;analyse.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="border-y border-border/70 bg-surface-subtle font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Réf.</th>
                  <th className="px-4 py-2.5 font-medium">Exigence</th>
                  {mode === "exigences" ? (
                    <>
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Source</th>
                      <th className="px-4 py-2.5 font-medium">Statut</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-2.5 font-medium">Statut</th>
                      <th className="px-4 py-2.5 font-medium">Responsable</th>
                      <th className="px-4 py-2.5 font-medium">Document cible</th>
                      <th className="px-4 py-2.5 font-medium">Réponse</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visible.map((r) => (
                  <Fragment key={r.id}>
                    <tr className={cn("align-top", r.stale && "opacity-60")}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11.5px]">{r.code}</td>
                      <td className="px-4 py-3">
                        <p className="max-w-[46ch] leading-5">{r.text}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {r.mandatory ? <Badge tone="warning">Obligatoire</Badge> : null}
                          {r.stale ? <Badge tone="danger">Disparue du DCE</Badge> : null}
                          {r.origin === "manual" ? <Badge>Ajout manuel</Badge> : null}
                          {mode === "conformite" ? <Source workspaceId={workspaceId} r={r} /> : null}
                        </div>
                      </td>
                      {mode === "exigences" ? (
                        <>
                          <td className="px-4 py-3">
                            <Badge tone="primary">{r.type_label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Source workspaceId={workspaceId} r={r} />
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <Select
                              aria-label={`Statut ${r.code}`}
                              value={r.status}
                              onChange={(e) => void patch(r.id, { status: e.target.value })}
                              className="h-8 min-w-[130px] text-[12.5px]"
                            >
                              {STATUSES.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              aria-label={`Responsable ${r.code}`}
                              defaultValue={r.owner ?? ""}
                              placeholder="Nom"
                              maxLength={200}
                              className="h-8 min-w-[140px] text-[12.5px]"
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                if (value !== (r.owner ?? "")) void patch(r.id, { owner: value });
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              aria-label={`Document cible ${r.code}`}
                              value={r.target_document ?? ""}
                              onChange={(e) => void patch(r.id, { target_document: e.target.value || null })}
                              className="h-8 min-w-[150px] text-[12.5px]"
                            >
                              <option value="">—</option>
                              {Object.entries(data.targets).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
                              {r.planned_response || r.evidence ? "Voir / modifier" : "Rédiger"}
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                    {mode === "conformite" && open === r.id ? (
                      <tr>
                        <td colSpan={6} className="bg-surface-subtle px-4 py-4">
                          <AnswerForm
                            r={r}
                            onSave={async (changes) => {
                              await patch(r.id, changes);
                              setOpen(null);
                            }}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {visible.length === 0 ? <p className="px-4 py-4 text-[13px] text-muted-foreground">Aucune exigence ne correspond à ces filtres.</p> : null}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" }) {
  return (
    <div className="surface-card flex flex-col gap-1 p-4">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
      <span className={cn("text-[24px]/[1.1] font-[680] tracking-[-0.03em]", tone === "danger" && "text-destructive")}>{value}</span>
      {hint ? <span className="text-[12px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function AnswerForm({ r, onSave }: { r: Requirement; onSave: (changes: Partial<Requirement>) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    await onSave({
      planned_response: String(form.get("planned_response") ?? ""),
      evidence: String(form.get("evidence") ?? ""),
    });
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="grid gap-3 lg:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`resp-${r.id}`}>Réponse prévue</Label>
        <Textarea id={`resp-${r.id}`} name="planned_response" defaultValue={r.planned_response ?? ""} maxLength={8000} className="min-h-24 text-[13px]" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`proof-${r.id}`}>Preuve (pièce, attestation, référence)</Label>
        <Textarea id={`proof-${r.id}`} name="evidence" defaultValue={r.evidence ?? ""} maxLength={4000} className="min-h-24 text-[13px]" />
      </div>
      <div className="flex items-center justify-between gap-3 lg:col-span-2">
        <span className="text-[12px] text-muted-foreground">
          {r.updated_by ? `Dernière modification : ${r.updated_by}` : "Jamais modifiée"}
        </span>
        <Button type="submit" size="sm" variant="contrast" disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

function NewRequirement({
  types,
  onCreate,
  onCancel,
}: {
  types: Record<string, string>;
  onCreate: (body: { text: string; type: string; mandatory: boolean }) => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    await onCreate({
      text: String(form.get("text") ?? "").trim(),
      type: String(form.get("type") ?? "obligation"),
      mandatory: form.get("mandatory") === "on",
    });
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[12px] border border-border p-3 sm:grid-cols-[1fr_220px]">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="req-text">Exigence</Label>
        <Textarea id="req-text" name="text" required minLength={3} maxLength={4000} className="min-h-20 text-[13px]" placeholder="Ex. : présenter un plan de continuité en cas de grève" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="req-type">Type</Label>
        <Select id="req-type" name="type" defaultValue="obligation" className="h-9 text-[13px]">
          {Object.entries(types).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-end justify-between gap-3">
        <label className="flex items-center gap-1.5 text-[13px]">
          <input type="checkbox" name="mandatory" defaultChecked />
          Obligatoire
        </label>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" size="sm" variant="contrast" disabled={busy}>
            Ajouter
          </Button>
        </div>
      </div>
    </form>
  );
}
