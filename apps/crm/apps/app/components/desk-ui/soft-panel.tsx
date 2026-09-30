import type { ReactNode } from "react";
import { cn } from "@crm/ui/lib/utils";

/** Soft DocuLens / Core panel — rounded-2xl + soft multi-layer shadow. */
export function SoftPanel({
	children,
	className,
	flush,
}: {
	children: ReactNode;
	className?: string;
	/** No padding — for tables / lists that manage their own. */
	flush?: boolean;
}) {
	return (
		<section
			className={cn(
				"overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-[0_1px_2px_rgba(20,18,30,0.03),0_12px_32px_rgba(20,18,30,0.035)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.18)]",
				!flush && "p-5 sm:p-6",
				className,
			)}
		>
			{children}
		</section>
	);
}

export function SoftPanelHeader({
	title,
	description,
	action,
	className,
}: {
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex items-start justify-between gap-3 border-border/70 border-b px-5 py-4 sm:px-6",
				className,
			)}
		>
			<div className="min-w-0">
				<h3 className="font-semibold text-sm tracking-[-0.02em]">{title}</h3>
				{description ? (
					<p className="mt-1 text-muted-foreground text-xs leading-5">
						{description}
					</p>
				) : null}
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</div>
	);
}

export function PanelEyebrow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.16em]",
				className,
			)}
		>
			{children}
		</p>
	);
}

/** Accent CTA panel (PhaseActions shell). */
export function AccentActionPanel({
	eyebrow,
	title,
	description,
	children,
	className,
}: {
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	children?: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6",
				className,
			)}
		>
			{eyebrow ? <PanelEyebrow>{eyebrow}</PanelEyebrow> : null}
			<h3
				className={cn(
					"font-semibold text-lg tracking-[-0.025em]",
					eyebrow && "mt-2",
				)}
			>
				{title}
			</h3>
			{description ? (
				<p className="mt-1.5 text-muted-foreground text-sm leading-6">
					{description}
				</p>
			) : null}
			{children ? <div className="mt-5">{children}</div> : null}
		</section>
	);
}
