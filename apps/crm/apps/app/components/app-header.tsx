"use client";

import Asleep from "@carbon/icons-react/es/Asleep";
import Light from "@carbon/icons-react/es/Light";
import Logout from "@carbon/icons-react/es/Logout";
import Menu from "@carbon/icons-react/es/Menu";
import UserAvatar from "@carbon/icons-react/es/UserAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@crm/ui/components/avatar";
import { Button } from "@crm/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@crm/ui/components/dropdown-menu";
import Logo from "@crm/ui/components/logo";
import { Skeleton } from "@crm/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { EnrichmentQueue } from "@/components/enrichment-queue";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useMobileNav } from "@/components/mobile-nav";
import { signOutAndRedirect } from "@/lib/sign-out";
import { useTRPC } from "@/lib/trpc/client";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";
import { workspaceLabel } from "@/lib/workspace-label";

type User = { name: string; email: string; image: string | null };

export function AppHeader({ user }: { user: User }) {
	const t = useTranslations("header");
	const { setOpen: setMobileNavOpen } = useMobileNav();
	const trpc = useTRPC();
	const workspaceUrl = useWorkspaceUrl();
	const workspace = useQuery(trpc.workspace.get.queryOptions());
	const label = workspaceLabel(workspace.data?.name);

	return (
		<header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background/85 px-3 backdrop-blur-md supports-backdrop-filter:bg-background/70 [view-transition-name:app-header] md:px-4">
			<div className="flex min-w-0 shrink-0 items-center gap-2.5">
				<Button
					variant="ghost"
					size="icon"
					className="md:hidden"
					aria-label={t("openNav")}
					onClick={() => setMobileNavOpen(true)}
				>
					<Menu />
				</Button>
				<Link
					href={workspaceUrl()}
					aria-label={t("homepage")}
					className="hidden items-center gap-2.5 text-foreground md:inline-flex"
				>
					<span className="grid size-8 place-items-center rounded-[10px] bg-foreground text-background shadow-sm">
						<Logo className="size-4" />
					</span>
					<span className="text-[15px] font-semibold tracking-[-0.025em]">
						GSMS{" "}
						<span className="text-muted-foreground">CRM</span>
					</span>
				</Link>
				<span
					aria-hidden
					className="mx-1 hidden h-5 w-px bg-border/80 md:block"
				/>
				<span className="min-w-0 truncate text-sm font-medium tracking-[-0.01em]">
					{label}
				</span>
			</div>

			<div className="ml-auto flex shrink-0 items-center gap-1.5">
				<LocaleSwitcher />
				<EnrichmentQueue />
				<UserMenu
					user={user}
					onSignOut={() => {
						signOutAndRedirect().catch(() => toast.error(t("signOutError")));
					}}
				/>
			</div>
		</header>
	);
}

export function AppHeaderFallback() {
	const t = useTranslations("header");
	return (
		<header
			className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background/85 px-3 backdrop-blur-md [view-transition-name:app-header] md:px-4"
			aria-busy="true"
		>
			<div className="flex shrink-0 items-center gap-2.5">
				<span className="hidden size-8 items-center justify-center rounded-[10px] bg-foreground text-background md:grid">
					<Logo className="size-4" />
				</span>
				<span
					aria-hidden
					className="mx-1 hidden h-5 w-px bg-border/80 md:block"
				/>
				<Skeleton className="h-4 w-24" />
			</div>

			<div className="ml-auto flex shrink-0 items-center gap-1.5">
				<Avatar className="size-7">
					<AvatarFallback />
				</Avatar>
			</div>
			<span role="status" className="sr-only">
				{t("loading")}
			</span>
		</header>
	);
}

function UserMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
	const t = useTranslations("header");
	const { resolvedTheme, setTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label={t("accountMenu")}
					className="hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent"
				>
					<Avatar className="size-7">
						{user.image && <AvatarImage alt={user.name} src={user.image} />}
						<AvatarFallback className="text-xs">
							{initials(user.name)}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-56">
				<DropdownMenuLabel className="flex items-center gap-2">
					<UserAvatar />
					<span className="min-w-0 truncate">{user.email}</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onSelect={(event) => {
						event.preventDefault();
						setTheme(isDark ? "light" : "dark");
					}}
				>
					{isDark ? <Light /> : <Asleep />}
					{isDark ? t("themeLight") : t("themeDark")}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onSignOut}>
					<Logout />
					{t("signOut")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function initials(name: string): string {
	return (
		name
			.split(" ")
			.map((part) => part[0])
			.filter(Boolean)
			.slice(0, 2)
			.join("")
			.toUpperCase() || "?"
	);
}
