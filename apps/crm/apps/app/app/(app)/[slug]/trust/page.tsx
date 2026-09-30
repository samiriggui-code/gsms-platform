"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DeskPulseBand } from "@/components/desk-ui/desk-pulse-band";
import {
	AccentActionPanel,
	SoftPanel,
	SoftPanelHeader,
} from "@/components/desk-ui/soft-panel";
import {
	PageShell,
	PageShellContent,
	PageShellHeader,
	PageShellHeading,
	PageShellLoading,
	PageShellTitle,
} from "@/components/page-shell";

type Finding = {
	id: string;
	source: string;
	status: string;
	category: string;
	control_ref: string;
	title: string;
	client_id: string;
	severity?: string;
};

type Payload = {
	generatedAt: string;
	count: number;
	open_count: number;
	conforme_count: number;
	configured?: boolean;
	errors?: string[];
	findings: Finding[];
};

export function TrustFindingsPanel() {
	const t = useTranslations("trust");
	const [data, setData] = useState<Payload | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch("/api/trust/findings?limit=200", {
					credentials: "include",
				});
				if (!res.ok) {
					const body = (await res.json().catch(() => null)) as {
						message?: string;
						error?: string;
					} | null;
					throw new Error(
						body?.message ?? body?.error ?? `HTTP ${res.status}`,
					);
				}
				const json = (await res.json()) as Payload;
				if (!cancelled) setData(json);
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : String(err));
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	if (loading) {
		return <p className="text-muted-foreground text-sm">{t("loading")}</p>;
	}

	if (error) {
		return (
			<div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
				{error}
			</div>
		);
	}

	if (!data) return null;

	const wired = data.configured !== false;

	return (
		<div className="flex flex-col gap-6">
			<DeskPulseBand
				eyebrow={t("pulseEyebrow")}
				headline={
					wired
						? t("pulseHeadline", { count: data.count.toLocaleString() })
						: t("pulseHeadlineOff")
				}
				subhead={
					wired
						? data.open_count > 0
							? t("pulseSubheadOpen", { count: data.open_count })
							: t("pulseSubheadClear")
						: t("pulseSubheadOff")
				}
				body={t("pulseBody")}
				panelTitle={t("panelTitle")}
				panelRows={[
					{ label: t("total"), value: data.count },
					{ label: t("open"), value: data.open_count },
					{ label: t("conforme"), value: data.conforme_count },
				]}
				stats={[
					{
						label: t("total"),
						value: String(data.count),
						helper: new Date(data.generatedAt).toLocaleString(),
					},
					{
						label: t("open"),
						value: String(data.open_count),
						helper: t("toHandle"),
					},
					{
						label: t("backends"),
						value: wired ? t("backendsOk") : t("backendsOff"),
						helper: wired ? t("configured") : t("toWire"),
					},
				]}
			/>

			{!wired ? (
				<AccentActionPanel
					eyebrow={t("configEyebrow")}
					title={t("configTitle")}
					description={t("configBody")}
				/>
			) : null}

			{data.errors?.length ? (
				<ul
					className={
						wired
							? "list-disc rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-3 pl-8 text-amber-800 text-xs dark:text-amber-200"
							: "list-disc rounded-2xl border border-border bg-muted/40 px-5 py-3 pl-8 text-muted-foreground text-xs"
					}
				>
					{data.errors.map((e) => (
						<li key={e}>{e}</li>
					))}
				</ul>
			) : null}

			<SoftPanel flush>
				<SoftPanelHeader
					title={t("findingsTitle")}
					description={wired ? t("findingsDesc") : t("findingsDescOff")}
				/>
				<div className="overflow-auto">
					<table className="w-full text-sm">
						<thead className="border-border border-b bg-muted/40 text-left text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
							<tr>
								<th className="px-5 py-3 sm:px-6">{t("colSource")}</th>
								<th className="px-3 py-3">{t("colStatus")}</th>
								<th className="px-3 py-3">{t("colControl")}</th>
								<th className="px-5 py-3 sm:px-6">{t("colTitle")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{data.findings.map((f) => (
								<tr
									key={f.id}
									className="transition-colors hover:bg-muted/40"
								>
									<td className="px-5 py-3.5 font-mono text-xs sm:px-6">
										{f.source}
									</td>
									<td className="px-3 py-3.5">{f.status}</td>
									<td className="px-3 py-3.5 font-mono text-xs">
										{f.control_ref}
									</td>
									<td className="px-5 py-3.5 sm:px-6">{f.title}</td>
								</tr>
							))}
							{data.findings.length === 0 ? (
								<tr>
									<td
										colSpan={4}
										className="px-5 py-8 text-muted-foreground sm:px-6"
									>
										{wired ? t("empty") : t("emptyOff")}
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
			</SoftPanel>
		</div>
	);
}

export default function TrustPage() {
	const t = useTranslations("trust");

	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle className="sr-only">{t("title")}</PageShellTitle>
				</PageShellHeading>
			</PageShellHeader>
			<PageShellContent>
				<Suspense fallback={<PageShellLoading />}>
					<TrustFindingsPanel />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}
