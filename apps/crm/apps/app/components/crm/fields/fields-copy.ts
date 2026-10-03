import type { RecordKind } from "@/components/crm/record-sheet/record-stack";

export const ENTITY_TABS = [
	"company",
	"contact",
	"deal",
] as const satisfies readonly RecordKind[];
