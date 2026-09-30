import type { Metadata } from "next";
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

export const metadata: Metadata = {
	title: "Security",
};

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
	return (
		<PageShell>
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Security</PageShellTitle>
					<PageShellDescription>
						Change the password for your account.
					</PageShellDescription>
				</PageShellHeading>
			</PageShellHeader>

			<PageShellContent>
				<div className="flex max-w-sm flex-col gap-6">{children}</div>
			</PageShellContent>
		</PageShell>
	);
}
