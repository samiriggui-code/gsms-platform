import Building from "@carbon/icons-react/es/Building";
import Catalog from "@carbon/icons-react/es/Catalog";
import Partnership from "@carbon/icons-react/es/Partnership";
import { cn } from "@crm/ui/lib/utils";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/landing/theme-toggle";

const SITE_HREF = "https://gsms-security.com";

const PANEL_ITEMS = [
	{ icon: Building, label: "Vos sociétés et leur pipeline" },
	{ icon: Catalog, label: "Vos pièces et dossiers, au même endroit" },
	{ icon: Partnership, label: "Vos affaires et échéances suivies" },
] as const;

function LogoMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden
			className={className ?? "size-[17px]"}
		>
			<path
				d="M12 2.5 4 5.6v6.1c0 4.6 3.2 8.6 8 9.8 4.8-1.2 8-5.2 8-9.8V5.6L12 2.5Z"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="m8.5 12 2.4 2.4 4.6-4.8"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function BrandMark({ tone = "light" }: { tone?: "light" | "dark" }) {
	return (
		<div className="inline-flex items-center gap-2.5">
			<span
				className={cn(
					"grid size-8 place-items-center rounded-[10px] shadow-sm",
					tone === "dark"
						? "bg-white text-[#111721]"
						: "bg-foreground text-background",
				)}
			>
				<LogoMark />
			</span>
			<span className="text-[15px] font-semibold tracking-[-0.025em]">
				GSMS{" "}
				<span
					className={
						tone === "dark" ? "text-white/55" : "text-muted-foreground"
					}
				>
					CRM
				</span>
			</span>
		</div>
	);
}

export function AuthShell({ children }: { children: ReactNode }) {
	return (
		<main className="grid min-h-svh w-full grow bg-background text-foreground lg:grid-cols-2">
			<section className="order-2 flex flex-col lg:order-1">
				<div className="flex h-14 items-center justify-between border-b border-border/70 px-4 sm:px-6 lg:hidden">
					<BrandMark />
					<ThemeToggle />
				</div>

				<div className="relative flex flex-1 items-center justify-center p-5 sm:p-8 lg:p-10">
					<div className="absolute end-6 top-6 hidden items-center gap-2 lg:flex">
						<a
							href={SITE_HREF}
							className="text-[13px] text-muted-foreground no-underline hover:text-foreground"
						>
							Retour au site
						</a>
						<ThemeToggle />
					</div>
					<div className="w-full max-w-[420px] rounded-2xl border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgba(20,18,30,0.03),0_12px_32px_rgba(20,18,30,0.035)] sm:p-7">
						{children}
					</div>
				</div>
			</section>

			<aside
				aria-label="GSMS CRM"
				className="order-1 flex flex-col overflow-hidden bg-[#111721] text-white lg:order-2 lg:m-5 lg:rounded-[28px] lg:border lg:border-white/10"
			>
				<div className="flex flex-col gap-5 p-8 lg:px-12 lg:pb-6 lg:pt-12">
					<div className="hidden lg:block">
						<BrandMark tone="dark" />
					</div>

					<div className="flex flex-col gap-3">
						<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
							Espace commercial
						</p>
						<h1 className="text-balance text-2xl font-semibold tracking-[-0.035em] md:text-[30px]/[1.15]">
							Votre pipeline,{" "}
							<span className="font-serif font-normal italic text-white/60">
								suivi au quotidien.
							</span>
						</h1>
						<p className="max-w-md text-sm leading-6 text-white/60">
							Retrouvez vos sociétés, vos affaires, vos pièces compliance et vos
							prochaines échéances.
						</p>
					</div>
				</div>

				<ul className="relative mt-auto hidden flex-1 flex-col justify-end gap-3 px-8 pb-8 sm:flex lg:px-12 lg:pb-12">
					{PANEL_ITEMS.map(({ icon: Icon, label }) => (
						<li
							key={label}
							className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
						>
							<span className="grid size-9 place-items-center rounded-xl bg-white/10 text-white">
								<Icon size={16} />
							</span>
							<span className="text-sm font-medium text-white/85">{label}</span>
						</li>
					))}
				</ul>
			</aside>
		</main>
	);
}

export function AuthHeading({
	title,
	description,
}: {
	title: string;
	description: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<h2 className="text-[22px]/[1.2] font-[650] tracking-[-0.03em] text-balance">
				{title}
			</h2>
			<p className="text-[13.5px]/[1.55] text-muted-foreground text-pretty">
				{description}
			</p>
		</div>
	);
}
