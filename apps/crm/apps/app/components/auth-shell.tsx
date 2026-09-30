import Building from "@carbon/icons-react/es/Building";
import Catalog from "@carbon/icons-react/es/Catalog";
import Partnership from "@carbon/icons-react/es/Partnership";
import Logo from "@crm/ui/components/logo";
import { cn } from "@crm/ui/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

const PANEL_ITEMS = [
	{ icon: Building, label: "Sociétés & pipeline" },
	{ icon: Catalog, label: "Compliance Desk" },
	{ icon: Partnership, label: "Affaires & suivi" },
] as const;

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
				<Logo className="size-4" />
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
				<div className="flex h-14 items-center border-b border-border/70 px-4 sm:px-6 lg:hidden">
					<BrandMark />
				</div>

				<div className="relative flex flex-1 items-center justify-center p-6 sm:p-8 lg:p-10">
					<div className="w-full max-w-[400px] rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-7">
						{children}
					</div>
				</div>
			</section>

			<section className="order-1 flex flex-col overflow-hidden bg-[#111721] text-white lg:order-2 lg:m-5 lg:rounded-[28px] lg:border lg:border-white/10">
				<div className="flex flex-col gap-5 p-8 lg:px-12 lg:pb-6 lg:pt-12">
					<div className="hidden lg:block">
						<BrandMark tone="dark" />
					</div>

					<div className="flex flex-col gap-3">
						<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
							Pipeline & compliance
						</p>
						<h1 className="text-2xl font-semibold tracking-[-0.035em] text-white md:text-[28px]">
							Chaque compte, une mission claire.
						</h1>
						<p className="max-w-md text-sm leading-6 text-white/60">
							CRM GSMS — même signature que le portail Client et le Compliance
							Desk. Sociétés, affaires, pièces et trust au même endroit.
						</p>
					</div>
				</div>

				<div className="relative mt-auto flex flex-1 flex-col justify-end gap-3 px-8 pb-8 lg:px-12 lg:pb-12">
					{PANEL_ITEMS.map(({ icon: Icon, label }) => (
						<div
							key={label}
							className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
						>
							<span className="grid size-9 place-items-center rounded-xl bg-white/10 text-white">
								<Icon size={16} />
							</span>
							<span className="text-sm font-medium text-white/85">{label}</span>
						</div>
					))}
				</div>
			</section>
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
		<div className="flex flex-col gap-3 text-left">
			<Link href="/" aria-label="GSMS CRM" className="flex lg:hidden">
				<BrandMark />
			</Link>
			<div className="flex flex-col gap-1">
				<h2 className="text-2xl font-semibold tracking-[-0.035em] text-balance">
					{title}
				</h2>
				<p className="max-w-[36ch] text-sm leading-5 text-muted-foreground text-pretty">
					{description}
				</p>
			</div>
		</div>
	);
}
