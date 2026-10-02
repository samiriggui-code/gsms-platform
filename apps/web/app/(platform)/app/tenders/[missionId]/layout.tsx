import { safeDecode } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/platform/format";
import { TenderTabs } from "@/components/platform/tender-tabs";
import { TENDER_TABS } from "@/lib/tenders/tabs";
import { getTenderSummary } from "./summary";

export default async function TenderLayout({ children, params }: { children: ReactNode; params: Promise<{ missionId: string }> }) {
  const { missionId: raw } = await params;
  const missionId = safeDecode(raw);
  const { result } = await getTenderSummary(missionId);
  const summary = result?.ok ? result.data : null;

  return (
    <>
      <div className="mb-5 flex flex-col gap-3">
        <Link href="/app/tenders" className="inline-flex w-fit items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" aria-hidden />
          Appels d&apos;offres
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance text-[clamp(22px,2.4vw,30px)]/[1.15] font-[650] tracking-[-0.04em]">
            {summary?.title ?? `Dossier ${missionId}`}
          </h1>
          {summary?.status ? <StatusBadge value={summary.status} /> : null}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          Mission {missionId}
          {summary?.reference ? ` · Réf. ${summary.reference}` : ""}
        </p>
      </div>
      <TenderTabs missionId={missionId} tabs={TENDER_TABS.map(({ slug, label }) => ({ slug, label }))} />
      {children}
    </>
  );
}
