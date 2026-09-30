import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { MissionRequestForm } from "@/components/landing/mission-request-form";
import { Wordmark } from "@/components/landing/wordmark";

export const metadata: Metadata = {
	title: "Demande de mission — GSMS",
	description:
		"Demandez un audit, un accompagnement AO ou contactez GSMS. Votre demande est transmise à nos équipes.",
};

export default function DemandePage() {
	return (
		<div className="flex min-h-svh w-full flex-col items-center bg-background font-sans text-foreground">
			<LandingNav />
			<main className="flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12 md:py-16">
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					<Wordmark />
					<span>· demande de mission</span>
				</div>
				<Suspense
					fallback={
						<div className="rounded-lg border border-border p-8 text-muted-foreground text-sm">
							Chargement…
						</div>
					}
				>
					<MissionRequestForm />
				</Suspense>
			</main>
			<LandingFooter />
		</div>
	);
}
