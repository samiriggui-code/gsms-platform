import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { missionTypeBySlug } from "@/lib/copy/platform";
import { MissionsView } from "../missions-view";

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  return { title: missionTypeBySlug(type)?.label ?? "Missions" };
}

export default async function MissionTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!missionTypeBySlug(type)) notFound();
  return <MissionsView typeSlug={type} />;
}
