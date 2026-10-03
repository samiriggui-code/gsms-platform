"use client";

import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { PageShellDescription, PageShellTitle } from "@/components/page-shell";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { overviewParsers } from "./overview-search-params";

export function OverviewGreetingFallback() {
	const t = useTranslations("crmDashboard");
	return (
		<>
			<PageShellTitle>{t("welcome")}</PageShellTitle>
			<PageShellDescription>{t("greetingMe")}</PageShellDescription>
		</>
	);
}

export function OverviewGreeting() {
	const t = useTranslations("crmDashboard");
	const [scope] = useQueryState(
		SEARCH_PARAM.overview.scope,
		overviewParsers[SEARCH_PARAM.overview.scope],
	);

	return (
		<>
			<PageShellTitle>{t("welcome")}</PageShellTitle>
			<PageShellDescription>
				{scope === "me" ? t("greetingMe") : t("greetingTeam")}
			</PageShellDescription>
		</>
	);
}
