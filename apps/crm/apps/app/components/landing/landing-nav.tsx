import Link from "next/link";
import { NAV_LINKS } from "./gsms-copy";
import { LandingNavMenu } from "./landing-nav-menu";
import { MissionCta } from "./mission-cta";
import { NavMegaMenu } from "./nav-mega-menu";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./wordmark";

export function LandingNav() {
	return (
		<header className="pointer-events-none sticky top-0 z-50 flex w-full shrink-0 justify-center px-4 pt-4">
			<nav className="pointer-events-auto relative flex h-14 w-full max-w-5xl items-center gap-6 rounded-lg border border-border bg-background/80 px-4 shadow-lg backdrop-blur-md">
				<Link href="/" aria-label="GSMS — accueil">
					<Wordmark />
				</Link>

				<div className="hidden min-w-0 grow items-center gap-5 md:flex">
					<NavMegaMenu />
					{NAV_LINKS.filter((link) => link.label !== "Prestations").map(
						(link) => (
							<Link
								key={link.href}
								href={link.href}
								className="shrink-0 text-[13px]/5 text-muted-foreground transition-colors hover:text-foreground"
							>
								{link.label}
							</Link>
						),
					)}
				</div>

				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
					<span className="hidden sm:inline-flex">
						<MissionCta kind="audit" location="nav" />
					</span>
					<LandingNavMenu />
				</div>
			</nav>
		</header>
	);
}
