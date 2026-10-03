import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileStack,
  FileText,
  Handshake,
  LayoutDashboard,
  ListChecks,
  Lock,
  MapPin,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { MISSION_TYPES } from "@/lib/copy/platform";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  children?: { href: string; label: string }[];
};

/** Navigation /app — exactement la table §16 de GSMS-PLATFORM-CORE-V2. */
export const PLATFORM_NAV: NavItem[] = [
  { href: "/app", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/app/clients", label: "Clients", icon: Building2 },
  { href: "/app/sites", label: "Sites", icon: MapPin },
  {
    href: "/app/missions",
    label: "Missions",
    icon: Briefcase,
    children: MISSION_TYPES.map((type) => ({ href: `/app/missions/${type.slug}`, label: type.label })),
  },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/coffre-fort", label: "Coffre-fort", icon: Lock },
  { href: "/app/audits", label: "Audits", icon: ClipboardCheck },
  { href: "/app/findings", label: "Constats & actions", icon: ListChecks },
  { href: "/app/deadlines", label: "Échéances", icon: CalendarClock },
  { href: "/app/tenders", label: "Appels d'offres", icon: FileStack },
  { href: "/app/commercial", label: "Commercial", icon: Handshake },
  { href: "/app/assistant", label: "Assistant", icon: Sparkles },
  { href: "/app/reports", label: "Rapports", icon: BarChart3 },
  { href: "/app/settings", label: "Paramètres", icon: Settings },
];

export function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function currentSection(pathname: string): NavItem | undefined {
  return PLATFORM_NAV.find((item) => isActive(pathname, item.href, item.exact));
}
