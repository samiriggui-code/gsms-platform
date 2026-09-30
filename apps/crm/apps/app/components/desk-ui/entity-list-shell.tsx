import type { ReactNode } from "react";
import {
	DeskPulseBand,
	type DeskPulseRow,
	type DeskPulseStat,
} from "@/components/desk-ui/desk-pulse-band";
import { SoftPanel } from "@/components/desk-ui/soft-panel";

type EntityListShellProps = {
	eyebrow: string;
	headline: ReactNode;
	subhead?: ReactNode;
	body?: string;
	panelTitle?: string;
	panelRows?: DeskPulseRow[];
	stats?: DeskPulseStat[];
	children: ReactNode;
};

/**
 * Pulse + SoftPanel list. Absolute fill keeps DataTable flex-1 height
 * (plain flex-1 under a tall pulse collapses to 0).
 */
export function EntityListShell({
	eyebrow,
	headline,
	subhead,
	body,
	panelTitle,
	panelRows,
	stats,
	children,
}: EntityListShellProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6">
			<DeskPulseBand
				className="shrink-0"
				eyebrow={eyebrow}
				headline={headline}
				subhead={subhead}
				body={body}
				panelTitle={panelTitle}
				panelRows={panelRows}
				stats={stats}
			/>
			<div className="relative min-h-[22rem] flex-1">
				<SoftPanel
					flush
					className="absolute inset-0 flex flex-col"
				>
					{children}
				</SoftPanel>
			</div>
		</div>
	);
}
