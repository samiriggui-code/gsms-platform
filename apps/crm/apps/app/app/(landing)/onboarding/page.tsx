import { DEFAULT_WORKSPACE_NAME } from "@crm/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { requireMailboxAccess } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("shellOnboarding");
	return { title: t("metaTitle") };
}

export const instant = false;

export default async function OnboardingPage() {
	await requireMailboxAccess();
	const t = await getTranslations("shellOnboarding");

	return (
		<AuthShell>
			<AuthHeading title={t("title")} description={t("description")} />

			<OnboardingForm placeholder={DEFAULT_WORKSPACE_NAME} />
		</AuthShell>
	);
}
