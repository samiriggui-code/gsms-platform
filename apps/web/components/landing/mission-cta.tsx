import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MissionKind = "audit" | "ao" | "contact";

const LABELS: Record<MissionKind, string> = {
  audit: "Demander un audit",
  ao: "Répondre à un appel d'offres",
  contact: "Nous contacter",
};

export function missionHref({ kind, cta, offer }: { kind: MissionKind; cta?: string; offer?: string }) {
  const params = new URLSearchParams({ type: kind });
  if (cta) params.set("cta", cta);
  if (offer) params.set("offer", offer);
  return `/demande?${params.toString()}`;
}

export function MissionCta({
  kind,
  cta,
  offer,
  label,
  variant = "contrast",
  arrow,
  className,
}: {
  kind: MissionKind;
  cta?: string;
  offer?: string;
  label?: string;
  variant?: "contrast" | "outline" | "onInk" | "default";
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link href={missionHref({ kind, cta, offer })} className={cn(buttonVariants({ variant, size: "lg" }), "group/cta", className)}>
      {label ?? LABELS[kind]}
      {arrow ? <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden /> : null}
    </Link>
  );
}
