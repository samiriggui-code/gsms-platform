"use client";

import { Button } from "@crm/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@crm/ui/components/dropdown-menu";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { AppLocale } from "@/i18n/config";

export function LocaleSwitcher() {
	const t = useTranslations("locale");
	const locale = useLocale() as AppLocale;
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	function setLocale(next: string) {
		if (next !== "fr" && next !== "en") return;
		startTransition(async () => {
			await fetch("/api/locale", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ locale: next }),
			});
			router.refresh();
		});
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					disabled={pending}
					aria-label={t("label")}
					className="min-w-9 px-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground"
				>
					{locale}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-36">
				<DropdownMenuRadioGroup value={locale} onValueChange={setLocale}>
					<DropdownMenuRadioItem value="fr">{t("fr")}</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="en">{t("en")}</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
