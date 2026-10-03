import { type MailboxProviderId, mailboxGrantsNeeded } from "@crm/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { requireSession, signInAccounts } from "@/lib/session";
import { GrantAccess } from "./grant-access";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("shellGrantAccess");
	return { title: t("metaTitle") };
}

export const instant = false;

const DESCRIPTION = {
	google: "descriptionGoogle",
	microsoft: "descriptionMicrosoft",
} as const satisfies Record<MailboxProviderId, string>;

export default async function GrantAccessPage() {
	const { user } = await requireSession();
	const t = await getTranslations("shellGrantAccess");

	const providers = mailboxGrantsNeeded(await signInAccounts(user.id));

	if (providers.length === 0) {
		redirect("/");
	}

	const only = providers.length === 1 ? providers[0] : undefined;

	return (
		<AuthShell>
			<AuthHeading
				title={t("title")}
				description={t(only ? DESCRIPTION[only] : "descriptionBoth")}
			/>

			<GrantAccess providers={providers} />

			<p className="text-center text-muted-foreground text-sm/5">
				{t("storageNote")}
			</p>
		</AuthShell>
	);
}
