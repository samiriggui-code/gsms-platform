"use client";

import Close from "@carbon/icons-react/es/Close";
import Menu from "@carbon/icons-react/es/Menu";
import { Button } from "@crm/ui/components/button";
import Link from "next/link";
import { useState } from "react";
import { NAV_LINKS } from "./gsms-copy";
import { MissionCta } from "./mission-cta";

export function LandingNavMenu() {
	const [open, setOpen] = useState(false);

	return (
		<div className="md:hidden">
			<Button
				type="button"
				variant="outline-ghost"
				size="icon"
				aria-expanded={open}
				aria-controls="landing-nav-menu"
				aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
				onClick={() => setOpen((value) => !value)}
			>
				{open ? <Close size={16} /> : <Menu size={16} />}
			</Button>

			{open ? (
				<div
					id="landing-nav-menu"
					className="absolute inset-x-0 top-[calc(100%+8px)] z-50 flex flex-col gap-1 rounded-lg border border-border bg-background p-4 shadow-lg"
				>
					{NAV_LINKS.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							onClick={() => setOpen(false)}
							className="rounded-md px-3 py-2.5 text-[15px]/5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							{link.label}
						</Link>
					))}
					<div className="flex flex-col gap-2 pt-3">
						<MissionCta kind="audit" location="nav" />
						<MissionCta kind="ao" location="nav" variant="outline" />
					</div>
				</div>
			) : null}
		</div>
	);
}
