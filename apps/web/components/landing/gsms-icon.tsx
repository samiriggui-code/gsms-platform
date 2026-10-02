import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Factory,
  FileStack,
  Flame,
  HeartPulse,
  Landmark,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  audit: ClipboardCheck,
  fire: Flame,
  commission: BadgeCheck,
  building: Building2,
  tender: FileStack,
  rule: Scale,
  public: Landmark,
  care: HeartPulse,
  industry: Factory,
  security: ShieldCheck,
} satisfies Record<string, LucideIcon>;

export type GsmsIconName = keyof typeof ICONS;

export function GsmsIcon({ name, className }: { name: GsmsIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden strokeWidth={1.8} />;
}

export function IconTile({ name }: { name: GsmsIconName }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-primary/15 bg-primary/[0.06]">
      <GsmsIcon name={name} className="size-[18px] text-primary" />
    </span>
  );
}
