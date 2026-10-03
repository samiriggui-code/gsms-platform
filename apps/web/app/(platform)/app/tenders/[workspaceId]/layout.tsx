import { safeDecode } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/platform/format";
import { TenderTabs } from "@/components/platform/tender-tabs";
import { DossierStatusActions } from "@/components/platform/tenders/tender-actions";
import { TENDER_TABS } from "@/lib/tenders/tabs";
import { getDossierStatus, getTenderSummary } from "./summary";

export default async function TenderLayout({ children, params }: { children: ReactNode; params: Promise<{ workspaceId: string }> }) {
  const { workspaceId: raw } = await params;
  const workspaceId = safeDecode(raw);
  const { result, missionId } = await getTenderSummary(workspaceId);
  const summary = result?.ok ? result.data : null;
  const status = missionId ? await getDossierStatus(workspaceId, missionId) : null;
  const dossier = status?.ok ? status.data : null;

  return (
    <>
      <div className="mb-5 flex flex-col gap-3">
        <Link href="/app/tenders" className="inline-flex w-fit items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" aria-hidden />
          Appels d&apos;offres
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance text-[clamp(22px,2.4vw,30px)]/[1.15] font-[650] tracking-[-0.04em]">
            {summary?.title ?? "Dossier d'appel d'offres"}
          </h1>
          {summary?.dossier_status ? <StatusBadge value={summary.dossier_status_label ?? summary.dossier_status} /> : null}
          {summary?.decision ? <StatusBadge value={summary.decision} /> : null}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          {summary?.reference ?? workspaceId}
          {summary?.consultation_ref ? ` · Consultation ${summary.consultation_ref}` : ""}
        </p>
        {dossier && missionId ? (
          <DossierStatusActions workspaceId={workspaceId} missionId={missionId} transitions={dossier.transitions} decision={dossier.decision} />
        ) : null}
      </div>
      <TenderTabs workspaceId={workspaceId} tabs={TENDER_TABS.map(({ slug, label }) => ({ slug, label }))} />
      {children}
    </>
  );
}
