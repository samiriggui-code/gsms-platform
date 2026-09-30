import Checkmark from "@carbon/icons-react/es/Checkmark";
import Close from "@carbon/icons-react/es/Close";
import { COMPARE } from "./gsms-copy";

export function CompareTable() {
	return (
		<div className="mx-auto w-full max-w-[760px] overflow-clip rounded-[20px] border border-border bg-muted/40">
			<div className="grid grid-cols-2 border-border border-b">
				<p className="px-6 py-3.5 font-mono font-semibold text-[11px]/4 text-muted-foreground uppercase tracking-[0.06em]">
					{COMPARE.head.them}
				</p>
				<p className="border-border border-l bg-primary/[0.04] px-6 py-3.5 font-mono font-semibold text-[11px]/4 text-foreground uppercase tracking-[0.06em]">
					{COMPARE.head.us}
				</p>
			</div>

			{COMPARE.rows.map((row) => (
				<div
					key={row.us}
					className="grid grid-cols-2 not-last:border-border not-last:border-b"
				>
					<div className="flex items-start gap-2.5 px-6 py-4 text-[14px]/[1.45] text-muted-foreground">
						<Close size={16} className="mt-0.5 shrink-0 opacity-50" />
						<span>{row.them}</span>
					</div>
					<div className="flex items-start gap-2.5 border-border border-l bg-primary/[0.04] px-6 py-4 font-medium text-[14px]/[1.45]">
						<Checkmark size={16} className="mt-0.5 shrink-0 text-primary" />
						<span>{row.us}</span>
					</div>
				</div>
			))}
		</div>
	);
}
