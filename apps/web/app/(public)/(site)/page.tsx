import type { Metadata } from "next";
import { ClosingCta } from "@/components/landing/closing-cta";
import { ContextsSection } from "@/components/landing/contexts-section";
import { FaqSection } from "@/components/landing/faq-section";
import { Hero } from "@/components/landing/hero";
import { OffersSection } from "@/components/landing/offers-section";
import { ParcoursSection } from "@/components/landing/parcours-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { GSMS_META } from "@/lib/copy/landing";

export const metadata: Metadata = {
  title: { absolute: GSMS_META.title },
  description: GSMS_META.description,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <ContextsSection />
      <ParcoursSection />
      <OffersSection />
      <FaqSection />
      <ClosingCta />
    </>
  );
}
