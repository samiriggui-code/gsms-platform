import { mirror } from "../src/blob";
import { db } from "../src/client";
import { DEFAULT_REPORTING_CURRENCY } from "../src/currency";
import { resolveFavicon } from "../src/favicon";
import { fieldKeyFromLabel } from "../src/fields-shape";
import {
	ActivityType,
	DealStage,
	type FieldEntity,
	FieldType,
	RateSource,
} from "../src/generated/prisma/enums";
import { readReportingCurrency, SETTINGS_ID } from "../src/settings";

function makeRandom(seed: number): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const random = makeRandom(20260731);

function pick<T>(items: readonly T[]): T {
	const item = items[Math.floor(random() * items.length)];
	if (item === undefined) throw new Error("pick() on an empty list");
	return item;
}

function chance(probability: number): boolean {
	return random() < probability;
}

function integer(min: number, max: number): number {
	return min + Math.floor(random() * (max - min + 1));
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();

function daysFromNow(days: number, jitterHours = 0): Date {
	const jitter = jitterHours
		? (random() - 0.5) * jitterHours * 60 * 60 * 1000
		: 0;
	return new Date(NOW + days * DAY_MS + jitter);
}

function digits(count: number): string {
	let value = "";
	for (let index = 0; index < count; index++) value += String(integer(0, 9));
	return value;
}

function frenchPhone(prefix: string): string {
	const pairs = Array.from({ length: 4 }, () =>
		String(integer(0, 99)).padStart(2, "0"),
	);
	return `+33 ${prefix} ${pairs.join(" ")}`;
}

const OWNERS = [
	{ name: "Claire Martin", email: "claire.martin@gsms-security.example" },
	{ name: "Julien Bernard", email: "julien.bernard@gsms-security.example" },
	{ name: "Nadia Haddad", email: "nadia.haddad@gsms-security.example" },
] as const;

const MISSION_TYPES = [
	"audit",
	"appel-offres",
	"commission-securite",
	"accompagnement",
	"conformite",
	"contact",
] as const;

type Mission = (typeof MISSION_TYPES)[number];

const STATUTS_COMMERCIAUX = [
	"Prospect",
	"Client",
	"Ancien client",
	"Partenaire",
	"Fournisseur",
] as const;

const TYPES_ETABLISSEMENT = [
	"ERP",
	"IGH",
	"ERP + IGH",
	"ICPE",
	"Habitation",
	"Bureaux / tertiaire (Code du travail)",
	"Industrie / logistique",
	"Santé / médico-social",
	"Société de sécurité privée",
] as const;

type TypeEtablissement = (typeof TYPES_ETABLISSEMENT)[number];

const CATEGORIES_ERP = [
	"1re catégorie (plus de 1 500 personnes)",
	"2e catégorie (701 à 1 500)",
	"3e catégorie (301 à 700)",
	"4e catégorie (300 et moins)",
	"5e catégorie (petit établissement)",
] as const;

type CategorieErp = (typeof CATEGORIES_ERP)[number];

const ETABLISSEMENT_TYPES = [
	"Établissement recevant du public",
	"Santé et accueil spécialisé",
	"Tertiaire, industrie et logistique",
	"Société de sécurité privée",
] as const;

type DealEtablissement = (typeof ETABLISSEMENT_TYPES)[number];

const DEAL_ETABLISSEMENT: Record<TypeEtablissement, DealEtablissement> = {
	ERP: "Établissement recevant du public",
	IGH: "Tertiaire, industrie et logistique",
	"ERP + IGH": "Établissement recevant du public",
	ICPE: "Tertiaire, industrie et logistique",
	Habitation: "Santé et accueil spécialisé",
	"Bureaux / tertiaire (Code du travail)": "Tertiaire, industrie et logistique",
	"Industrie / logistique": "Tertiaire, industrie et logistique",
	"Santé / médico-social": "Santé et accueil spécialisé",
	"Société de sécurité privée": "Société de sécurité privée",
};

const TITLES_ERP = [
	"Directeur de site",
	"Responsable sécurité",
	"Chargé de sécurité incendie",
	"Directeur technique",
	"Responsable des services généraux",
	"Chef de service SSIAP",
] as const;

const TITLES_SANTE = [
	"Directeur d'établissement",
	"Directeur des services techniques",
	"Responsable sécurité",
	"Acheteur",
	"Responsable HSE",
	"Chef de service SSIAP",
] as const;

const TITLES_PUBLIC = [
	"Secrétaire général de mairie",
	"Directeur des services techniques",
	"Responsable du patrimoine bâti",
	"Acheteur public",
	"Chargé de sécurité incendie",
] as const;

const TITLES_ENSEIGNEMENT = [
	"Proviseur",
	"Gestionnaire",
	"Directeur du patrimoine immobilier",
	"Responsable sécurité",
	"Acheteur public",
] as const;

const TITLES_INDUSTRIE = [
	"Directeur de site",
	"Responsable HSE",
	"Directeur technique",
	"Responsable maintenance",
	"Acheteur",
] as const;

const TITLES_IGH = [
	"Directeur de l'immeuble",
	"Property manager",
	"Chef de service SSIAP 3",
	"Responsable des services généraux",
	"Acheteur",
] as const;

const TITLES_SECURITE_PRIVEE = [
	"Directeur d'agence",
	"Responsable commercial",
	"Responsable des appels d'offres",
	"Directeur des opérations",
] as const;

type DealTemplate = {
	title: string;
	mission: Mission;
	min: number;
	max: number;
};

type SeedCompany = {
	name: string;
	domain: string;
	industry: string;
	city: string;
	country: string;
	countryCode: string;
	phonePrefix: string;
	titles: readonly string[];
	statut: (typeof STATUTS_COMMERCIAUX)[number];
	typeEtablissement: TypeEtablissement;
	categorieErp: CategorieErp | null;
	typesActiviteErp: string | null;
	effectif: number | null;
	prochaineCommission: string | null;
	nombreDeSites: number;
	deals: readonly DealTemplate[];
};

const COMPANIES: readonly SeedCompany[] = [
	{
		name: "Centre commercial Les Arcades",
		domain: "arcades-lyon.example",
		industry: "Commerce et centres commerciaux",
		city: "Lyon",
		country: "France",
		countryCode: "FR",
		phonePrefix: "4 78",
		titles: TITLES_ERP,
		statut: "Client",
		typeEtablissement: "ERP",
		categorieErp: "1re catégorie (plus de 1 500 personnes)",
		typesActiviteErp: "M, N",
		effectif: 4500,
		prochaineCommission: "2027-03-16",
		nombreDeSites: 1,
		deals: [
			{
				title: "Audit sécurité incendie",
				mission: "audit",
				min: 8,
				max: 18,
			},
			{
				title: "Préparation commission de sécurité 2027",
				mission: "commission-securite",
				min: 4,
				max: 9,
			},
		],
	},
	{
		name: "Clinique du Parc",
		domain: "clinique-du-parc.example",
		industry: "Santé",
		city: "Grenoble",
		country: "France",
		countryCode: "FR",
		phonePrefix: "4 76",
		titles: TITLES_SANTE,
		statut: "Prospect",
		typeEtablissement: "ERP",
		categorieErp: "3e catégorie (301 à 700)",
		typesActiviteErp: "U",
		effectif: 420,
		prochaineCommission: "2026-12-08",
		nombreDeSites: 1,
		deals: [
			{
				title: "AO gardiennage et SSIAP 2027",
				mission: "appel-offres",
				min: 90,
				max: 165,
			},
		],
	},
	{
		name: "Hôtel Le Belvédère",
		domain: "hotel-belvedere.example",
		industry: "Hôtellerie et restauration",
		city: "Bordeaux",
		country: "France",
		countryCode: "FR",
		phonePrefix: "5 56",
		titles: TITLES_ERP,
		statut: "Client",
		typeEtablissement: "ERP",
		categorieErp: "4e catégorie (300 et moins)",
		typesActiviteErp: "O, N",
		effectif: 180,
		prochaineCommission: "2027-05-11",
		nombreDeSites: 1,
		deals: [
			{
				title: "Mise en conformité désenfumage",
				mission: "conformite",
				min: 12,
				max: 35,
			},
			{
				title: "Accompagnement registre de sécurité",
				mission: "accompagnement",
				min: 2,
				max: 5,
			},
		],
	},
	{
		name: "Mairie de Saint-Aubin",
		domain: "mairie-saint-aubin.example",
		industry: "Collectivité territoriale",
		city: "Nantes",
		country: "France",
		countryCode: "FR",
		phonePrefix: "2 40",
		titles: TITLES_PUBLIC,
		statut: "Prospect",
		typeEtablissement: "ERP",
		categorieErp: "3e catégorie (301 à 700)",
		typesActiviteErp: "W, L",
		effectif: 550,
		prochaineCommission: "2027-01-19",
		nombreDeSites: 12,
		deals: [
			{
				title: "Audit du patrimoine ERP communal",
				mission: "audit",
				min: 15,
				max: 40,
			},
		],
	},
	{
		name: "Lycée Jean-Moulin",
		domain: "lycee-jean-moulin.example",
		industry: "Enseignement",
		city: "Lille",
		country: "France",
		countryCode: "FR",
		phonePrefix: "3 20",
		titles: TITLES_ENSEIGNEMENT,
		statut: "Client",
		typeEtablissement: "ERP",
		categorieErp: "2e catégorie (701 à 1 500)",
		typesActiviteErp: "R, N",
		effectif: 1200,
		prochaineCommission: "2026-11-24",
		nombreDeSites: 1,
		deals: [
			{
				title: "Préparation commission de sécurité périodique",
				mission: "commission-securite",
				min: 3,
				max: 7,
			},
			{
				title: "Accompagnement exercices d'évacuation",
				mission: "accompagnement",
				min: 2,
				max: 4,
			},
		],
	},
	{
		name: "Résidence seniors Les Tilleuls",
		domain: "residence-les-tilleuls.example",
		industry: "Résidences services seniors",
		city: "Nantes",
		country: "France",
		countryCode: "FR",
		phonePrefix: "2 51",
		titles: TITLES_SANTE,
		statut: "Prospect",
		typeEtablissement: "Habitation",
		categorieErp: null,
		typesActiviteErp: null,
		effectif: null,
		prochaineCommission: null,
		nombreDeSites: 2,
		deals: [
			{
				title: "Audit sécurité incendie des parties communes",
				mission: "audit",
				min: 4,
				max: 9,
			},
		],
	},
	{
		name: "Logistique Rhône Express",
		domain: "rhone-express-logistique.example",
		industry: "Transport et logistique",
		city: "Vénissieux",
		country: "France",
		countryCode: "FR",
		phonePrefix: "4 72",
		titles: TITLES_INDUSTRIE,
		statut: "Client",
		typeEtablissement: "ICPE",
		categorieErp: null,
		typesActiviteErp: null,
		effectif: null,
		prochaineCommission: null,
		nombreDeSites: 3,
		deals: [
			{
				title: "Mise en conformité entrepôt ICPE 1510",
				mission: "conformite",
				min: 20,
				max: 60,
			},
			{
				title: "Audit sécurité incendie plateforme de Corbas",
				mission: "audit",
				min: 6,
				max: 14,
			},
		],
	},
	{
		name: "Tour Horizon",
		domain: "tour-horizon.example",
		industry: "Immobilier tertiaire",
		city: "Courbevoie",
		country: "France",
		countryCode: "FR",
		phonePrefix: "1 47",
		titles: TITLES_IGH,
		statut: "Prospect",
		typeEtablissement: "IGH",
		categorieErp: null,
		typesActiviteErp: null,
		effectif: 2800,
		prochaineCommission: "2027-06-08",
		nombreDeSites: 1,
		deals: [
			{
				title: "AO sécurité incendie SSIAP 3 2027",
				mission: "appel-offres",
				min: 120,
				max: 180,
			},
		],
	},
	{
		name: "Groupe Sécurité Alpha",
		domain: "securite-alpha.example",
		industry: "Sécurité privée",
		city: "Marseille",
		country: "France",
		countryCode: "FR",
		phonePrefix: "4 91",
		titles: TITLES_SECURITE_PRIVEE,
		statut: "Partenaire",
		typeEtablissement: "Société de sécurité privée",
		categorieErp: null,
		typesActiviteErp: null,
		effectif: null,
		prochaineCommission: null,
		nombreDeSites: 4,
		deals: [
			{
				title: "Accompagnement réponse AO gardiennage",
				mission: "accompagnement",
				min: 5,
				max: 15,
			},
			{
				title: "Premier contact — partenariat SSIAP",
				mission: "contact",
				min: 2,
				max: 6,
			},
		],
	},
	{
		name: "Cinéma Le Grand Écran",
		domain: "grand-ecran-cinema.example",
		industry: "Culture et loisirs",
		city: "Bordeaux",
		country: "France",
		countryCode: "FR",
		phonePrefix: "5 57",
		titles: TITLES_ERP,
		statut: "Prospect",
		typeEtablissement: "ERP",
		categorieErp: "2e catégorie (701 à 1 500)",
		typesActiviteErp: "L",
		effectif: 1100,
		prochaineCommission: "2027-02-23",
		nombreDeSites: 1,
		deals: [
			{
				title: "Préparation commission de sécurité 2027",
				mission: "commission-securite",
				min: 3,
				max: 8,
			},
		],
	},
	{
		name: "Musée des Beaux-Arts de Saint-Aubin",
		domain: "musee-saint-aubin.example",
		industry: "Culture et patrimoine",
		city: "Paris",
		country: "France",
		countryCode: "FR",
		phonePrefix: "1 42",
		titles: TITLES_PUBLIC,
		statut: "Ancien client",
		typeEtablissement: "ERP",
		categorieErp: "3e catégorie (301 à 700)",
		typesActiviteErp: "Y, T",
		effectif: 400,
		prochaineCommission: "2027-09-14",
		nombreDeSites: 1,
		deals: [
			{
				title: "Audit sécurité incendie et plan de sauvegarde des œuvres",
				mission: "audit",
				min: 7,
				max: 16,
			},
			{
				title: "Mise en conformité SSI catégorie A",
				mission: "conformite",
				min: 25,
				max: 70,
			},
		],
	},
	{
		name: "Salle de spectacle L'Odyssée",
		domain: "salle-odyssee.example",
		industry: "Spectacle vivant",
		city: "Marseille",
		country: "France",
		countryCode: "FR",
		phonePrefix: "4 91",
		titles: TITLES_ERP,
		statut: "Client",
		typeEtablissement: "ERP",
		categorieErp: "1re catégorie (plus de 1 500 personnes)",
		typesActiviteErp: "L, N",
		effectif: 2200,
		prochaineCommission: "2026-12-15",
		nombreDeSites: 1,
		deals: [
			{
				title: "Accompagnement commission de sécurité avant réouverture",
				mission: "commission-securite",
				min: 6,
				max: 14,
			},
		],
	},
	{
		name: "Centre hospitalier de Valmont",
		domain: "ch-valmont.example",
		industry: "Santé",
		city: "Lille",
		country: "France",
		countryCode: "FR",
		phonePrefix: "3 28",
		titles: TITLES_SANTE,
		statut: "Client",
		typeEtablissement: "Santé / médico-social",
		categorieErp: null,
		typesActiviteErp: null,
		effectif: null,
		prochaineCommission: "2027-04-13",
		nombreDeSites: 5,
		deals: [
			{
				title: "AO sécurité incendie et sûreté 2027",
				mission: "appel-offres",
				min: 110,
				max: 180,
			},
			{
				title: "Formation SSIAP 1 — équipe de nuit",
				mission: "accompagnement",
				min: 3,
				max: 8,
			},
		],
	},
	{
		name: "Université de Valmont",
		domain: "univ-valmont.example",
		industry: "Enseignement supérieur",
		city: "Grenoble",
		country: "France",
		countryCode: "FR",
		phonePrefix: "4 76",
		titles: TITLES_ENSEIGNEMENT,
		statut: "Prospect",
		typeEtablissement: "ERP + IGH",
		categorieErp: "1re catégorie (plus de 1 500 personnes)",
		typesActiviteErp: "R, S, N",
		effectif: 6000,
		prochaineCommission: "2027-10-05",
		nombreDeSites: 7,
		deals: [
			{
				title: "Audit du parc ERP universitaire",
				mission: "audit",
				min: 30,
				max: 80,
			},
		],
	},
	{
		name: "Entrepôt Nord Distribution",
		domain: "nord-distribution.example",
		industry: "Logistique et distribution",
		city: "Lesquin",
		country: "France",
		countryCode: "FR",
		phonePrefix: "3 20",
		titles: TITLES_INDUSTRIE,
		statut: "Ancien client",
		typeEtablissement: "Industrie / logistique",
		categorieErp: null,
		typesActiviteErp: null,
		effectif: null,
		prochaineCommission: null,
		nombreDeSites: 2,
		deals: [
			{
				title: "Mise en conformité désenfumage et RIA",
				mission: "conformite",
				min: 15,
				max: 45,
			},
			{
				title: "AO gardiennage et sécurité incendie 2027",
				mission: "appel-offres",
				min: 60,
				max: 140,
			},
		],
	},
];

const FIRST_NAMES = [
	"Antoine",
	"Camille",
	"Céline",
	"David",
	"Élodie",
	"François",
	"Hélène",
	"Isabelle",
	"Jérôme",
	"Karim",
	"Laurence",
	"Mathieu",
	"Nathalie",
	"Olivier",
	"Pauline",
	"Rachid",
	"Sandrine",
	"Sébastien",
	"Sophie",
	"Thierry",
	"Valérie",
	"Yann",
	"Amélie",
	"Jean-Pierre",
] as const;

const LAST_NAMES = [
	"Dubois",
	"Moreau",
	"Laurent",
	"Simon",
	"Michel",
	"Lefebvre",
	"Leroy",
	"Roux",
	"David",
	"Bertrand",
	"Morel",
	"Fournier",
	"Girard",
	"Bonnet",
	"Dupont",
	"Lambert",
	"Fontaine",
	"Rousseau",
	"Benali",
	"Mercier",
] as const;

const OPEN_STAGES = [
	DealStage.PROSPECT,
	DealStage.QUALIFICATION,
	DealStage.NEEDS_ANALYSIS,
	DealStage.QUOTE_SENT,
	DealStage.NEGOTIATION,
] as const;

const CLOSED_STAGES = [
	DealStage.CLOSED_WON,
	DealStage.CLOSED_LOST,
	DealStage.NOT_QUALIFIED,
] as const;

const DEAL_DESCRIPTIONS: Record<Mission, readonly string[]> = {
	audit: [
		"Audit complet du site avant la prochaine visite périodique : SSI, désenfumage, dégagements, registre de sécurité. Le directeur de site décide, les services généraux suivent.",
		"Le dernier rapport de vérification signale plusieurs non-conformités. Le client veut un état des lieux indépendant et un plan d'actions chiffré.",
	],
	"appel-offres": [
		"Consultation pour le gardiennage et la sécurité incendie (SSIAP 1 et 2, rondes, PC sécurité). DCE reçu, réponse en cours avec un partenaire de sécurité privée.",
		"Renouvellement du marché de sécurité incendie arrivant à échéance. Critères : prix 40 %, valeur technique 60 %. Visite de site obligatoire.",
	],
	"commission-securite": [
		"Préparation de la visite de la commission de sécurité : relecture du registre, levée des prescriptions précédentes, présence le jour J.",
		"Avis défavorable lors de la dernière commission. Objectif : lever les prescriptions et obtenir un avis favorable à la contre-visite.",
	],
	accompagnement: [
		"Accompagnement du responsable sécurité sur la tenue du registre, les consignes et les exercices d'évacuation.",
		"Mission d'assistance ponctuelle : mise à jour des plans d'intervention et formation des équipes au poste de sécurité.",
	],
	conformite: [
		"Mise en conformité suite au rapport du bureau de contrôle : désenfumage, compartimentage et signalisation. Travaux à planifier hors période d'ouverture.",
		"Remise à niveau du SSI et des moyens de secours. Le budget dépend du vote en conseil d'administration.",
	],
	contact: [
		"Premier échange après une recommandation. Besoin à qualifier lors d'une visite de site.",
	],
};

const LOST_REASONS = [
	"Prix trop élevé",
	"Concurrent moins-disant",
	"Projet reporté à l'année prochaine",
	"Budget non voté",
	"Marché attribué au prestataire sortant",
	"Pas de besoin réglementaire identifié",
] as const;

const NOTE_BODIES = [
	"Visite de site effectuée. Registre de sécurité incomplet, dernières vérifications SSI à relancer auprès du mainteneur.",
	"L'acheteur demande un devis détaillé par lot avant fin de mois.",
	"Le directeur de site est convaincu, mais la décision passe par le siège.",
	"Deux autres cabinets consultés. Notre avantage : la présence le jour de la commission.",
	"Prescriptions de la dernière commission transmises. Trois points bloquants sur le désenfumage.",
	"Décision reportée après le vote du budget en conseil municipal.",
	"DCE téléchargé. Visite obligatoire prévue, questions à poser avant la date limite.",
] as const;

const CALL_SUBJECTS = [
	"Appel de découverte",
	"Relance devis",
	"Questions acheteur sur le DCE",
	"Point sur les prescriptions",
	"Échange avec le mainteneur SSI",
] as const;

const TASK_SUBJECTS = [
	"Envoyer le devis",
	"Relancer le devis",
	"Planifier la visite de site",
	"Préparer le dossier de commission",
	"Poser les questions acheteur avant la date limite",
	"Envoyer le rapport d'audit",
	"Mettre à jour le registre de sécurité",
] as const;

const MEETING_SUBJECTS = [
	"Visite de site",
	"Réunion de préparation commission",
	"Restitution de l'audit",
	"Visite obligatoire AO",
	"Point d'avancement trimestriel",
] as const;

const EMAIL_SUBJECTS = [
	"Re : prochaines étapes",
	"Suite à notre visite de site",
	"Devis et conditions",
	"Réception du DCE",
	"Compte rendu de la commission de sécurité",
] as const;

type Transliterations = Record<string, string>;

const TRANSLITERATIONS: Transliterations = {
	ø: "o",
	æ: "ae",
	œ: "oe",
	å: "a",
	ß: "ss",
	đ: "d",
	ł: "l",
	þ: "th",
};

function slug(value: string): string {
	return value
		.toLowerCase()
		.replace(/[øæœåßđłþ]/g, (char) => TRANSLITERATIONS[char] ?? char)
		.normalize("NFD")
		.replace(/\p{Mn}/gu, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

async function seedOwners(): Promise<string[]> {
	const existing = await db.user.findMany({ select: { id: true } });

	if (existing.length > 0) {
		console.log(
			`${existing.length} utilisateur(s) existant(s) utilisé(s) comme responsables.`,
		);
		return existing.map((user) => user.id);
	}

	console.log("Aucun utilisateur — création de commerciaux de démonstration.");
	const created = await Promise.all(
		OWNERS.map((owner) =>
			db.user.upsert({
				where: { email: owner.email },
				create: {
					id: `seed-${slug(owner.name)}`,
					name: owner.name,
					email: owner.email,
					emailVerified: true,
					updatedAt: new Date(),
				},
				update: {},
				select: { id: true },
			}),
		),
	);

	return created.map((user) => user.id);
}

type SeededCompany = {
	id: string;
	name: string;
	domain: string;
	seed: SeedCompany;
};

async function seedCompanies(ownerIds: string[]): Promise<SeededCompany[]> {
	const companies = [];

	for (const company of COMPANIES) {
		const row = await db.company.upsert({
			where: { domain: company.domain },
			create: {
				name: company.name,
				domain: company.domain,
				website: `https://${company.domain}`,
				industry: company.industry,
				city: company.city,
				country: company.country,
				countryCode: company.countryCode,
				phone: frenchPhone(company.phonePrefix),
				ownerId: pick(ownerIds),
				createdAt: daysFromNow(-integer(30, 400), 12),
			},
			update: {},
			select: { id: true, name: true, domain: true, iconUrl: true },
		});
		companies.push({
			...row,
			domain: row.domain ?? company.domain,
			seed: company,
		});
	}

	await seedIcons(companies);

	return companies.map(({ iconUrl: _, ...company }) => company);
}

async function seedIcons(
	companies: { id: string; domain: string | null; iconUrl: string | null }[],
): Promise<void> {
	const missing = companies.filter(
		(company) => company.iconUrl === null && company.domain,
	);
	if (missing.length === 0) return;

	let resolved = 0;
	for (const company of missing) {
		const source = await resolveFavicon(company.domain);
		if (!source) continue;

		const iconUrl =
			(await mirror(source, `companies/${company.id}/icon`)) ?? source;

		await db.company.updateMany({
			where: { id: company.id, iconUrl: null },
			data: { iconUrl },
		});
		resolved += 1;
	}

	console.log(
		`${resolved} icône(s) de société résolue(s) sur ${missing.length}.`,
	);
}

type SeededField = {
	id: string;
	key: string;
	options: { id: string; label: string }[];
};

type SeededFieldSet = {
	statutCommercial: SeededField;
	typeEtablissement: SeededField;
	categorieErp: SeededField;
	typesActiviteErp: SeededField;
	effectifAccueilli: SeededField;
	prochaineCommission: SeededField;
	siret: SeededField;
	nombreDeSites: SeededField;
};

type SeededDealFieldSet = {
	typeDeMission: SeededField;
	typeEtablissement: SeededField;
	echeanceCommission: SeededField;
	referenceAo: SeededField;
	dateLimiteOffres: SeededField;
};

async function upsertField(
	entity: FieldEntity,
	label: string,
	type: FieldType,
	position: number,
	options: readonly string[] = [],
	agentFilled: boolean = type !== "USER" && type !== "NUMBER",
): Promise<SeededField> {
	const key = fieldKeyFromLabel(label);
	const definition = await db.fieldDefinition.upsert({
		where: { entity_key: { entity, key } },
		create: {
			entity,
			key,
			label,
			type,
			showOnTable: false,
			showOnFilter: false,
			agentFilled,
			position,
			options: {
				create: options.map((optionLabel, index) => ({
					label: optionLabel,
					position: index,
				})),
			},
		},
		update: {},
		include: { options: true },
	});

	const missing = options.filter(
		(optionLabel) =>
			!definition.options.some((option) => option.label === optionLabel),
	);
	if (missing.length === 0) {
		return {
			id: definition.id,
			key: definition.key,
			options: definition.options,
		};
	}

	await db.fieldOption.createMany({
		data: missing.map((optionLabel, index) => ({
			fieldId: definition.id,
			label: optionLabel,
			position: definition.options.length + index,
		})),
	});

	return {
		id: definition.id,
		key: definition.key,
		options: await db.fieldOption.findMany({
			where: { fieldId: definition.id },
			select: { id: true, label: true },
		}),
	};
}

const INTAKE_BRIEF =
	"Lis le bloc [GSMS_INTAKE] dans la description du deal ou dans la note d'activité créée à sa réception. Chaque ligne est au format clé: valeur — reprends la valeur de la clé correspondante.";

const DATE_LIMITE_BRIEF =
	"Pour un appel d'offres : date et heure limites de remise des offres indiquées dans le règlement de consultation (RC).";

async function seedDealFields(): Promise<SeededDealFieldSet> {
	const [
		typeDeMission,
		typeEtablissement,
		echeanceCommission,
		referenceAo,
		dateLimiteOffres,
	] = await Promise.all([
		upsertField("DEAL", "Type de mission", FieldType.SELECT, 0, MISSION_TYPES),
		upsertField(
			"DEAL",
			"Type d'établissement",
			FieldType.SELECT,
			1,
			ETABLISSEMENT_TYPES,
		),
		upsertField("DEAL", "Échéance commission", FieldType.DATE, 2),
		upsertField("DEAL", "Référence AO", FieldType.TEXT, 3),
		upsertField("DEAL", "Date limite de remise des offres", FieldType.DATE, 4),
	]);

	await db.fieldDefinition.updateMany({
		where: {
			entity: "DEAL",
			key: {
				in: [
					typeDeMission.key,
					typeEtablissement.key,
					echeanceCommission.key,
					referenceAo.key,
				],
			},
		},
		data: { agentBrief: INTAKE_BRIEF },
	});

	await db.fieldDefinition.updateMany({
		where: { entity: "DEAL", key: dateLimiteOffres.key, agentBrief: null },
		data: { agentBrief: DATE_LIMITE_BRIEF },
	});

	return {
		typeDeMission,
		typeEtablissement,
		echeanceCommission,
		referenceAo,
		dateLimiteOffres,
	};
}

async function seedCompanyFields(): Promise<SeededFieldSet> {
	const [
		statutCommercial,
		typeEtablissement,
		categorieErp,
		typesActiviteErp,
		effectifAccueilli,
		prochaineCommission,
		siret,
		nombreDeSites,
	] = await Promise.all([
		upsertField(
			"COMPANY",
			"Statut commercial",
			FieldType.SELECT,
			0,
			STATUTS_COMMERCIAUX,
			false,
		),
		upsertField(
			"COMPANY",
			"Type d'établissement",
			FieldType.SELECT,
			1,
			TYPES_ETABLISSEMENT,
		),
		upsertField(
			"COMPANY",
			"Catégorie ERP",
			FieldType.SELECT,
			2,
			CATEGORIES_ERP,
		),
		upsertField("COMPANY", "Types d'activité ERP", FieldType.TEXT, 3),
		upsertField("COMPANY", "Effectif accueilli", FieldType.NUMBER, 4),
		upsertField(
			"COMPANY",
			"Prochaine commission de sécurité",
			FieldType.DATE,
			5,
			[],
			false,
		),
		upsertField("COMPANY", "SIRET", FieldType.TEXT, 6),
		upsertField("COMPANY", "Nombre de sites", FieldType.NUMBER, 7),
	]);

	return {
		statutCommercial,
		typeEtablissement,
		categorieErp,
		typesActiviteErp,
		effectifAccueilli,
		prochaineCommission,
		siret,
		nombreDeSites,
	};
}

function optionIdFor(field: SeededField, label: string): string {
	const option = field.options.find((entry) => entry.label === label);
	if (!option)
		throw new Error(`Le champ "${field.key}" n'a pas d'option "${label}".`);
	return option.id;
}

type FieldValueData = {
	text?: string;
	number?: number;
	date?: Date;
	optionId?: string;
};

async function upsertCompanyValue(
	field: SeededField,
	companyId: string,
	data: FieldValueData,
): Promise<void> {
	await db.fieldValue.upsert({
		where: { fieldId_companyId: { fieldId: field.id, companyId } },
		create: { fieldId: field.id, companyId, ...data },
		update: {},
	});
}

async function upsertDealValue(
	field: SeededField,
	dealId: string,
	data: FieldValueData,
): Promise<void> {
	await db.fieldValue.upsert({
		where: { fieldId_dealId: { fieldId: field.id, dealId } },
		create: { fieldId: field.id, dealId, ...data },
		update: {},
	});
}

function commissionDate(value: string): Date {
	return new Date(`${value}T09:00:00.000Z`);
}

async function seedCompanyFieldValues(
	fields: SeededFieldSet,
	companies: SeededCompany[],
): Promise<void> {
	for (const company of companies) {
		const seed = company.seed;
		const isErp =
			seed.typeEtablissement === "ERP" ||
			seed.typeEtablissement === "ERP + IGH";
		const writes: Promise<void>[] = [
			upsertCompanyValue(fields.statutCommercial, company.id, {
				optionId: optionIdFor(fields.statutCommercial, seed.statut),
			}),
			upsertCompanyValue(fields.typeEtablissement, company.id, {
				optionId: optionIdFor(fields.typeEtablissement, seed.typeEtablissement),
			}),
			upsertCompanyValue(fields.siret, company.id, {
				text: `${integer(3, 9)}${digits(13)}`,
			}),
			upsertCompanyValue(fields.nombreDeSites, company.id, {
				number: seed.nombreDeSites,
			}),
		];

		if (isErp && seed.categorieErp) {
			writes.push(
				upsertCompanyValue(fields.categorieErp, company.id, {
					optionId: optionIdFor(fields.categorieErp, seed.categorieErp),
				}),
			);
		}
		if (isErp && seed.typesActiviteErp) {
			writes.push(
				upsertCompanyValue(fields.typesActiviteErp, company.id, {
					text: seed.typesActiviteErp,
				}),
			);
		}
		if (seed.effectif !== null) {
			writes.push(
				upsertCompanyValue(fields.effectifAccueilli, company.id, {
					number: seed.effectif,
				}),
			);
		}
		if (seed.prochaineCommission) {
			writes.push(
				upsertCompanyValue(fields.prochaineCommission, company.id, {
					date: commissionDate(seed.prochaineCommission),
				}),
			);
		}

		await Promise.all(writes);
	}
}

type SeededContact = { id: string; companyId: string };

async function seedContacts(
	companies: SeededCompany[],
	ownerIds: string[],
): Promise<SeededContact[]> {
	const contacts: SeededContact[] = [];
	const used = new Set<string>();

	for (const company of companies) {
		for (let index = 0; index < integer(2, 4); index++) {
			const firstName = pick(FIRST_NAMES);
			const lastName = pick(LAST_NAMES);
			const email = `${slug(firstName)}.${slug(lastName)}@${company.domain}`;
			if (used.has(email)) continue;
			used.add(email);

			const contact = await db.contact.upsert({
				where: { email },
				create: {
					firstName,
					lastName,
					email,
					title: pick(company.seed.titles),
					phone: chance(0.6)
						? frenchPhone(
								chance(0.5) ? pick(["6", "7"]) : company.seed.phonePrefix,
							)
						: null,
					companyId: company.id,
					ownerId: pick(ownerIds),
					createdAt: daysFromNow(-integer(10, 300), 12),
				},
				update: {},
				select: { id: true },
			});

			contacts.push({ id: contact.id, companyId: company.id });
		}
	}

	for (const company of companies) {
		const first = contacts.find((contact) => contact.companyId === company.id);
		if (!first) continue;
		await db.company.update({
			where: { id: company.id },
			data: { primaryContactId: first.id },
		});
	}

	return contacts;
}

type SeededDeal = {
	id: string;
	companyId: string;
	ownerId: string;
	stage: DealStage;
	closed: boolean;
	mission: Mission;
	etablissement: DealEtablissement;
	commission: Date | null;
	referenceAo: string | null;
	dateLimiteOffres: Date | null;
};

type SeedRates = Record<string, number>;

const DEAL_CURRENCY = "EUR";

const SEED_RATES: SeedRates = {
	USD: 0.92,
	GBP: 1.17,
	CHF: 1.06,
	CAD: 0.67,
	JPY: 0.0061,
};

let seedBase = DEFAULT_REPORTING_CURRENCY;

async function seedRates(): Promise<number> {
	const asOf = daysFromNow(-1);

	await db.appSetting.upsert({
		where: { id: SETTINGS_ID },
		create: {
			id: SETTINGS_ID,
			reportingCurrency: DEFAULT_REPORTING_CURRENCY,
		},
		update: {},
		select: { id: true },
	});

	seedBase = await readReportingCurrency(db);

	if (seedBase !== DEAL_CURRENCY) {
		console.log(
			`La devise de reporting est ${seedBase} — les montants en ${DEAL_CURRENCY} ` +
				"sont laissés à convertir par la tâche de mise à jour des taux.",
		);
	}

	for (const [quoteCurrency, rate] of Object.entries(SEED_RATES)) {
		await db.exchangeRate.upsert({
			where: {
				baseCurrency_quoteCurrency_source: {
					baseCurrency: DEAL_CURRENCY,
					quoteCurrency,
					source: RateSource.FETCHED,
				},
			},
			create: {
				baseCurrency: DEAL_CURRENCY,
				quoteCurrency,
				rate,
				asOf,
				source: RateSource.FETCHED,
				provider: "seed",
			},
			update: { rate, asOf, provider: "seed" },
		});
	}

	return Object.keys(SEED_RATES).length;
}

function money(eurAmount: number) {
	const amount = Number(eurAmount.toFixed(2));
	const converted = seedBase === DEAL_CURRENCY;

	return {
		amount,
		currency: DEAL_CURRENCY,
		baseAmount: converted ? amount : null,
		baseCurrency: converted ? seedBase : null,
		fxRate: converted ? 1 : null,
	};
}

let aoCounter = 0;

async function seedDeals(
	companies: SeededCompany[],
	contacts: SeededContact[],
	ownerIds: string[],
): Promise<SeededDeal[]> {
	const deals: SeededDeal[] = [];

	for (const company of companies) {
		for (const [n, template] of company.seed.deals.entries()) {
			const id = `seed-deal-${slug(company.name)}-${n}`;
			const closed = chance(0.35);
			const stage = closed ? pick(CLOSED_STAGES) : pick(OPEN_STAGES);
			const ownerId = pick(ownerIds);
			const createdDaysAgo = integer(20, 210);
			const createdAt = daysFromNow(-createdDaysAgo, 12);
			const closedDaysAgo = closed
				? integer(0, Math.max(createdDaysAgo - 14, 0))
				: null;
			const stageChangedAt = daysFromNow(
				closedDaysAgo === null ? -integer(1, 20) : -closedDaysAgo,
				12,
			);
			const isAo = template.mission === "appel-offres";

			await db.deal.upsert({
				where: { id },
				create: {
					id,
					name: `${template.title} — ${company.name}`,
					description: pick(DEAL_DESCRIPTIONS[template.mission]),
					companyId: company.id,
					ownerId,
					stage,
					stageChangedAt,
					...(() => {
						const { amount, currency, baseAmount, baseCurrency, fxRate } =
							money(integer(template.min * 2, template.max * 2) * 500);
						return {
							amount,
							currency,
							baseAmount,
							baseCurrency,
							fxRate,
							fxRateAt: fxRate === null ? null : daysFromNow(-1),
						};
					})(),
					expectedCloseDate: daysFromNow(
						closedDaysAgo === null
							? integer(-10, 75)
							: -closedDaysAgo + integer(-4, 9),
					),
					closedAt: closed ? stageChangedAt : null,
					closedReason:
						stage === DealStage.CLOSED_LOST || stage === DealStage.NOT_QUALIFIED
							? pick(LOST_REASONS)
							: null,
					createdAt,
				},
				update: {},
			});

			const companyContacts = contacts.filter(
				(contact) => contact.companyId === company.id,
			);
			for (const contact of companyContacts.slice(0, integer(1, 2))) {
				await db.dealContact.upsert({
					where: { dealId_contactId: { dealId: id, contactId: contact.id } },
					create: {
						dealId: id,
						contactId: contact.id,
						role: chance(0.5) ? "Prescripteur" : "Décideur",
					},
					update: {},
				});
			}

			if (isAo) aoCounter += 1;

			deals.push({
				id,
				companyId: company.id,
				ownerId,
				stage,
				closed,
				mission: template.mission,
				etablissement: DEAL_ETABLISSEMENT[company.seed.typeEtablissement],
				commission:
					(template.mission === "commission-securite" ||
						template.mission === "audit") &&
					company.seed.prochaineCommission
						? commissionDate(company.seed.prochaineCommission)
						: null,
				referenceAo: isAo
					? `AO-2026-${String(aoCounter * 7 + 35).padStart(4, "0")}`
					: null,
				dateLimiteOffres: isAo
					? closed
						? daysFromNow(-integer(20, 90), 4)
						: daysFromNow(integer(10, 45), 4)
					: null,
			});
		}
	}

	return deals;
}

async function seedDealFieldValues(
	fields: SeededDealFieldSet,
	deals: SeededDeal[],
): Promise<void> {
	for (const deal of deals) {
		const writes: Promise<void>[] = [
			upsertDealValue(fields.typeDeMission, deal.id, {
				optionId: optionIdFor(fields.typeDeMission, deal.mission),
			}),
			upsertDealValue(fields.typeEtablissement, deal.id, {
				optionId: optionIdFor(fields.typeEtablissement, deal.etablissement),
			}),
		];

		if (deal.commission) {
			writes.push(
				upsertDealValue(fields.echeanceCommission, deal.id, {
					date: deal.commission,
				}),
			);
		}
		if (deal.referenceAo) {
			writes.push(
				upsertDealValue(fields.referenceAo, deal.id, {
					text: deal.referenceAo,
				}),
			);
		}
		if (deal.dateLimiteOffres) {
			writes.push(
				upsertDealValue(fields.dateLimiteOffres, deal.id, {
					date: deal.dateLimiteOffres,
				}),
			);
		}

		await Promise.all(writes);
	}
}

async function seedActivities(
	companies: { id: string }[],
	contacts: SeededContact[],
	deals: SeededDeal[],
	ownerIds: string[],
): Promise<number> {
	const existing = await db.activity.count();
	if (existing > 0) {
		console.log(`Activités déjà présentes (${existing}) — ignorées.`);
		return existing;
	}

	type ActivityRow = {
		type: ActivityType;
		subject: string | null;
		body: string | null;
		occurredAt: Date | null;
		dueAt: Date | null;
		completedAt: Date | null;
		companyId: string | null;
		contactId: string | null;
		dealId: string | null;
		createdById: string;
		createdAt: Date;
		meta?: { from: DealStage; to: DealStage };
	};

	const rows: ActivityRow[] = [];

	const base = (companyId: string, createdById: string, createdAt: Date) => ({
		companyId,
		contactId: null,
		dealId: null,
		occurredAt: null,
		dueAt: null,
		completedAt: null,
		subject: null,
		body: null,
		createdById,
		createdAt,
	});

	for (const deal of deals) {
		const dealContacts = contacts.filter((c) => c.companyId === deal.companyId);

		for (let n = 0; n < integer(3, 6); n++) {
			const at = daysFromNow(-integer(2, 120), 18);
			const type = pick([
				ActivityType.NOTE,
				ActivityType.CALL,
				ActivityType.EMAIL,
				ActivityType.MEETING,
			]);

			rows.push({
				...base(deal.companyId, deal.ownerId, at),
				type,
				dealId: deal.id,
				contactId: dealContacts.length > 0 ? pick(dealContacts).id : null,
				subject:
					type === ActivityType.CALL
						? pick(CALL_SUBJECTS)
						: type === ActivityType.MEETING
							? pick(MEETING_SUBJECTS)
							: type === ActivityType.EMAIL
								? pick(EMAIL_SUBJECTS)
								: null,
				body: type === ActivityType.NOTE ? pick(NOTE_BODIES) : null,
				occurredAt: type === ActivityType.NOTE ? null : at,
			});
		}

		rows.push({
			...base(deal.companyId, deal.ownerId, daysFromNow(-integer(1, 20), 12)),
			type: ActivityType.STAGE_CHANGE,
			dealId: deal.id,
			subject: "Étape modifiée",
			meta: {
				from: DealStage.PROSPECT,
				to:
					deal.stage === DealStage.PROSPECT
						? DealStage.QUALIFICATION
						: deal.stage,
			},
		});
	}

	for (const deal of deals) {
		if (deal.closed) continue;

		for (let n = 0; n < integer(1, 3); n++) {
			const roll = random();
			const overdue = roll < 0.3;
			const done = roll >= 0.3 && roll < 0.6;
			const dueAt = overdue
				? daysFromNow(-integer(1, 14), 6)
				: daysFromNow(integer(1, 21), 6);

			rows.push({
				...base(deal.companyId, deal.ownerId, daysFromNow(-integer(1, 30), 12)),
				type: ActivityType.TASK,
				dealId: deal.id,
				subject: pick(TASK_SUBJECTS),
				dueAt: done ? daysFromNow(-integer(1, 20), 6) : dueAt,
				completedAt: done ? daysFromNow(-integer(1, 10), 6) : null,
			});
		}
	}

	for (const company of companies) {
		if (!chance(0.6)) continue;
		rows.push({
			...base(company.id, pick(ownerIds), daysFromNow(-integer(5, 200), 12)),
			type: ActivityType.NOTE,
			body: pick(NOTE_BODIES),
		});
	}

	await db.activity.createMany({ data: rows });
	return rows.length;
}

async function main() {
	const rates = await seedRates();
	const ownerIds = await seedOwners();
	const companies = await seedCompanies(ownerIds);
	const contacts = await seedContacts(companies, ownerIds);
	const deals = await seedDeals(companies, contacts, ownerIds);
	const activities = await seedActivities(companies, contacts, deals, ownerIds);
	const companyFields = await seedCompanyFields();
	await seedCompanyFieldValues(companyFields, companies);
	const dealFields = await seedDealFields();
	await seedDealFieldValues(dealFields, deals);

	console.log(
		`${companies.length} sociétés, ${contacts.length} contacts, ` +
			`${deals.length} affaires, ${activities} activités, ${rates} taux de change, ` +
			"8 champs société et 5 champs affaire créés.",
	);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
