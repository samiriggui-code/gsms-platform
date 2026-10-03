"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@crm/ui/components/field";
import { Label } from "@crm/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { Switch } from "@crm/ui/components/switch";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

const TOGGLES = ["cookieSubdomains", "secureCookies", "honourDnt"] as const;

export function TrackingCookies() {
	const t = useTranslations("settingsTracking");
	const trpc = useTRPC();
	const cache = useCrmCache();
	const lifetimeId = useId();

	const tracking = useQuery(trpc.tracking.settings.queryOptions());

	const setFlag = useMutation(
		trpc.tracking.setFlag.mutationOptions({
			onSuccess: () => cache.tracking({ settle: "record" }),
			onError: (error) => toast.error(error.message),
		}),
	);

	const setLifetime = useMutation(
		trpc.tracking.setCookieLifetime.mutationOptions({
			onSuccess: async () => {
				await cache.tracking();
				toast.success(t("lifetimeSaved"));
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (!tracking.data) return null;

	const { canManage, cookieDays, cookieLifetimes } = tracking.data;
	const busy = !canManage || setFlag.isPending || setLifetime.isPending;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("cookiesTitle")}</CardTitle>
				<CardDescription>{t("cookiesDescription")}</CardDescription>
			</CardHeader>

			<CardContent>
				{TOGGLES.map((flag) => (
					<div key={flag} className="flex items-center justify-between gap-6">
						<Label
							htmlFor={`tracking-${flag}`}
							className="flex flex-col items-start gap-1"
						>
							<span className="text-sm">{t(`flags.${flag}.label`)}</span>
							<span className="font-normal text-muted-foreground text-xs">
								{t(`flags.${flag}.hint`)}
							</span>
						</Label>

						<Switch
							id={`tracking-${flag}`}
							checked={tracking.data[flag]}
							disabled={busy}
							onCheckedChange={(enabled) => setFlag.mutate({ flag, enabled })}
						/>
					</div>
				))}

				<Field>
					<FieldLabel htmlFor={lifetimeId}>{t("lifetimeLabel")}</FieldLabel>
					<Select
						value={String(cookieDays)}
						disabled={busy}
						onValueChange={(value) =>
							setLifetime.mutate({ days: Number(value) })
						}
					>
						<SelectTrigger id={lifetimeId} className="w-full max-w-sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{cookieLifetimes.map((lifetime) => (
								<SelectItem key={lifetime.days} value={String(lifetime.days)}>
									{t.has(`lifetimes.${lifetime.days}`)
										? t(`lifetimes.${lifetime.days}`)
										: lifetime.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<FieldDescription>{t("lifetimeDescription")}</FieldDescription>
				</Field>
			</CardContent>
		</Card>
	);
}
