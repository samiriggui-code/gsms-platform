"use client";

import Plug from "@carbon/icons-react/es/Plug";
import DocusignLogo from "@crm/ui/components/brand-logos/docusign";
import GoogleLogo from "@crm/ui/components/brand-logos/google";
import MicrosoftLogo from "@crm/ui/components/brand-logos/microsoft";
import SlackLogo from "@crm/ui/components/brand-logos/slack";
import StripeLogo from "@crm/ui/components/brand-logos/stripe";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function AddConnectionDialog({
	slug,
	open,
	connected,
}: {
	slug: string;
	open: boolean;
	connected: string[];
}) {
	const t = useTranslations("settingsConnections");
	const locale = useLocale();
	const router = useRouter();
	const connectedList = new Intl.ListFormat(locale, {
		type: "conjunction",
	}).format(connected);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) router.replace(`/${slug}/settings/connections`);
			}}
		>
			<DialogContent className="max-w-(--container-narrow) gap-0 p-0 md:left-[calc(50%+calc((56px+213px)/2))]">
				<DialogHeader className="gap-2 px-(--spacing-block-inline) pt-5 pb-4">
					<DialogTitle className="text-base">
						{t("dialogTitle")}
					</DialogTitle>
					<DialogDescription>
						{t("dialogDescription")}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col border-y px-2 py-2">
					{!connected.includes("Google Workspace") ? (
						<CatalogRow
							logo={GoogleLogo}
							name="Google Workspace"
							description={t("googleCatalog")}
							href={`/${slug}/settings/connections/google`}
						/>
					) : null}
					{!connected.includes("Slack") ? (
						<CatalogRow
							logo={SlackLogo}
							name="Slack"
							description={t("slackStarter")}
							href={`/${slug}/settings/connections/slack`}
						/>
					) : null}
					{!connected.includes("Microsoft 365") ? (
						<CatalogRow
							logo={MicrosoftLogo}
							name="Microsoft 365"
							description={t("microsoftCatalog")}
							href={`/${slug}/settings/connections/microsoft`}
						/>
					) : null}
					<CatalogRow
						logo={StripeLogo}
						name="Stripe"
						description={t("comingSoon")}
					/>
					<CatalogRow
						logo={DocusignLogo}
						name="Docusign"
						description={t("comingSoon")}
					/>
					<CatalogRow
						logo={Plug}
						name={t("anythingElse")}
						description={t("intakeUnavailable")}
						href={`/${slug}/settings/connections/intake`}
					/>
				</div>
				<p className="px-(--spacing-block-inline) py-4 text-muted-foreground text-xs">
					{connected.length > 0
						? t("alreadyConnected", {
								count: connected.length,
								names: connectedList,
							})
						: t("nothingConnected")}
				</p>
			</DialogContent>
		</Dialog>
	);
}

function CatalogRow({
	logo: Logo,
	name,
	description,
	href,
}: {
	logo: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	name: string;
	description: string;
	href?: string;
}) {
	const content = (
		<>
			<Logo className="size-5 shrink-0" />
			<div>
				<p className="font-medium text-sm">{name}</p>
				<p className="text-muted-foreground text-xs">{description}</p>
			</div>
		</>
	);
	return href ? (
		<Link
			href={href}
			className="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-muted"
		>
			{content}
		</Link>
	) : (
		<div
			aria-disabled="true"
			className="flex items-center gap-3 rounded-md px-3 py-3 opacity-60"
		>
			{content}
		</div>
	);
}
