export function Eyebrow({ children }: { children: string }) {
	return (
		<p className="flex items-center gap-2 font-medium font-mono text-[11px]/4 text-muted-foreground uppercase tracking-[0.08em]">
			<span className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary),transparent_85%)]" />
			{children}
		</p>
	);
}

export function SectionHeading({
	eyebrow,
	title,
	accent,
	lede,
}: {
	eyebrow?: string;
	title: string;
	accent?: string;
	lede?: string;
}) {
	return (
		<div className="flex max-w-3xl flex-col gap-4">
			{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
			<h2 className="text-balance font-[650] text-[clamp(30px,3.6vw,52px)]/[1.06] tracking-[-0.035em]">
				{title}
				{accent ? (
					<>
						{" "}
						<span className="font-serif font-normal text-muted-foreground italic">
							{accent}
						</span>
					</>
				) : null}
			</h2>
			{lede ? (
				<p className="text-lg/[29px] text-muted-foreground">{lede}</p>
			) : null}
		</div>
	);
}
