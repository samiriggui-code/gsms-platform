import { Bot, CalendarClock, FileStack, FileText, HelpCircle, History, ListChecks, ShieldAlert, Upload } from "lucide-react";
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
  exigences: {
    columns: [
      { key: "reference", label: "Réf." },
      { key: "text", label: "Exigence", className: "min-w-[280px]" },
      { key: "owner", label: "Propriétaire" },
      { key: "status", label: "Statut", render: (row) => <StatusBadge value={row.status} /> },
    ],
    empty: { icon: ListChecks, title: "Aucune exigence", description: "Les exigences apparaissent après l'analyse du dossier." },
  },
  conformite: {
    columns: [
      { key: "requirement", label: "Exigence", className: "min-w-[260px]" },
      { key: "proposed_status", label: "Statut proposé", render: (row) => <StatusBadge value={row.proposed_status} /> },
      { key: "final_status", label: "Statut final (humain)", render: (row) => <StatusBadge value={row.final_status ?? "a_valider"} /> },
      { key: "evidence", label: "Preuve" },
    ],
    empty: { icon: ListChecks, title: "Matrice vide", description: "La matrice est générée à partir des exigences ; chaque statut final est validé par un humain." },
  },
  risques: {
    columns: [
      { key: "title", label: "Risque" },
      { key: "severity", label: "Gravité", render: (row) => <StatusBadge value={row.severity} /> },
      { key: "mitigation", label: "Parade" },
      { key: "owner", label: "Responsable" },
    ],
    empty: { icon: ShieldAlert, title: "Aucun risque identifié", description: "Les risques issus de l'analyse et de la grille Go / No-Go apparaîtront ici." },
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
    analyse: { text: "Lancer l'analyse", icon: FileText },
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
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SimpleList
        title="Sections du dossier"
        rows={asList<Row>(data?.sections)}
        empty="Analyse non lancée."
        render={(row) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{formatValue(row.title)}</span>
            {row.summary ? <span className="text-muted-foreground">{String(row.summary)}</span> : null}
          </div>
        )}
      />
      <SimpleList
        title="Critères d'évaluation"
        rows={asList<Row>(data?.criteria)}
        empty="Aucun critère extrait."
        render={(row) => (
          <div className="flex justify-between gap-4">
            <span className="font-medium">{formatValue(row.label ?? row.title)}</span>
            <span className="font-mono text-muted-foreground">{row.weight !== undefined ? `${String(row.weight)} %` : "—"}</span>
          </div>
        )}
      />
    </div>
  );
}

function GoNoGoView({ data, workspaceId, missionId }: { data: Record<string, unknown>; workspaceId: string; missionId: string | null }) {
  const criteria = asList<Row>(data?.criteria);
  const decision = data?.decision as Row | null | undefined;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <SimpleList
        title="Grille déterministe"
        rows={criteria}
        empty="Grille non calculée par le Core."
        render={(row) => (
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <span className="font-medium">{formatValue(row.label)}</span>
            <span className="font-mono">{formatValue(row.score)}{row.max !== undefined ? ` / ${String(row.max)}` : ""}</span>
          </div>
        )}
      />
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Score et recommandation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-[13px]">
            <p className="text-[34px]/[1] font-[700] tracking-[-0.04em]">{formatValue(data?.score)}</p>
            <p>
              Recommandation calculée : <StatusBadge value={data?.recommendation} />
            </p>
            {typeof data?.assistant_opinion === "string" ? (
              <p className="rounded-[10px] border border-border bg-surface-subtle p-3 text-muted-foreground">
                <span className="font-semibold text-foreground">Avis de l&apos;assistant : </span>
                {data.assistant_opinion}
              </p>
            ) : null}
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
                <p className="text-muted-foreground">Aucune décision enregistrée. Elle est définitive et motivée.</p>
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
