import { Bot, CalendarClock, FileStack, FileText, HelpCircle, History, ShieldAlert, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asList, type CoreResult } from "@/lib/core/client";
import type { Row } from "@/lib/core/types";
import type { TenderTab, TenderTabSlug } from "@/lib/tenders/tabs";
import { CoreFailureState, EmptyState, NoWorkspaceState } from "./core-state";
import { formatAmount, formatValue, StatusBadge } from "./format";
import { type Column, ResourcePanel } from "./resource-panel";
import { type Feasibility, FeasibilityMatrix, GoNoGoGrid } from "./tenders/go-no-go";
import { type Compliance, RequirementsMatrix } from "./tenders/requirements-matrix";
import { DceUpload, GoNoGoDecision } from "./tenders/tender-actions";

export function TabIntro({ tab, actions }: { tab: TenderTab; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-[650] tracking-[-0.025em]">{tab.label}</h2>
        <p className="max-w-2xl text-[13.5px]/[1.6] text-muted-foreground">{tab.description}</p>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground/80">Source : {tab.source}</p>
      </div>
      {actions}
    </div>
  );
}

/** Colonnes et états vides des onglets « liste ». */
const LIST_TABS: Partial<Record<TenderTabSlug, { columns: Column[]; empty: { title: string; description: string; icon: typeof FileText } }>> = {
  pieces: {
    columns: [
      { key: "label", label: "Pièce", render: (row) => <Badge tone={row.provided ? "primary" : "neutral"}>{String(row.label ?? row.kind ?? "—")}</Badge> },
      { key: "title", label: "Fichier" },
      { key: "required", label: "Attendue", render: (row) => (row.required ? "Oui" : "—") },
      { key: "provided", label: "Reçue", render: (row) => <StatusBadge value={row.provided ? "reçue" : "manquante"} /> },
      { key: "parse_status", label: "Analyse", render: (row) => <StatusBadge value={row.parse_status} /> },
      { key: "version", label: "Version" },
    ],
    empty: { icon: FileStack, title: "Aucune pièce", description: "Déposez le DCE (ZIP ou fichiers) : le Core classe les pièces (RC, CCTP, CCAP, AE, BPU, DPGF, DQE, annexes)." },
  },
  risques: {
    columns: [
      { key: "title", label: "Risque" },
      { key: "severity", label: "Gravité", render: (row) => <StatusBadge value={row.severity} /> },
      { key: "text", label: "Passage du DCE", className: "min-w-[280px]" },
      { key: "source", label: "Source", render: (row) => <span className="font-mono text-[11px] text-muted-foreground">{formatValue(row.source)}</span> },
    ],
    empty: { icon: ShieldAlert, title: "Aucun risque relevé", description: "Critères éliminatoires, pénalités et clauses de résiliation apparaissent après l'analyse du DCE." },
  },
  questions: {
    columns: [
      { key: "question", label: "Question", className: "min-w-[280px]" },
      { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
      { key: "asked_at", label: "Posée le" },
      { key: "answer", label: "Réponse" },
    ],
    empty: { icon: HelpCircle, title: "Aucune question", description: "Préparez ici les questions à l'acheteur avant la date limite." },
  },
  "reponse-technique": {
    columns: [
      { key: "title", label: "Section" },
      { key: "version", label: "Version" },
      { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
      { key: "updated_at", label: "Mise à jour" },
    ],
    empty: { icon: FileText, title: "Mémoire technique non commencé", description: "Les sections rédigées sont enregistrées comme documents versionnés." },
  },
  documents: {
    columns: [
      { key: "title", label: "Document" },
      { key: "kind", label: "Type" },
      { key: "folder", label: "Dossier" },
      { key: "version", label: "Version" },
      { key: "sha256", label: "Empreinte", render: (row) => <span className="font-mono text-[11px]">{row.sha256 ? `${String(row.sha256).slice(0, 12)}…` : "—"}</span> },
      { key: "parse_status", label: "Analyse", render: (row) => <StatusBadge value={row.parse_status} /> },
      { key: "updated_at", label: "Date" },
    ],
    empty: { icon: FileText, title: "Aucun document", description: "Pièces reçues et documents produits pour ce dossier, avec version et empreinte." },
  },
  echeances: {
    columns: [
      { key: "title", label: "Jalon" },
      { key: "due_at", label: "Date" },
      { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
      { key: "source", label: "Source", render: (row) => <span className="font-mono text-[11px] text-muted-foreground" title={typeof row.excerpt === "string" ? row.excerpt : undefined}>{formatValue(row.source)}</span> },
    ],
    empty: { icon: CalendarClock, title: "Aucun jalon", description: "Les dates du DCE (questions, visite, remise) apparaissent après l'analyse, avec la page d'origine." },
  },
  historique: {
    columns: [
      { key: "at", label: "Date" },
      { key: "type", label: "Événement" },
      { key: "actor", label: "Acteur" },
      { key: "summary", label: "Détail", className: "min-w-[260px]" },
    ],
    empty: { icon: History, title: "Aucun événement", description: "Le journal d'audit du dossier apparaîtra ici." },
  },
  agents: {
    columns: [
      { key: "task", label: "Tâche proposée", className: "min-w-[240px]" },
      { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
      { key: "requested_by", label: "Demandée par" },
      { key: "created_at", label: "Date" },
    ],
    empty: { icon: Bot, title: "Aucune tâche d'assistant", description: "Ex. : « prépare les pièces du DCE », « résume le CCTP ». Chaque proposition est validée par un humain." },
  },
};

export function TenderTabView({
  tab,
  result,
  workspaceId,
  missionId,
}: {
  tab: TenderTab;
  result: CoreResult<unknown> | null;
  workspaceId: string;
  missionId: string | null;
}) {
  const list = LIST_TABS[tab.slug];
  const actions = tabActions(tab.slug, !!result?.ok);

  if (list) {
    return (
      <>
        <TabIntro tab={tab} actions={actions} />
        {tab.slug === "pieces" && missionId && result?.ok ? <DceUpload workspaceId={workspaceId} missionId={missionId} /> : null}
        <ResourcePanel title={tab.label} result={result} columns={list.columns} empty={list.empty} />
      </>
    );
  }

  return (
    <>
      <TabIntro tab={tab} actions={actions} />
      {result === null ? (
        <Card><NoWorkspaceState /></Card>
      ) : !result.ok ? (
        <Card><CoreFailureState failure={result} /></Card>
      ) : (tab.slug === "exigences" || tab.slug === "conformite") && missionId ? (
        <RequirementsMatrix
          key={`${(result.data as Compliance).summary?.total}-${(result.data as Compliance).summary?.stale}`}
          workspaceId={workspaceId}
          missionId={missionId}
          data={result.data as Compliance}
          mode={tab.slug}
        />
      ) : tab.slug === "analyse" ? (
        <AnalysisView data={result.data as Record<string, unknown>} />
      ) : tab.slug === "go-no-go" ? (
        <GoNoGoView data={result.data as Record<string, unknown>} workspaceId={workspaceId} missionId={missionId} />
      ) : tab.slug === "reponse-financiere" ? (
        <FinancialView data={result.data as Record<string, unknown>} />
      ) : (
        <Card><EmptyState title="Vue non disponible" /></Card>
      )}
    </>
  );
}

/** Actions d'écriture à venir : affichées mais désactivées tant que les endpoints POST ne sont pas branchés. */
function tabActions(slug: TenderTabSlug, coreOk: boolean): ReactNode {
  const label: Partial<Record<TenderTabSlug, { text: string; icon: typeof Upload }>> = {
    questions: { text: "Nouvelle question", icon: HelpCircle },
    agents: { text: "Demander à l'assistant", icon: Bot },
  };
  const action = label[slug];
  if (!action) return null;
  return (
    <Button variant="outline" size="sm" disabled title={coreOk ? "Action à brancher sur l'endpoint POST du Core" : "Core indisponible"}>
      <action.icon className="size-3.5" aria-hidden />
      {action.text}
    </Button>
  );
}

function SimpleList({ title, rows, empty, render }: { title: string; rows: Row[]; empty: string; render: (row: Row) => ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {rows.length === 0 ? (
        <CardContent className="text-[13px] text-muted-foreground">{empty}</CardContent>
      ) : (
        <ul className="divide-y divide-border/70">
          {rows.map((row, index) => (
            <li key={String(row.id ?? index)} className="px-5 py-3 text-[13px]">
              {render(row)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AnalysisView({ data }: { data: Record<string, unknown> }) {
  const total = typeof data?.criteria_total === "number" ? data.criteria_total : null;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SimpleList
        title="Lecture du DCE par thème"
        rows={asList<Row>(data?.sections)}
        empty="Analyse pas encore disponible : déposez le DCE."
        render={(row) => (
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center justify-between gap-3 font-medium">
              {formatValue(row.title)}
              <span className="font-mono text-[11px] text-muted-foreground">{formatValue(row.count)}</span>
            </span>
            {row.summary ? <span className="text-muted-foreground">{String(row.summary)}</span> : null}
            {row.source ? <span className="font-mono text-[11px] text-muted-foreground">{String(row.source)}</span> : null}
          </div>
        )}
      />
      <div className="flex flex-col gap-3">
        <SimpleList
          title="Critères d'attribution"
          rows={asList<Row>(data?.criteria)}
          empty="Aucun critère pondéré trouvé dans le RC."
          render={(row) => (
            <div className="flex flex-col gap-0.5">
              <span className="flex justify-between gap-4">
                <span className="font-medium">{formatValue(row.label ?? row.title)}</span>
                <span className="font-mono">{row.weight !== undefined && row.weight !== null ? `${String(row.weight)} ${String(row.unit ?? "%")}` : "—"}</span>
              </span>
              {row.source ? <span className="font-mono text-[11px] text-muted-foreground">{String(row.source)}</span> : null}
            </div>
          )}
        />
        {total !== null && total !== 100 ? (
          <p role="note" className="rounded-[10px] border border-warning/30 bg-warning/10 p-3 text-[12.5px]">
            La somme des pondérations lues vaut {total} % : vérifiez les critères dans le RC (sous-critères ou lecture incomplète).
          </p>
        ) : null}
      </div>
    </div>
  );
}

function GoNoGoView({ data, workspaceId, missionId }: { data: Record<string, unknown>; workspaceId: string; missionId: string | null }) {
  const criteria = asList<Row>(data?.criteria);
  const decision = data?.decision as Row | null | undefined;
  const feasibility = data?.feasibility as Feasibility | null | undefined;
  const grid = criteria.map((row, i) => ({
    code: String(row.code ?? `critere_${i + 1}`),
    label: String(row.label ?? row.code ?? ""),
    weight: Number(row.weight ?? 1),
    score: Number(row.score ?? 0),
    eliminatory: Boolean(row.eliminatory),
  }));
  return (
    <div className="flex flex-col gap-5">
      {feasibility ? <FeasibilityMatrix workspaceId={workspaceId} feasibility={feasibility} /> : null}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Grille de notation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-[13px]">
            <p className="text-muted-foreground">
              Complément à la matrice : votre appréciation, critère par critère. Score calculé par le Core (moyenne pondérée, un critère éliminatoire noté 0 recommande No-Go).
            </p>
            {missionId ? <GoNoGoGrid workspaceId={workspaceId} missionId={missionId} initial={grid} locked={Boolean(decision)} /> : null}
            <p className="flex flex-wrap items-center gap-3">
              <span className="text-[28px]/[1] font-[700] tracking-[-0.04em]">{data?.score === null || data?.score === undefined ? "—" : `${String(data.score)} / 100`}</span>
              <span>
                Recommandation : <StatusBadge value={data?.recommendation} />
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Décision humaine</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-[13px]">
            {decision ? (
              <>
                <p>
                  <StatusBadge value={decision.value} /> par {formatValue(decision.by)} le {formatValue(decision.at)}
                </p>
                {typeof decision.rationale === "string" ? <p className="text-muted-foreground">{decision.rationale}</p> : null}
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Aucune décision enregistrée. Elle est définitive, motivée, et garde la trace de la matrice de faisabilité au moment de décider.
                </p>
                {missionId ? <GoNoGoDecision workspaceId={workspaceId} missionId={missionId} /> : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FinancialView({ data }: { data: Record<string, unknown> }) {
  const pricing = (data?.pricing ?? {}) as Record<string, unknown>;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SimpleList
        title="Devis fournisseurs"
        rows={asList<Row>(data?.quotes)}
        empty="Aucun devis fournisseur ingéré."
        render={(row) => (
          <div className="flex justify-between gap-4">
            <span className="font-medium">{formatValue(row.vendor ?? row.title)}</span>
            <span>{formatAmount(row.amount)}</span>
          </div>
        )}
      />
      <SimpleList
        title="Nomenclature"
        rows={asList<Row>(data?.bom)}
        empty="Nomenclature non construite."
        render={(row) => (
          <div className="flex justify-between gap-4">
            <span className="font-medium">{formatValue(row.label ?? row.item)}</span>
            <span className="text-muted-foreground">
              {formatValue(row.quantity)} × {formatAmount(row.unit_price)}
            </span>
          </div>
        )}
      />
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Prix final</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              ["Coût de revient", pricing.cost],
              ["Marge", pricing.margin],
              ["Prix proposé", pricing.total],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex flex-col gap-0.5">
                <dt className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">{String(label)}</dt>
                <dd className="text-[18px] font-[650]">{formatAmount(value)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
