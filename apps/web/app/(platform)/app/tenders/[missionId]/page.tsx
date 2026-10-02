import { safeDecode } from "@/lib/utils";
import type { Metadata } from "next";
import { CoreFailureState, NoWorkspaceState } from "@/components/platform/core-state";
import { formatAmount, formatValue } from "@/components/platform/format";
import { TabIntro } from "@/components/platform/tender-views";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tenderTab } from "@/lib/tenders/tabs";
import { getTenderSummary } from "./summary";

export const metadata: Metadata = { title: "Dossier d'appel d'offres" };

export default async function TenderSummaryPage({ params }: { params: Promise<{ missionId: string }> }) {
  const { missionId: raw } = await params;
  const missionId = safeDecode(raw);
  const tab = tenderTab("synthese")!;
  const { result } = await getTenderSummary(missionId);

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
                <Fact label="Statut" value={result.data.status} />
                <Fact label="Montant estimé" value={formatAmount(result.data.amount)} />
                <Fact label="Date de remise" value={result.data.submission_deadline} />
                <Fact label="Référence" value={result.data.reference} />
                <Fact label="Lots" value={result.data.lots?.length ?? 0} />
              </dl>
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
                    <span className="font-medium">{deadline.title ?? "Échéance"}</span>
                    <span className="text-muted-foreground">{formatValue(deadline.due_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <CardContent className="text-[13px] text-muted-foreground">Aucune échéance enregistrée pour ce dossier.</CardContent>
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
