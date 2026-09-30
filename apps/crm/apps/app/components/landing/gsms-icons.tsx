import Building from "@carbon/icons-react/es/Building";
import Certificate from "@carbon/icons-react/es/Certificate";
import DocumentTasks from "@carbon/icons-react/es/DocumentTasks";
import Events from "@carbon/icons-react/es/Events";
import Fire from "@carbon/icons-react/es/Fire";
import Industry from "@carbon/icons-react/es/Industry";
import Report from "@carbon/icons-react/es/Report";
import Rule from "@carbon/icons-react/es/Rule";
import Security from "@carbon/icons-react/es/Security";
import Wikis from "@carbon/icons-react/es/Wikis";

const ICONS = {
	audit: Report,
	fire: Fire,
	commission: Certificate,
	building: Building,
	tender: DocumentTasks,
	rule: Rule,
	public: Wikis,
	care: Events,
	industry: Industry,
	security: Security,
} as const;

export type GsmsIconName = keyof typeof ICONS;

export function GsmsIcon({
	name,
	size = 20,
	className,
}: {
	name: GsmsIconName;
	size?: number;
	className?: string;
}) {
	const Icon = ICONS[name];
	return <Icon size={size} className={className} aria-hidden />;
}
