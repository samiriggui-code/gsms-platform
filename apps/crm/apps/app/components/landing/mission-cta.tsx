"use client";

import { Button } from "@crm/ui/components/button";
import Link from "next/link";
import { type CtaLocation, captureLanding } from "./analytics";

type MissionKind = "audit" | "ao" | "contact";

const LABELS: Record<MissionKind, string> = {
	audit: "Demander un audit",
	ao: "Répondre à un appel d'offres",
	contact: "Nous contacter",
};

function missionHref({
	kind,
	location,
	offer,
}: {
	kind: MissionKind;
	location: CtaLocation;
	offer?: string;
}): string {
	const params = new URLSearchParams({ type: kind, cta: location });
	if (offer) params.set("offer", offer);
	return `/demande?${params.toString()}`;
}

export function MissionCta({
	kind,
	location,
	variant = "default",
	label,
	offer,
}: {
	kind: MissionKind;
	location: CtaLocation;
	variant?: "default" | "outline" | "onInk";
	label?: string;
	offer?: string;
}) {
	return (
		<Button
			asChild
			variant={
				variant === "outline"
					? "outline"
					: variant === "onInk"
						? "secondary"
						: "contrast"
			}
			size="xl"
			className="h-11 rounded-full px-6"
			onClick={() =>
				captureLanding("mission_cta", location, {
					kind,
					...(offer ? { offer } : {}),
				})
			}
		>
			<Link href={missionHref({ kind, location, offer })}>
				{label ?? LABELS[kind]}
			</Link>
		</Button>
	);
}
