"use client";

import { Button } from "@crm/ui/components/button";
import { useState } from "react";

const CONNECT_ERRORS = new Map([
	[
		"access_denied",
		"Slack installation was cancelled before access was granted.",
	],
	[
		"account_already_linked_to_different_user",
		"That Slack installer is already linked to another CRM account.",
	],
	[
		"email_doesn't_match",
		"The Slack installer's email must match the CRM account you are signed in with.",
	],
	[
		"oauth_code_verification_failed",
		"Slack rejected the app credentials or redirect URL. Check the client ID, client secret, and OAuth redirect URL, then try again.",
	],
	[
		"user_info_is_missing",
		"Slack did not return the installer's profile. Confirm the app has users:read and users:read.email, reinstall it, then try again.",
	],
	[
		"not_authorized",
		"Only an owner or an admin can connect Slack. One Slack workspace is shared by everyone here, so ask one of them to connect or reconnect it.",
	],
]);

function startSlackOAuth(slug: string) {
	const params = new URLSearchParams({
		callbackURL: `${window.location.origin}/${slug}/settings/connections/slack/people`,
		errorCallbackURL: `${window.location.origin}/${slug}/settings/connections/slack?provider=slack`,
	});

	window.location.href = `/api/connections/slack/start?${params}`;
}

export function SlackReconnectButton({ slug }: { slug: string }) {
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
			{pending ? "Opening Slack…" : "Reconnect"}
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
					? "Opening Slack…"
					: configured
						? "Connect Slack"
						: "Slack is not configured"}
			</Button>
			{connectError ? (
				<p role="alert" className="max-w-sm text-destructive text-xs">
					{CONNECT_ERRORS.get(connectError) ??
						`Slack could not be connected (${connectError.replaceAll("_", " ")}).`}
				</p>
			) : null}
		</div>
	);
}
