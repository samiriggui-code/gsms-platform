"use client";

import ChevronDown from "@carbon/icons-react/es/ChevronDown";
import { Button } from "@crm/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@crm/ui/components/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@crm/ui/components/command";
import { Icon } from "@crm/ui/components/icon";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@crm/ui/components/popover";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

type CatalogModel = {
	id: string;
	name: string;
	provider: string;
	contextWindowTokens: number;
	pricing: { input: number; output: number } | null;
};

type Translate = (
	key: string,
	values?: Record<string, string | number>,
) => string;

const FOLLOW_DEFAULT = "__default__";

function perMillion(rate: number): string {
	const dollars = rate * 1_000_000;
	return `$${dollars.toFixed(2).replace(/\.?0+$/, "")}`;
}

function priceHint(t: Translate, model: CatalogModel): string | null {
	if (!model.pricing) return null;
	return t("modelPrice", {
		input: perMillion(model.pricing.input),
		output: perMillion(model.pricing.output),
	});
}

function contextHint(t: Translate, tokens: number): string {
	return tokens >= 1_000_000
		? t("modelContextMillions", { count: Math.round(tokens / 1_000_000) })
		: t("modelContextThousands", { count: Math.round(tokens / 1_000) });
}

function byProvider(models: CatalogModel[]): [string, CatalogModel[]][] {
	const groups = new Map<string, CatalogModel[]>();

	for (const model of models) {
		const list = groups.get(model.provider) ?? [];
		list.push(model);
		groups.set(model.provider, list);
	}

	return [...groups];
}

export function AgentModel() {
	const t = useTranslations("settingsGeneral");
	const trpc = useTRPC();
	const cache = useCrmCache();
	const [open, setOpen] = useState(false);

	const settings = useQuery(trpc.settings.agentModel.queryOptions());
	const catalog = useQuery(trpc.settings.modelCatalog.queryOptions());

	const save = useMutation(
		trpc.settings.setAgentModel.mutationOptions({
			onSuccess: async () => {
				await cache.settings();
				toast.success(t("modelSaved"));
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (!settings.data) return null;

	const { selectedId, effectiveId, defaultId, effective } = settings.data;
	const models = catalog.data?.models ?? [];
	const unavailable = catalog.data !== undefined && !catalog.data.available;

	const defaultModel = models.find((model) => model.id === defaultId);
	const current = selectedId ?? FOLLOW_DEFAULT;

	const effectiveName = effective?.name ?? effectiveId;

	const currentLabel = selectedId
		? effectiveName
		: t("modelDefault", { name: effectiveName });

	const choose = (id: string) => {
		setOpen(false);
		if (id === current) return;
		save.mutate({ modelId: id === FOLLOW_DEFAULT ? null : id });
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("modelTitle")}</CardTitle>
				<CardDescription>
					{t("modelDescription")}
				</CardDescription>
			</CardHeader>

			<CardContent>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={open}
							aria-label={t("modelLabel")}
							disabled={save.isPending || catalog.isPending || unavailable}
						>
							{currentLabel}
							<Icon icon={ChevronDown} data-icon="inline-end" />
						</Button>
					</PopoverTrigger>

					<PopoverContent align="start" size="fit" className="w-96">
						<Command>
							<CommandInput placeholder={t("modelSearch")} />
							<CommandList>
								<CommandEmpty>{t("modelEmpty")}</CommandEmpty>

								<CommandGroup>
									<CommandItem
										value={`default ${defaultId}`}
										data-checked={current === FOLLOW_DEFAULT}
										onSelect={() => choose(FOLLOW_DEFAULT)}
									>
										{t("modelDefault", { name: defaultModel?.name ?? defaultId })}
									</CommandItem>
								</CommandGroup>

								{byProvider(models).map(([provider, group]) => (
									<CommandGroup key={provider} heading={provider}>
										{group.map((model) => {
											const price = priceHint(t, model);

											return (
												<CommandItem
													key={model.id}
													value={`${model.name} ${model.provider} ${model.id}`}
													data-checked={current === model.id}
													onSelect={() => choose(model.id)}
												>
													<span>{model.name}</span>
													<span className="ml-auto text-muted-foreground text-xs">
														{price ?? contextHint(t, model.contextWindowTokens)}
													</span>
												</CommandItem>
											);
										})}
									</CommandGroup>
								))}
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				<p className="text-muted-foreground text-xs">
					{unavailable
						? t("modelCatalogUnavailable", { id: effectiveId })
						: effective
							? `${effectiveId} · ${contextHint(t, effective.contextWindowTokens)}${
									priceHint(t, effective) ? ` · ${priceHint(t, effective)}` : ""
								}`
							: effectiveId}
				</p>
			</CardContent>
		</Card>
	);
}
