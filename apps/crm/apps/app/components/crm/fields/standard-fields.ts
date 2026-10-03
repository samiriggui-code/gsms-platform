import type { FieldEntity } from "./fields-entity";

export const STANDARD_FIELDS = {
	COMPANY: [
		"name",
		"domain",
		"website",
		"phone",
		"email",
		"city",
		"country",
		"owner",
	],
	CONTACT: [
		"firstName",
		"lastName",
		"title",
		"email",
		"phone",
		"linkedin",
		"github",
		"company",
		"owner",
	],
	DEAL: [
		"name",
		"amount",
		"currency",
		"closeDate",
		"company",
		"owner",
		"stage",
	],
} satisfies Record<FieldEntity, readonly string[]>;
