"use client";

import { Button } from "@crm/ui/components/button";
import { cn } from "@crm/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

type SettingsNavKey =
	| "general"
	| "security"
	| "tracking"
	| "connections"
	| "currencies"
	| "members"
	| "apiKeys"
	| "sso";

type SettingsNavItem = {
	title: SettingsNavKey;
	href: string;
};

const ROOT = "/settings";

const ITEMS: SettingsNavItem[] = [
	{ title: "general", href: ROOT },
	{ title: "security", href: `${ROOT}/security` },
	{ title: "tracking", href: `${ROOT}/tracking` },
	{ title: "connections", href: `${ROOT}/connections` },
	{ title: "currencies", href: `${ROOT}/currencies` },
	{ title: "members", href: `${ROOT}/members` },
	{ title: "apiKeys", href: `${ROOT}/api-keys` },
	{ title: "sso", href: `${ROOT}/sso` },
];

function isActive(href: string, root: string, pathname: string): boolean {
	return href === root ? pathname === href : pathname.startsWith(href);
}

function NavLink({
	item,
	active,
	className,
}: {
	item: SettingsNavItem;
	active: boolean;
	className: string;
}) {
	const t = useTranslations("settingsNav");

	return (
		<Button
			asChild
			variant="ghost"
			className={cn(
				"justify-start font-normal text-muted-foreground",
				active &&
					"bg-muted text-foreground hover:bg-muted hover:text-foreground",
				className,
			)}
		>
			<Link
				href={item.href}
				prefetch
				aria-current={active ? "page" : undefined}
				transitionTypes={["nav-lateral"]}
			>
				{t(item.title)}
			</Link>
		</Button>
	);
}

export function SettingsSidebarFallback() {
	const t = useTranslations("settingsNav");

	return (
		<>
			<aside className="hidden w-56 shrink-0 border-r md:block [view-transition-name:settings-sidebar]">
				<nav
					aria-label={t("ariaLabel")}
					aria-busy="true"
					className="flex flex-col gap-0.5 p-3"
				>
					{ITEMS.map((item) => (
						<Button
							key={item.href}
							variant="ghost"
							disabled
							className="w-full justify-start px-3 font-normal text-muted-foreground"
						>
							{t(item.title)}
						</Button>
					))}
				</nav>
			</aside>

			<nav
				aria-label={t("ariaLabel")}
				aria-busy="true"
				className="flex gap-1 overflow-x-auto border-b p-2 md:hidden [view-transition-name:settings-sidebar]"
			>
				{ITEMS.map((item) => (
					<Button
						key={item.href}
						variant="ghost"
						disabled
						className="shrink-0 justify-start px-3 font-normal text-muted-foreground"
					>
						{t(item.title)}
					</Button>
				))}
			</nav>
		</>
	);
}

export function SettingsSidebar() {
	const t = useTranslations("settingsNav");
	const pathname = usePathname();
	const workspaceUrl = useWorkspaceUrl();

	const root = workspaceUrl(ROOT);
	const items = useMemo(
		() => ITEMS.map((item) => ({ ...item, href: workspaceUrl(item.href) })),
		[workspaceUrl],
	);

	return (
		<>
			<aside className="hidden w-56 shrink-0 border-r md:block [view-transition-name:settings-sidebar]">
				<nav aria-label={t("ariaLabel")} className="flex flex-col gap-0.5 p-3">
					{items.map((item) => (
						<NavLink
							key={item.href}
							item={item}
							active={isActive(item.href, root, pathname)}
							className="w-full px-3"
						/>
					))}
				</nav>
			</aside>

			<nav
				aria-label={t("ariaLabel")}
				className="flex gap-1 overflow-x-auto border-b p-2 md:hidden [view-transition-name:settings-sidebar]"
			>
				{items.map((item) => (
					<NavLink
						key={item.href}
						item={item}
						active={isActive(item.href, root, pathname)}
						className="shrink-0 px-3"
					/>
				))}
			</nav>
		</>
	);
}
