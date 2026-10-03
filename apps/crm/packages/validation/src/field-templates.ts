export type FieldTemplate = {
	label: string;
	type: "SELECT" | "USER" | "NUMBER";
	options?: readonly string[];
};

export const FIELD_TEMPLATES = {
	COMPANY: [
		{
			label: "Statut du compte",
			type: "SELECT",
			options: ["Prospect", "Client", "Partenaire", "Ancien client"],
		},
		{
			label: "Taille",
			type: "SELECT",
			options: ["Grand compte", "ETI", "PME", "TPE"],
		},
		{
			label: "Région",
			type: "SELECT",
			options: [
				"Île-de-France",
				"Auvergne-Rhône-Alpes",
				"Provence-Alpes-Côte d'Azur",
				"Hauts-de-France",
				"Autre région",
			],
		},
		{
			label: "Origine",
			type: "SELECT",
			options: [
				"Demande entrante",
				"Prospection",
				"Salon",
				"Recommandation",
				"Appel d'offres",
			],
		},
		{ label: "Score d'adéquation", type: "NUMBER" },
		{ label: "Commercial référent", type: "USER" },
	],
	CONTACT: [],
	DEAL: [],
} satisfies Record<"COMPANY" | "CONTACT" | "DEAL", readonly FieldTemplate[]>;
