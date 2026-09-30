import { TRUST } from "./gsms-copy";

export function TrustGrid() {
	return (
		<div className="grid w-full max-w-[420px] grid-cols-2 gap-3">
			{TRUST.items.map((item) => (
				<div
					key={item.label}
					className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-5"
				>
					<span className="font-[650] text-[13px]/5 tracking-[-0.01em]">
						{item.label}
					</span>
					<span className="text-[12px]/[1.5] text-muted-foreground">
						{item.detail}
					</span>
				</div>
			))}
		</div>
	);
}
