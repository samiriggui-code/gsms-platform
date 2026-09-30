import ChevronDown from "@carbon/icons-react/es/ChevronDown";
import Link from "next/link";
import { GsmsIcon, type GsmsIconName } from "./gsms-icons";
import { MISSIONS, SECTEURS } from "./gsms-prestations";

export function NavMegaMenu() {
	return (
		<div className="group/mega relative">
			<Link
				href="/prestations"
				className="flex shrink-0 items-center gap-1 text-[13px]/5 text-muted-foreground transition-colors hover:text-foreground"
			>
				Prestations
				<ChevronDown
					size={12}
					className="text-muted-foreground/70 transition-transform group-hover/mega:rotate-180 group-focus-within/mega:rotate-180"
				/>
			</Link>

			<div className="-translate-x-1/2 pointer-events-none absolute top-[calc(100%+14px)] left-1/2 w-[560px] rounded-lg border border-border bg-background p-2 opacity-0 shadow-xl transition-opacity group-focus-within/mega:pointer-events-auto group-hover/mega:pointer-events-auto group-focus-within/mega:opacity-100 group-hover/mega:opacity-100">
				<div className="grid grid-cols-2 gap-3">
					<NavSection title="Missions" items={MISSIONS} />
					<NavSection title="Secteurs" items={SECTEURS} />
				</div>
				<Link
					href="/prestations"
					className="mt-2 flex min-h-[74px] flex-col gap-1 rounded-md bg-muted/50 p-3.5 text-foreground transition-colors hover:bg-muted"
				>
					<span className="font-medium text-[13px]/5">
						Voir toutes les prestations
					</span>
					<span className="text-[12px]/5 text-muted-foreground">
						Missions et secteurs, en un seul endroit.
					</span>
				</Link>
			</div>
		</div>
	);
}

function NavSection({
	title,
	items,
}: {
	title: string;
	items: { slug: string; title: string; icon: GsmsIconName }[];
}) {
	return (
		<div className="rounded-md border border-border p-3">
			<p className="mb-2 font-mono text-[10px]/4 text-muted-foreground uppercase tracking-[0.08em]">
				{title}
			</p>
			<div className="grid gap-px">
				{items.map((item) => (
					<Link
						key={item.slug}
						href={`/prestations/${item.slug}`}
						className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px]/[1.3] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
					>
						<GsmsIcon
							name={item.icon}
							size={14}
							className="shrink-0 text-primary"
						/>
						{item.title.replace(/\.$/, "")}
					</Link>
				))}
			</div>
		</div>
	);
}
