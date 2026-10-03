"use client";

import { ToggleGroup, ToggleGroupItem } from "@crm/ui/components/toggle-group";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import {
	OVERVIEW_SCOPES,
	type OverviewScope,
	overviewParsers,
} from "./overview-search-params";

const LABEL_KEYS = {
	me: "scopeMe",
	everyone: "scopeEveryone",
} satisfies Record<OverviewScope, string>;

function isScope(value: string): value is OverviewScope {
	return (OVERVIEW_SCOPES as readonly string[]).includes(value);
}

export function OverviewScopeToggleFallback() {
	const t = useTranslations("crmDashboard");
	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			disabled
			aria-label={t("scopeLabel")}
		>
			{OVERVIEW_SCOPES.map((value) => (
				<ToggleGroupItem key={value} value={value}>
					{t(LABEL_KEYS[value])}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

export function OverviewScopeToggle() {
	const t = useTranslations("crmDashboard");
	const [scope, setScope] = useQueryState(
		SEARCH_PARAM.overview.scope,
		overviewParsers[SEARCH_PARAM.overview.scope],
	);

	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			value={scope}
			onValueChange={(next) => {
				if (isScope(next)) void setScope(next);
			}}
			aria-label={t("scopeLabel")}
		>
			{OVERVIEW_SCOPES.map((value) => (
				<ToggleGroupItem key={value} value={value}>
					{t(LABEL_KEYS[value])}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
