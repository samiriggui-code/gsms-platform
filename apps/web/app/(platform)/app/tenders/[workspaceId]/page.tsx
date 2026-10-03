import { safeDecode } from "@/lib/utils";
import type { Metadata } from "next";
import { CoreFailureState, NoWorkspaceState } from "@/components/platform/core-state";
import { formatAmount, formatValue } from "@/components/platform/format";
import { TabIntro } from "@/components/platform/tender-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tenderTab } from "@/lib/tenders/tabs";
import { TenderFactsForm } from "@/components/platform/tenders/tender-actions";
import { getDossierStatus, getTenderSummary } from "./summary";

export const metadata: Metadata = { title: "Dossier d'appel d'offres" };

const STEP_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  REVIEW: "En relecture",
  READY: "Prêt",
  APPROVED: "Approuvé",
  SUBMITTED: "Déposé",
};

export default async function TenderSummaryPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId: raw } = await params;
  const workspaceId = safeDecode(raw);
  const tab = tenderTab("synthese")!;
  const { result, missionId } = await getTenderSummary(workspaceId);
  const status = missionId ? await getDossierStatus(workspaceId, missionId) : null;
  const history = status?.ok ? status.data.history : [];

  return (
    <>
      <TabIntro tab={tab} />
      {result === null ? (
        <Card><NoWorkspaceState /></Card>
      ) : !result.ok ? (
        <Card><CoreFailureState failure={result} /></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Dossier</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Fact label="Acheteur" value={typeof result.data.buyer === "object" ? result.data.buyer?.name : result.data.buyer} />
                <Fact label="Statut du dossier" value={result.data.dossier_status_label ?? result.data.dossier_status} />
                <Fact label="Référence GSMS" value={result.data.reference} />
                <Fact label="Référence de la consultation" value={result.data.consultation_ref} />
                <Fact label="Date de remise" value={result.data.submission_deadline} />
                <Fact label="Go / No-Go" value={result.data.decision ?? "Non décidé"} />
                <Fact label="Montant annuel estimé" value={formatAmount(result.data.amount)} />
                <Fact label="Lots" value={result.data.lots?.length ?? 0} />
              </dl>
              {missionId ? (
                <div className="mt-5">
                  <TenderFactsForm
                    workspaceId={workspaceId}
                    missionId={missionId}
                    amount={typeof result.data.amount === "number" ? result.data.amount : null}
                    deadline={result.data.submission_deadline ?? null}
                  />
                </div>
              ) : null}
              {result.data.lots && result.data.lots.length > 0 ? (
                <ul className="mt-5 divide-y divide-border/70 border-t border-border/70">
                  {result.data.lots.map((lot, index) => (
                    <li key={lot.id ?? index} className="flex justify-between gap-4 py-2.5 text-[13px]">
                      <span>{lot.title ?? `Lot ${index + 1}`}</span>
                      <span className="text-muted-foreground">{formatAmount(lot.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Prochaines échéances</CardTitle>
            </CardHeader>
            {result.data.next_deadlines && result.data.next_deadlines.length > 0 ? (
              <ul className="divide-y divide-border/70">
                {result.data.next_deadlines.map((deadline, index) => (
                  <li key={deadline.id ?? index} className="flex justify-between gap-4 px-5 py-3 text-[13px]">
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{deadline.title ?? "Échéance"}</span>
                      {deadline.source ? <span className="font-mono text-[11px] text-muted-foreground">{deadline.source}</span> : null}
                    </span>
                    <span className="text-muted-foreground">{formatValue(deadline.due_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <CardContent className="text-[13px] text-muted-foreground">Aucune échéance enregistrée pour ce dossier.</CardContent>
            )}
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Validations</CardTitle>
            </CardHeader>
            {history.length > 0 ? (
              <ul className="divide-y divide-border/70">
                {history.map((h) => (
                  <li key={`${h.at}-${h.to_status}`} className="flex flex-col gap-0.5 px-5 py-3 text-[13px] sm:flex-row sm:justify-between sm:gap-4">
                    <span>
                      <span className="font-medium">
                        {STEP_LABELS[h.from_status] ?? h.from_status} → {STEP_LABELS[h.to_status] ?? h.to_status}
                      </span>
                      {h.comment ? <span className="text-muted-foreground"> — {h.comment}</span> : null}
                    </span>
                    <span className="text-muted-foreground">
                      {h.actor} · {formatValue(h.at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <CardContent className="text-[13px] text-muted-foreground">
                Dossier en brouillon. Chaque étape (relecture, prêt, approuvé, déposé) est validée par une personne et tracée ici.
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function Fact({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
      <dd className="text-[14px] font-medium">{formatValue(value)}</dd>
    </div>
  );
}
