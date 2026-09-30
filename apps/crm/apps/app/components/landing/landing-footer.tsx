import Link from "next/link";
import { FOOTER } from "./gsms-copy";
import { MissionCta } from "./mission-cta";
import { Wordmark } from "./wordmark";

export function LandingFooter() {
	return (
		<footer className="relative flex w-full shrink-0 flex-col items-center border-border border-t">
			<div className="grid w-full max-w-6xl gap-12 px-6 py-16 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:gap-10">
				<div className="flex max-w-sm flex-col items-start gap-4">
					<Wordmark />
					<p className="text-[13px]/[21px] text-muted-foreground">
						{FOOTER.blurb}
					</p>
					<MissionCta kind="audit" location="footer" />
				</div>

				{FOOTER.columns.map((column) => (
					<nav
						key={column.title}
						className="flex min-w-0 flex-col items-start gap-3.5"
					>
						<p className="font-mono text-[11px]/4 text-muted-foreground tracking-widest uppercase">
							{column.title}
						</p>
						{column.links.map((link) => (
							<Link
								key={link.label}
								href={link.href}
								className="text-[13px]/5 text-muted-foreground transition-colors hover:text-foreground"
							>
								{link.label}
							</Link>
						))}
					</nav>
				))}
			</div>

			<div className="flex w-full justify-center border-border border-t">
				<div className="flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4 md:h-[60px] md:py-0">
					<p className="flex-1 text-[13px]/[21px] text-muted-foreground">
						{FOOTER.legal}
					</p>
					<p className="text-[13px]/5 text-muted-foreground">
						Sécurité, sûreté et prévention · France
					</p>
				</div>
			</div>
		</footer>
	);
}
