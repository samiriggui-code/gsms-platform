"use client";

import { AlertTriangle, CheckCircle2, FileSearch, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Source = { label: string; document_id?: string | null; page?: number | null; requirement_id?: string };
export type Dimension = { key: string; label: string; status: string; justification: string; sources: Source[] };
export type Feasibility = {
  status: string;
  dimensions: Dimension[];
  counts: Record<string, number>;
  profile_missing: string[];
};
type GridRow = { code: string; label: string; weight: number; score: number; eliminatory: boolean };

type StatusStyle = { label: string; tone: "success" | "warning" | "danger"; icon: typeof CheckCircle2; text: string };
const WARNING_STYLE: StatusStyle = { label: "À surveiller", tone: "warning", icon: AlertTriangle, text: "Faisable sous réserve : points à arbitrer avant de décider." };
const STATUS: Record<string, StatusStyle> = {
  READY: { label: "Prêt", tone: "success", icon: CheckCircle2, text: "Rien ne bloque : la réponse est faisable." },
  WARNING: WARNING_STYLE,
  BLOCKED: { label: "Bloqué", tone: "danger", icon: XCircle, text: "Au moins un point bloque la réponse en l'état." },
};

function SourceLink({ workspaceId, source }: { workspaceId: string; source: Source }) {
  const href = source.document_id ? `/api/vault/${workspaceId}/documents/${source.document_id}/content${source.page ? `#page=${source.page}` : ""}` : null;
  const content = (
    <>
      <FileSearch className="size-3 shrink-0" aria-hidden />
      {source.label}
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline">
      {content}
    </a>
  ) : (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">{content}</span>
  );
}

/** Matrice de faisabilité : statut global, puis chaque dimension avec sa justification et ses sources. */
export function FeasibilityMatrix({ workspaceId, feasibility }: { workspaceId: string; feasibility: Feasibility }) {
  const global = STATUS[feasibility.status] ?? WARNING_STYLE;
  const Icon = global.icon;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Faisabilité</CardTitle>
          <span className="font-mono text-[11px] text-muted-foreground">
            {feasibility.counts.READY ?? 0} prêt · {feasibility.counts.WARNING ?? 0} à surveiller · {feasibility.counts.BLOCKED ?? 0} bloqué
          </span>
        </div>
        <div
          className={cn(
            "flex items-start gap-3 rounded-[12px] border p-3 text-[13.5px]",
            global.tone === "success" && "border-success/25 bg-success/10",
            global.tone === "warning" && "border-warning/30 bg-warning/10",
            global.tone === "danger" && "border-destructive/25 bg-destructive/10",
          )}
        >
          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">{global.label}</span> — {global.text}
          </p>
        </div>
        {feasibility.profile_missing.length > 0 ? (
          <p className="text-[12.5px] text-muted-foreground">
            Profil GSMS incomplet ({feasibility.profile_missing.join(", ")}) :{" "}
            <Link href="/app/settings#profil-ao" className="text-primary hover:underline">
              le compléter dans les paramètres
            </Link>
            .
          </p>
        ) : null}
      </CardHeader>
      <ul className="divide-y divide-border/70">
        {feasibility.dimensions.map((d) => {
          const st = STATUS[d.status] ?? WARNING_STYLE;
          return (
            <li key={d.key} className="grid gap-1.5 px-5 py-3.5 sm:grid-cols-[200px_1fr]">
              <div className="flex items-center gap-2 sm:flex-col sm:items-start">
                <span className="text-[13px] font-medium">{d.label}</span>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] leading-5">{d.justification}</p>
                {d.sources.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {d.sources.map((s, i) => (
                      <SourceLink key={`${d.key}-${i}`} workspaceId={workspaceId} source={s} />
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const DEFAULT_GRID: GridRow[] = [
  { code: "adequation", label: "Adéquation au métier GSMS", weight: 3, score: 3, eliminatory: false },
  { code: "rentabilite", label: "Rentabilité attendue", weight: 2, score: 3, eliminatory: false },
  { code: "relation", label: "Relation avec l'acheteur", weight: 1, score: 3, eliminatory: false },
];

/** Grille de notation complémentaire (0 à 5 par critère) ; le score est calculé par le Core. */
export function GoNoGoGrid({
  workspaceId,
  missionId,
  initial,
  locked,
}: {
  workspaceId: string;
  missionId: string;
  initial: GridRow[];
  locked: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<GridRow[]>(initial.length ? initial : DEFAULT_GRID);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(index: number, changes: Partial<GridRow>) {
    setSaved(false);
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...changes } : r)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await fetch(`/api/core/workspaces/${workspaceId}/tenders/${missionId}/go-no-go/criteria`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        criteria: rows.map((r, i) => ({ ...r, code: r.code || `critere_${i + 1}`, label: r.label.trim() || `Critère ${i + 1}` })),
      }),
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (!res || !res.ok) {
      setError(typeof body?.error === "string" ? body.error : "Grille refusée.");
      return;
    }
    setSaved(true);
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-[13px]">
          <thead className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
            <tr>
              <th className="py-1.5 text-left font-medium">Critère</th>
              <th className="w-20 py-1.5 text-left font-medium">Poids</th>
              <th className="w-20 py-1.5 text-left font-medium">Note /5</th>
              <th className="w-24 py-1.5 text-left font-medium">Éliminatoire</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <Input aria-label="Critère" value={r.label} disabled={locked} onChange={(e) => update(i, { label: e.target.value })} className="h-8 text-[12.5px]" />
                </td>
                <td className="py-1 pr-2">
                  <Input aria-label="Poids" type="number" min={0} max={100} step="0.5" value={r.weight} disabled={locked} onChange={(e) => update(i, { weight: Number(e.target.value) })} className="h-8 text-[12.5px]" />
                </td>
                <td className="py-1 pr-2">
                  <Input aria-label="Note" type="number" min={0} max={5} step="0.5" value={r.score} disabled={locked} onChange={(e) => update(i, { score: Number(e.target.value) })} className="h-8 text-[12.5px]" />
                </td>
                <td className="py-1 pr-2">
                  <input aria-label="Éliminatoire" type="checkbox" checked={r.eliminatory} disabled={locked} onChange={(e) => update(i, { eliminatory: e.target.checked })} />
                </td>
                <td className="py-1">
                  {!locked && rows.length > 1 ? (
                    <Button type="button" size="icon" variant="ghost" aria-label="Retirer le critère" onClick={() => setRows((c) => c.filter((_, j) => j !== i))}>
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {locked ? (
        <p className="text-[12.5px] text-muted-foreground">Décision prise : la grille est figée.</p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRows((c) => [...c, { code: `critere_${c.length + 1}`, label: "", weight: 1, score: 3, eliminatory: false }])}
          >
            <Plus className="size-3.5" aria-hidden />
            Ajouter un critère
          </Button>
          <Button type="submit" size="sm" variant="contrast" disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Calculer le score
          </Button>
        </div>
      )}
      {saved ? <p role="status" className="text-[12.5px] text-muted-foreground">Score recalculé par le Core.</p> : null}
      {error ? (
        <p role="alert" className="text-[12.5px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
