"use client";

import Building from "@carbon/icons-react/es/Building";
import Catalog from "@carbon/icons-react/es/Catalog";
import CertificateCheck from "@carbon/icons-react/es/CertificateCheck";
import Close from "@carbon/icons-react/es/Close";
import Dashboard from "@carbon/icons-react/es/Dashboard";
import Partnership from "@carbon/icons-react/es/Partnership";
import Settings from "@carbon/icons-react/es/Settings";
import UserMultiple from "@carbon/icons-react/es/UserMultiple";
import { Button } from "@crm/ui/components/button";
import type { CarbonIcon } from "@crm/ui/components/icon";
import { Icon } from "@crm/ui/components/icon";
import Bot from "@crm/ui/components/icons/bot";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@crm/ui/components/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@crm/ui/components/tooltip";
import { cn } from "@crm/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { AgentBuilderSidebar } from "@/components/agent-builder/agent-builder-sidebar";
import { usePrefetchSection } from "@/components/crm/section-prefetch";
import { useMobileNav } from "@/components/mobile-nav";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

type RailKey =
	| "overview"
	| "chat"
	| "companies"
	| "contacts"
	| "deals"
	| "compliance"
	| "trust"
	| "settings";

type RailItem = {
	key: RailKey;
	href: string;
	icon: CarbonIcon;
	iconClassName?: string;
	match: "exact" | "prefix";
	related?: string[];
};

const ITEMS: RailItem[] = [
	{ key: "overview", href: "/", icon: Dashboard, match: "exact" },
	{
		key: "chat",
		href: "/chat",
		icon: Bot,
		iconClassName: "size-5",
		match: "prefix",
		related: ["/agents"],
	},
	{ key: "companies", href: "/companies", icon: Building, match: "prefix" },
	{
		key: "contacts",
		href: "/contacts",
		icon: UserMultiple,
		match: "prefix",
	},
	{ key: "deals", href: "/deals", icon: Partnership, match: "prefix" },
	{
		key: "compliance",
		href: "/compliance",
		icon: Catalog,
		match: "prefix",
	},
	{ key: "trust", href: "/trust", icon: CertificateCheck, match: "prefix" },
	{ key: "settings", href: "/settings", icon: Settings, match: "prefix" },
];

function isActive(item: RailItem, pathname: string): boolean {
	return (
		pathname === item.href ||
		(item.match === "prefix" && pathname.startsWith(item.href)) ||
		Boolean(item.related?.some((prefix) => pathname.startsWith(prefix)))
	);
}

function RailLink({
	item,
	title,
	active,
	onPrefetch,
}: {
	item: RailItem;
	title: string;
	active: boolean;
	onPrefetch: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					asChild
					variant="ghost"
					size="icon"
					className={cn(
						"rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground",
						active &&
							"bg-background text-foreground shadow-sm hover:bg-background hover:text-foreground",
					)}
				>
					<Link
						href={item.href}
						prefetch
						onMouseEnter={onPrefetch}
						onFocus={onPrefetch}
						aria-current={active ? "page" : undefined}
						transitionTypes={["nav-lateral"]}
					>
						<Icon icon={item.icon} className={item.iconClassName} />
						<span className="sr-only">{title}</span>
					</Link>
				</Button>
			</TooltipTrigger>
			<TooltipContent side="right">{title}</TooltipContent>
		</Tooltip>
	);
}

function MobileRailLink({
	item,
	title,
	active,
	onNavigate,
	onPrefetch,
}: {
	item: RailItem;
	title: string;
	active: boolean;
	onNavigate: () => void;
	onPrefetch: () => void;
}) {
	return (
		<Button
			asChild
			variant="ghost"
			className={cn(
				"justify-start gap-3 rounded-xl text-muted-foreground",
				active &&
					"bg-background text-foreground shadow-sm hover:bg-background hover:text-foreground",
			)}
		>
			<Link
				href={item.href}
				prefetch
				onMouseEnter={onPrefetch}
				onFocus={onPrefetch}
				aria-current={active ? "page" : undefined}
				onClick={onNavigate}
				transitionTypes={[
					item.key === "chat" ? "nav-forward" : "nav-lateral",
				]}
			>
				<Icon icon={item.icon} className={item.iconClassName} />
				<span>{title}</span>
			</Link>
		</Button>
	);
}

function MobileRailIconLink({
	item,
	title,
	active,
	onNavigate,
	onPrefetch,
}: {
	item: RailItem;
	title: string;
	active: boolean;
	onNavigate: () => void;
	onPrefetch: () => void;
}) {
	return (
		<Button
			asChild
			variant="ghost"
			size="icon"
			className={cn(
				"rounded-xl text-muted-foreground",
				active &&
					"bg-background text-foreground shadow-sm hover:bg-background hover:text-foreground",
			)}
		>
			<Link
				href={item.href}
				prefetch
				onMouseEnter={onPrefetch}
				onFocus={onPrefetch}
				aria-current={active ? "page" : undefined}
				onClick={onNavigate}
			>
				<Icon icon={item.icon} className={item.iconClassName} />
				<span className="sr-only">{title}</span>
			</Link>
		</Button>
	);
}

export function AppIconRailFallback() {
	const t = useTranslations("nav");
	return (
		<nav
			aria-label={t("mainNav")}
			aria-busy="true"
			className="hidden w-[3.75rem] shrink-0 flex-col items-center gap-1.5 border-r border-border/70 bg-surface-subtle/90 py-3 md:flex [view-transition-name:app-rail]"
		>
			{ITEMS.map((item) => (
				<Button
					key={item.href}
					variant="ghost"
					size="icon"
					disabled
					className="rounded-xl text-muted-foreground"
				>
					<Icon icon={item.icon} className={item.iconClassName} />
					<span className="sr-only">{t(item.key)}</span>
				</Button>
			))}
		</nav>
	);
}

export function AppIconRail() {
	const t = useTranslations("nav");
	const pathname = usePathname();
	const workspaceUrl = useWorkspaceUrl();
	const { open, setOpen } = useMobileNav();
	const prefetchSection = usePrefetchSection();

	const items = useMemo(
		() =>
			ITEMS.map((item) => ({
				...item,
				section: item.href,
				href: workspaceUrl(item.href),
				related: item.related?.map((path) => workspaceUrl(path)),
			})),
		[workspaceUrl],
	);
	const inChat = items.some(
		(item) => item.key === "chat" && isActive(item, pathname),
	);

	return (
		<>
			<nav
				aria-label={t("mainNav")}
				className="hidden w-[3.75rem] shrink-0 flex-col items-center gap-1.5 border-r border-border/70 bg-surface-subtle/90 py-3 md:flex [view-transition-name:app-rail]"
			>
				{items.map((item) => (
					<RailLink
						key={item.href}
						item={item}
						title={t(item.key)}
						active={isActive(item, pathname)}
						onPrefetch={() => prefetchSection(item.section)}
					/>
				))}
			</nav>

			<Sheet open={open} onOpenChange={setOpen}>
				{inChat ? (
					<SheetContent
						side="left"
						showCloseButton={false}
						className="w-5/6 max-w-sm flex-row gap-0 p-0"
					>
						<SheetHeader className="sr-only">
							<SheetTitle>{t("mainNav")}</SheetTitle>
						</SheetHeader>
						<nav
							aria-label={t("mainNav")}
							className="flex w-[3.75rem] shrink-0 flex-col items-center gap-1.5 border-r border-border/70 bg-surface-subtle/90 py-3"
						>
							<Button
								variant="ghost"
								size="icon"
								className="rounded-xl"
								aria-label={t("closeNav")}
								onClick={() => setOpen(false)}
							>
								<Icon icon={Close} />
							</Button>
							<div className="my-1 h-px w-5 bg-border" />
							{items.map((item) => (
								<MobileRailIconLink
									key={item.href}
									item={item}
									title={t(item.key)}
									active={isActive(item, pathname)}
									onNavigate={() => setOpen(false)}
									onPrefetch={() => prefetchSection(item.section)}
								/>
							))}
						</nav>
						<AgentBuilderSidebar
							className="flex flex-1"
							onNavigate={() => setOpen(false)}
						/>
					</SheetContent>
				) : (
					<SheetContent side="left" className="w-64 gap-0 bg-surface-subtle p-0">
						<SheetHeader>
							<SheetTitle>{t("mainNav")}</SheetTitle>
						</SheetHeader>
						<nav
							aria-label={t("mainNav")}
							className="flex flex-1 flex-col gap-1 p-2"
						>
							{items.map((item) => (
								<MobileRailLink
									key={item.href}
									item={item}
									title={t(item.key)}
									active={isActive(item, pathname)}
									onNavigate={() => setOpen(false)}
									onPrefetch={() => prefetchSection(item.section)}
								/>
							))}
						</nav>
					</SheetContent>
				)}
			</Sheet>
		</>
	);
}
