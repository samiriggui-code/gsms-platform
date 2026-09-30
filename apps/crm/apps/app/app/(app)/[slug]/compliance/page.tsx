import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ComplianceDeskOverview } from "@/components/compliance-desk/compliance-desk-overview";
import {
	PageShell,
	PageShellContent,
	PageShellHeader,
	PageShellHeading,
	PageShellLoading,
	PageShellTitle,
} from "@/components/page-shell";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("compliance");
	return { title: t("title") };
}

export default async function ComplianceDeskPage() {
	const t = await getTranslations("compliance");

	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle className="sr-only">{t("title")}</PageShellTitle>
				</PageShellHeading>
			</PageShellHeader>
			<PageShellContent>
				<Suspense fallback={<PageShellLoading />}>
					<ComplianceDeskOverview />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}
