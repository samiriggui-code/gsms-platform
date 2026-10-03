import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { requireMailboxAccess } from "@/lib/session";
import { ResearchForm } from "./research-form";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("shellOnboarding");
	return { title: t("researchMetaTitle") };
}

export const instant = false;

export default async function ResearchKeyPage() {
	await requireMailboxAccess();
	const t = await getTranslations("shellOnboarding");

	return (
		<AuthShell>
			<AuthHeading
				title={t("researchTitle")}
				description={t("researchDescription")}
			/>

			<ResearchForm />
		</AuthShell>
	);
}
