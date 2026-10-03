import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TenderTabView } from "@/components/platform/tender-views";
import { coreFetch } from "@/lib/core/client";
import { tenderTab } from "@/lib/tenders/tabs";
import { safeDecode } from "@/lib/utils";
import { getTenderSummary } from "../summary";

type Params = Promise<{ workspaceId: string; tab: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tab } = await params;
  return { title: tenderTab(tab)?.label ?? "Appel d'offres" };
}

export default async function TenderTabPage({ params }: { params: Params }) {
  const { workspaceId: raw, tab: slug } = await params;
  const tab = tenderTab(slug);
  if (!tab || tab.slug === "synthese") notFound();

  const workspaceId = safeDecode(raw);
  const { result: summary, missionId } = await getTenderSummary(workspaceId);
  const result = missionId
    ? await coreFetch<unknown>(tab.endpoint(workspaceId, missionId), { workspaceId, missionId })
    : summary;

  return <TenderTabView tab={tab} result={result} workspaceId={workspaceId} missionId={missionId} />;
}
