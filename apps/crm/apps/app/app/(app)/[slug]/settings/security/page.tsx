import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
	PageShell,
	PageShellContent,
	PageShellDescription,
	PageShellHeader,
	PageShellHeading,
	PageShellTitle,
} from "@/components/page-shell";
import { requireSession } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("settingsSecurity");
	return { title: t("title") };
}

export default function SecuritySettingsPage() {
	return (
		<Suspense fallback={<SecuritySettingsShell />}>
			<SecuritySettingsPageContent />
		</Suspense>
	);
}

async function SecuritySettingsPageContent() {
	await requireSession();

	return (
		<SecuritySettingsShell>
			<ChangePasswordForm />
		</SecuritySettingsShell>
	);
}

function SecuritySettingsShell({ children }: { children?: React.ReactNode }) {
	const t = useTranslations("settingsSecurity");

	return (
		<PageShell>
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>{t("title")}</PageShellTitle>
					<PageShellDescription>{t("description")}</PageShellDescription>
				</PageShellHeading>
			</PageShellHeader>

			<PageShellContent>
				<div className="flex max-w-sm flex-col gap-6">{children}</div>
			</PageShellContent>
		</PageShell>
	);
}
