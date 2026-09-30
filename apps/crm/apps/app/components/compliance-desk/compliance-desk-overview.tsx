"use client";

import ArrowRight from "@carbon/icons-react/es/ArrowRight";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";
import { DocumentRow } from "./document-row";
import { PhaseActions } from "./phase-actions";
import type { DeskDocument, DeskMetrics } from "./types";
import { UploadDropzone } from "./upload-dropzone";
import { WorkspacePulse } from "./workspace-pulse";

const DEMO_DOCS: DeskDocument[] = [
	{
		id: "1",
		filename: "PV_commission_2024.pdf",
		docType: "PV_COMMISSION",
		status: "ready",
		uploadedAt: "2026-09-07T14:20:00Z",
		workspaceLabel: "Hôtel Paris",
	},
	{
		id: "2",
		filename: "Rapport_SSI_Q2.pdf",
		docType: "CONTROLE_PERIODIQUE",
		status: "needs_review",
		uploadedAt: "2026-09-08T09:10:00Z",
		workspaceLabel: "Hôtel Paris",
	},
	{
		id: "3",
		filename: "Registre_securite_scan.pdf",
		docType: "REGISTRE",
		status: "waiting",
		uploadedAt: "2026-09-08T16:45:00Z",
		workspaceLabel: "Hôtel Paris",
	},
	{
		id: "4",
		filename: "Facture_extincteurs.xlsx",
		docType: "AUTRE",
		status: "received",
		uploadedAt: "2026-09-08T18:02:00Z",
		workspaceLabel: "Hôtel Paris",
	},
];

/**
 * Overview Compliance Desk — sections DocuLens Intake adaptées au shell Camp AI.
 * Données démo jusqu’au branchement API DocuLens / workspace.
 */
export function ComplianceDeskOverview() {
	const workspaceUrl = useWorkspaceUrl();
	const [docs, setDocs] = useState(DEMO_DOCS);
	const [ingestRunning, setIngestRunning] = useState(false);
	const [digestRunning, setDigestRunning] = useState(false);
	const [toast, setToast] = useState<string | null>(null);

	const metrics: DeskMetrics = useMemo(() => {
		const needsReview = docs.filter((d) => d.status === "needs_review").length;
		const waiting = docs.filter((d) =>
			["waiting", "received"].includes(d.status),
		).length;
		const classified = docs.filter((d) =>
			["ready", "needs_review", "ingesting"].includes(d.status),
		).length;
		return {
			totalDocuments: docs.length,
			classified,
			duplicates: 0,
			needsReview,
			waitingAnalysis: waiting,
			ingestRunning,
			digestRunning,
		};
	}, [docs, digestRunning, ingestRunning]);

	const classifiedPct =
		metrics.totalDocuments === 0
			? 0
			: Math.round((metrics.classified / metrics.totalDocuments) * 100);

	const flash = (message: string) => {
		setToast(message);
		window.setTimeout(() => setToast(null), 3200);
	};

	const runIngest = () => {
		setIngestRunning(true);
		flash("Ingest demandé — file cabinet (MAX 2). API DocuLens à brancher.");
		window.setTimeout(() => {
			setDocs((prev) =>
				prev.map((d) =>
					d.status === "waiting" || d.status === "received"
						? { ...d, status: "ingesting" as const }
						: d,
				),
			);
		}, 400);
		window.setTimeout(() => {
			setDocs((prev) =>
				prev.map((d) =>
					d.status === "ingesting" ? { ...d, status: "ready" as const } : d,
				),
			);
			setIngestRunning(false);
			flash("Ingest simulé terminé.");
		}, 2200);
	};

	const runDigest = () => {
		setDigestRunning(true);
		flash("Digest demandé — timeline / prescriptions (moteur GSMS à brancher).");
		window.setTimeout(() => {
			setDigestRunning(false);
			flash("Digest simulé — baseline en attente de validation.");
		}, 1800);
	};

	return (
		<div className="space-y-6">
			{toast ? (
				<div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
					{toast}
				</div>
			) : null}

			<WorkspacePulse
				totalDocuments={metrics.totalDocuments}
				needsReview={metrics.needsReview}
				classifiedPct={classifiedPct}
				waitingAnalysis={metrics.waitingAnalysis}
			/>

			<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.75fr)]">
				<div className="space-y-6">
					<section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-5 py-4 sm:px-6">
							<div>
								<h3 className="font-semibold text-sm">Continuer le dossier</h3>
								<p className="mt-1 text-muted-foreground text-xs">
									Documents récents du workspace (démo).
								</p>
							</div>
							<Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
								<Link href={workspaceUrl("/trust")}>
									Trust / findings
									<Icon icon={ArrowRight} className="size-3.5" />
								</Link>
							</Button>
						</div>
						<div className="divide-y divide-border">
							{docs.map((document) => (
								<DocumentRow key={document.id} document={document} />
							))}
						</div>
					</section>

					<UploadDropzone
						onFiles={(files) => {
							const added: DeskDocument[] = files.map((file, index) => ({
								id: `local-${Date.now()}-${index}`,
								filename: file.name,
								docType: "AUTRE",
								status: "received",
								uploadedAt: new Date().toISOString(),
								workspaceLabel: "Hôtel Paris",
							}));
							setDocs((prev) => [...added, ...prev]);
							flash(`${files.length} fichier(s) ajoutés — statut Reçu.`);
						}}
					/>
				</div>

				<div className="space-y-6">
					<PhaseActions
						ingestRunning={ingestRunning}
						digestRunning={digestRunning}
						onIngest={runIngest}
						onDigest={runDigest}
					/>
					<section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
						<p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
							UI DocuLens
						</p>
						<p className="mt-2 text-muted-foreground text-sm leading-6">
							Hero, liste docs, dropzone et actions Ingest/Digest repris du front
							DocuLens (MIT), stylés avec @crm/ui. Backend Desk = prochaine étape.
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}
