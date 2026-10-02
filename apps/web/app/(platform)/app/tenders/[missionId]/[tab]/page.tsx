import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TenderTabView } from "@/components/platform/tender-views";
import { coreFetch, getWorkspaceContext } from "@/lib/core/client";
import { tenderTab } from "@/lib/tenders/tabs";
import { safeDecode } from "@/lib/utils";

type Params = Promise<{ missionId: string; tab: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tab } = await params;
  return { title: tenderTab(tab)?.label ?? "Appel d'offres" };
}

export default async function TenderTabPage({ params }: { params: Params }) {
  const { missionId: raw, tab: slug } = await params;
  const tab = tenderTab(slug);
  if (!tab || tab.slug === "synthese") notFound();

  const missionId = safeDecode(raw);
  const { workspaceId, failure } = await getWorkspaceContext();
  const result = workspaceId
    ? await coreFetch<unknown>(tab.endpoint(workspaceId, missionId), { workspaceId, missionId })
    : failure;

  return <TenderTabView tab={tab} result={result} />;
}
