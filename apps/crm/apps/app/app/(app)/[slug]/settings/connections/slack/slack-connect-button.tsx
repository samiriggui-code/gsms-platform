"use client";

import { Button } from "@crm/ui/components/button";
import { useTranslations } from "next-intl";
import { useState } from "react";

const CONNECT_ERRORS = new Map([
	["access_denied", "accessDenied"],
	["account_already_linked_to_different_user", "alreadyLinked"],
	["email_doesn't_match", "emailMismatch"],
	["oauth_code_verification_failed", "oauthFailed"],
	["user_info_is_missing", "userInfoMissing"],
	["not_authorized", "notAuthorized"],
]);

function startSlackOAuth(slug: string) {
	const params = new URLSearchParams({
		callbackURL: `${window.location.origin}/${slug}/settings/connections/slack/people`,
		errorCallbackURL: `${window.location.origin}/${slug}/settings/connections/slack?provider=slack`,
	});

	window.location.href = `/api/connections/slack/start?${params}`;
}

export function SlackReconnectButton({ slug }: { slug: string }) {
	const t = useTranslations("settingsSlack");
	const [pending, setPending] = useState(false);

	return (
		<Button
			disabled={pending}
			onClick={() => {
				setPending(true);
				startSlackOAuth(slug);
			}}
			size="xs"
			variant="contrast"
		>
			{pending ? t("opening") : t("reconnect")}
		</Button>
	);
}

export function SlackConnectButton({
	slug,
	configured,
	connectError,
}: {
	slug: string;
	configured: boolean;
	connectError?: string;
}) {
	const t = useTranslations("settingsSlack");
	const [pending, setPending] = useState(false);

	return (
		<div className="flex min-w-0 flex-col gap-2">
			<Button
				onClick={() => {
					setPending(true);
					startSlackOAuth(slug);
				}}
				disabled={!configured || pending}
			>
				{pending
					? t("opening")
					: configured
						? t("connect")
						: t("notConfigured")}
			</Button>
			{connectError ? (
				<p role="alert" className="max-w-sm text-destructive text-xs">
					{(() => {
						const key = CONNECT_ERRORS.get(connectError);
						return key
							? t(`errors.${key}`)
							: t("errors.generic", {
									reason: connectError.replaceAll("_", " "),
								});
					})()}
				</p>
			) : null}
		</div>
	);
}
