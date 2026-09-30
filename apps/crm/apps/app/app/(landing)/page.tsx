import type { Metadata } from "next";
import { AgentSection } from "@/components/landing/agent-section";
import { LandingAnalytics } from "@/components/landing/analytics";
import { CapabilitiesSection } from "@/components/landing/capabilities-section";
import { ClosingCta } from "@/components/landing/closing-cta";
import { ContextsStrip } from "@/components/landing/contexts-strip";
import { FaqSection } from "@/components/landing/faq-section";
import { GSMS_META } from "@/components/landing/gsms-copy";
import { Hero } from "@/components/landing/hero";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { OffersSection } from "@/components/landing/offers-section";
import { ProblemSection } from "@/components/landing/problem-section";

export const metadata: Metadata = {
	title: GSMS_META.title,
	description: GSMS_META.description,
};

export default function Home() {
	return (
		<div className="flex min-h-svh w-full flex-col items-center bg-background font-sans text-foreground">
			<LandingNav />
			<Hero />
			<ProblemSection />
			<ContextsStrip />
			<AgentSection />
			<CapabilitiesSection />
			<OffersSection />
			<FaqSection />
			<ClosingCta />
			<LandingFooter />
			<LandingAnalytics />
		</div>
	);
}
