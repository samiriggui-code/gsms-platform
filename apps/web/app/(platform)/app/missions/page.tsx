import type { Metadata } from "next";
import { MissionsView } from "./missions-view";

export const metadata: Metadata = { title: "Missions" };

export default function MissionsPage() {
  return <MissionsView />;
}
