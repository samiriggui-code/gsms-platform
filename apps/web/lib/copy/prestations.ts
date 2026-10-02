/**
 * Fiches prestations (missions et secteurs) de la vitrine publique.
 * Portées depuis apps/crm/apps/app/components/landing/gsms-prestations.ts.
 */
import type { GsmsIconName } from "@/components/landing/gsms-icon";

export type PrestationKind = "mission" | "secteur";

export type PrestationReference = {
  label: string;
  url: string;
  paid?: boolean;
};

export type Prestation = {
  slug: string;
  kind: PrestationKind;
  icon: GsmsIconName;
  eyebrow: string;
  title: string;
  accent: string;
  lede: string;
  intro: string;
  includes: { title: string; body: string }[];
  audience: string[];
  deliverables: string[];
  references: PrestationReference[];
  ctaType: "audit" | "ao";
  ctaLabel: string;
  etablissement?: string;
};

const LEGIFRANCE = {
  arrete1980: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000020303557",
  cchR12351:
    "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039040918",
  ccdsaDecret95260:
    "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000185756",
  arreteIgh2011: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000025167121",
  icpe1510: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000034429274",
  livreVICsi:
    "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000025503132/LEGISCTA000025506179/",
  arreteSsiap2005:
    "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000448223",
} as const;

const AFNOR_NF_S61_931 =
  "https://m.boutique.afnor.org/fr-fr/norme/nf-s61931/systemes-de-securite-incendie-ssi-dispositions-generales/fa181989/42838";

export const PRESTATIONS: Prestation[] = [
  {
    slug: "audit-securite",
    kind: "mission",
    icon: "audit",
    eyebrow: "Mission",
    title: "Audit de sécurité.",
    accent: "Savoir où vous en êtes.",
    lede: "Un état des lieux complet de votre établissement, au regard du règlement de sécurité qui s'applique à son type et à sa catégorie.",
    intro:
      "L'audit part de votre classement réel : type d'exploitation, catégorie selon l'effectif reçu, groupe 1 ou 2. C'est ce classement qui fixe les exigences applicables — pas l'inverse. Nous relevons les écarts entre ce classement et l'état constaté sur site, puis nous les priorisons selon leur gravité.",
    includes: [
      {
        title: "Vérification du classement",
        body: "Type d'exploitation et catégorie déclarés, cohérence avec l'effectif réellement admissible et l'activité constatée.",
      },
      {
        title: "Contrôle des dispositifs",
        body: "Dégagements et issues de secours, désenfumage, SSI, éclairage de sécurité, moyens de secours, au regard des articles applicables au type de l'établissement.",
      },
      {
        title: "Revue du registre de sécurité",
        body: "Présence des attestations de vérification, des consignes, des dates d'exercices — ce qu'exige l'article R.123-51 du Code de la construction et de l'habitation.",
      },
      {
        title: "Rapport d'audit détaillé",
        body: "Chaque écart est rattaché à l'article ou à la disposition qui le justifie, pas à une appréciation générale.",
      },
    ],
    audience: [
      "Établissements recevant du public",
      "Sites tertiaires et industriels",
      "Structures d'accueil spécialisé",
    ],
    deliverables: [
      "Rapport d'audit référencé",
      "Plan d'actions priorisé",
      "Restitution avec l'équipe",
    ],
    references: [
      {
        label: "Arrêté du 25 juin 1980 (règlement de sécurité ERP)",
        url: LEGIFRANCE.arrete1980,
      },
      {
        label: "Code de la construction et de l'habitation, art. R.123-51",
        url: LEGIFRANCE.cchR12351,
      },
    ],
    ctaType: "audit",
    ctaLabel: "Demander un audit",
  },
  {
    slug: "commission-securite",
    kind: "mission",
    icon: "commission",
    eyebrow: "Mission",
    title: "Commission de sécurité.",
    accent: "Ne pas la passer seul.",
    lede: "Un accompagnement complet pour préparer le passage devant la commission consultative départementale de sécurité et d'accessibilité (CCDSA).",
    intro:
      "La commission n'est saisie que par le maire ou le préfet, jamais par l'exploitant. Elle réunit un représentant du SDIS, un représentant de la mairie et, pour l'accessibilité, la DDT. Son avis n'est que consultatif : la décision d'ouverture ou de poursuite d'exploitation appartient au maire. Nous préparons le dossier et le passage, pas l'avis lui-même.",
    includes: [
      {
        title: "Constitution du dossier",
        body: "Registre de sécurité, attestations de vérification réglementaire, plans, rapports de contrôle des organismes agréés.",
      },
      {
        title: "Vérification avant passage",
        body: "Ce que la commission examine concrètement : dégagements, SSI, formation du personnel, exercices d'évacuation.",
      },
      {
        title: "Préconisations correctives",
        body: "Chaque écart repris avec une action et un délai, avant la date de visite.",
      },
      {
        title: "Présence le jour du passage",
        body: "Nous accompagnons l'exploitant devant la commission, puis assurons le suivi des prescriptions.",
      },
    ],
    audience: [
      "Établissements recevant du public",
      "Établissements de santé",
      "Écoles et structures d'accueil",
    ],
    deliverables: [
      "Dossier réglementaire constitué",
      "Liste des points corrigés",
      "Suivi post-commission",
    ],
    references: [
      {
        label: "Décret n°95-260 du 8 mars 1995 (CCDSA)",
        url: LEGIFRANCE.ccdsaDecret95260,
      },
      {
        label: "Code de la construction et de l'habitation, art. R.123-51",
        url: LEGIFRANCE.cchR12351,
      },
    ],
    ctaType: "audit",
    ctaLabel: "Préparer ma commission",
  },
  {
    slug: "prevention-incendie",
    kind: "mission",
    icon: "fire",
    eyebrow: "Mission",
    title: "Prévention incendie.",
    accent: "Avant que ça compte.",
    lede: "Un système de sécurité incendie (SSI) dimensionné à votre établissement, pas un système par défaut.",
    intro:
      "La norme NF S 61-931 classe les SSI de la catégorie A, la plus complète — hôpitaux, centres commerciaux, IGH — à la catégorie E, la plus simple. Le bon niveau dépend du type d'exploitation et de l'effectif, pas d'un choix commercial. Un SSI surdimensionné coûte inutilement ; un SSI sous-dimensionné est un écart relevé en commission.",
    includes: [
      {
        title: "Analyse du risque incendie",
        body: "Activité, matières présentes, compartimentage existant, capacité d'évacuation réelle.",
      },
      {
        title: "Adéquation du SSI",
        body: "Catégorie A à E selon la norme NF S 61-931, cohérence avec le type et la catégorie de l'établissement.",
      },
      {
        title: "Procédures et consignes",
        body: "Affichage réglementaire, plans d'évacuation, exercices, ce que le registre de sécurité doit tracer.",
      },
      {
        title: "Mise en conformité",
        body: "Nous accompagnons la correction, pas seulement le constat.",
      },
    ],
    audience: [
      "Établissements recevant du public",
      "Entrepôts et sites industriels",
      "Immeubles de grande hauteur",
    ],
    deliverables: [
      "Analyse des risques incendie",
      "Préconisation de catégorie SSI",
      "Appui à la mise en œuvre",
    ],
    references: [
      {
        label: "Norme NF S 61-931 (catégories de SSI)",
        url: AFNOR_NF_S61_931,
        paid: true,
      },
      {
        label: "Arrêté du 25 juin 1980 (règlement de sécurité ERP)",
        url: LEGIFRANCE.arrete1980,
      },
    ],
    ctaType: "audit",
    ctaLabel: "Demander une analyse",
  },
  {
    slug: "appel-offres",
    kind: "mission",
    icon: "tender",
    eyebrow: "Mission",
    title: "Réponse à appel d'offres.",
    accent: "Un dossier qui tient.",
    lede: "Un appui aux sociétés de sécurité privée : mémoire technique conforme au CCTP, conformité administrative Livre VI, puis entrée en fonction.",
    intro:
      "Un dossier de sécurité privée se joue autant sur le fond que sur la conformité administrative : agrément de l'entreprise, cartes professionnelles à jour des agents affectés, respect du Livre VI du Code de la sécurité intérieure. Une pièce manquante écarte un dossier avant même l'analyse du mémoire technique.",
    includes: [
      {
        title: "Analyse du CCTP",
        body: "Ce que le cahier des clauses techniques particulières exige réellement, poste par poste.",
      },
      {
        title: "Structuration du mémoire technique",
        body: "Plan de réponse construit avant rédaction, aligné sur les critères de notation de l'acheteur.",
      },
      {
        title: "Conformité Livre VI",
        body: "Agrément CNAPS de l'entreprise, cartes professionnelles des agents affectés, qualifications SSIAP si la prestation l'exige.",
      },
      {
        title: "Rédaction et relecture",
        body: "Nous rédigeons, ou nous reprenons ce que vous avez déjà écrit.",
      },
    ],
    audience: [
      "Sociétés de gardiennage",
      "Prestataires de sûreté",
      "Sociétés de sécurité incendie et SSIAP",
    ],
    deliverables: [
      "Mémoire technique structuré",
      "Dossier administratif vérifié",
      "Plan de sécurité post-attribution",
    ],
    references: [
      {
        label: "Livre VI du Code de la sécurité intérieure (CNAPS)",
        url: LEGIFRANCE.livreVICsi,
      },
      {
        label: "Arrêté du 2 mai 2005 (qualifications SSIAP)",
        url: LEGIFRANCE.arreteSsiap2005,
      },
    ],
    ctaType: "ao",
    ctaLabel: "Faire appuyer mon dossier",
  },
  {
    slug: "erp",
    kind: "secteur",
    icon: "public",
    eyebrow: "Secteur",
    title: "Établissements recevant du public.",
    accent: "Accueillir sans risque.",
    lede: "Votre établissement est classé par type d'exploitation et par catégorie selon l'effectif admis. C'est ce classement qui fixe vos obligations.",
    intro:
      "Le règlement de sécurité contre l'incendie du 25 juin 1980 répartit les ERP en une trentaine de types selon leur activité, puis en catégories : la 1re à la 4e catégorie forment le groupe 1, la 5e catégorie le groupe 2, aux obligations allégées. Une école, un commerce et une salle de spectacle ne répondent pas aux mêmes articles, même à effectif comparable.",
    includes: [
      {
        title: "Classement type et catégorie",
        body: "Vérification de la cohérence entre l'activité exercée, l'effectif déclaré et le classement retenu.",
      },
      {
        title: "Dégagements et évacuation",
        body: "Issues de secours, largeur des circulations, affichage, conformes au type d'exploitation.",
      },
      {
        title: "Incendie",
        body: "Désenfumage, SSI de catégorie adaptée, moyens de secours, éclairage de sécurité.",
      },
      {
        title: "Registre et commission",
        body: "Tenue du registre de sécurité, constitution du dossier pour le passage en CCDSA.",
      },
    ],
    audience: [
      "Écoles",
      "Commerces et centres commerciaux",
      "Restaurants et hôtellerie",
      "Salles de spectacle et de sport",
      "Musées et lieux culturels",
    ],
    deliverables: [
      "Audit de classement et de conformité",
      "Plan d'actions priorisé",
      "Dossier de commission",
    ],
    references: [
      {
        label: "Arrêté du 25 juin 1980 (règlement de sécurité ERP)",
        url: LEGIFRANCE.arrete1980,
      },
      {
        label: "Décret n°95-260 du 8 mars 1995 (CCDSA)",
        url: LEGIFRANCE.ccdsaDecret95260,
      },
    ],
    ctaType: "audit",
    ctaLabel: "Faire auditer mon établissement",
    etablissement: "erp",
  },
  {
    slug: "sante",
    kind: "secteur",
    icon: "care",
    eyebrow: "Secteur",
    title: "Santé et accueil spécialisé.",
    accent: "Un public qui ne peut pas courir.",
    lede: "Un établissement de type U ne s'évacue pas comme un commerce : l'organisation repose sur le transfert horizontal, pas sur la sortie du bâtiment.",
    intro:
      "Dans un établissement de santé, l'évacuation totale et immédiate est rarement la réponse adaptée à un public alité ou à mobilité réduite. Le compartimentage et le transfert horizontal vers une zone protégée priment. Pour les tours hospitalières classées immeubles de grande hauteur, le classement GHU de l'arrêté du 30 décembre 2011 impose un SSI de catégorie A.",
    includes: [
      {
        title: "Organisation de l'évacuation différée",
        body: "Compartimentage, zones de mise à l'abri, rôle de chaque poste dans le transfert horizontal.",
      },
      {
        title: "Formation des équipes",
        body: "Conduite à tenir de nuit comme de jour, avec un effectif soignant réduit.",
      },
      {
        title: "Incendie et cloisonnement",
        body: "Désenfumage, recoupement, SSI de catégorie A si l'établissement est classé GHU.",
      },
      {
        title: "Dossier réglementaire",
        body: "Registre de sécurité, consignes par unité, preuves de formation à jour.",
      },
    ],
    audience: [
      "Établissements de santé",
      "Structures d'accueil spécialisé",
      "Établissements scolaires spécialisés",
    ],
    deliverables: [
      "Audit adapté au public accueilli",
      "Organisation d'évacuation différée",
      "Dossier de commission",
    ],
    references: [
      {
        label: "Arrêté du 25 juin 1980 (ERP type U — santé)",
        url: LEGIFRANCE.arrete1980,
      },
      {
        label: "Arrêté du 30 décembre 2011 (IGH, classement GHU)",
        url: LEGIFRANCE.arreteIgh2011,
      },
    ],
    ctaType: "audit",
    ctaLabel: "Faire auditer mon établissement",
    etablissement: "sante",
  },
  {
    slug: "industrie",
    kind: "secteur",
    icon: "industry",
    eyebrow: "Secteur",
    title: "Tertiaire, industrie et logistique.",
    accent: "Le risque vient de l'activité.",
    lede: "Un entrepôt relève souvent des installations classées (ICPE), pas seulement du code de la construction — un régime différent, avec ses propres seuils.",
    intro:
      "Un entrepôt couvert de stockage entre le plus souvent dans la rubrique ICPE 1510 : déclaration à partir de 5 000 m³, enregistrement à partir de 50 000 m³, autorisation au-delà de 900 000 m³. Un immeuble de bureaux de grande hauteur relève, lui, du classement GHW de la réglementation IGH. Deux sites tertiaires voisins peuvent ainsi répondre à deux régimes entièrement différents.",
    includes: [
      {
        title: "Qualification du régime applicable",
        body: "ICPE (déclaration, enregistrement, autorisation) ou code de la construction, selon l'activité et les volumes réels.",
      },
      {
        title: "Incendie et désenfumage",
        body: "Adaptés aux volumes, aux hauteurs de stockage et aux matières présentes.",
      },
      {
        title: "Sûreté du site",
        body: "Contrôle d'accès, périmètre, gestion des flux et de la co-activité.",
      },
      {
        title: "Immeubles de grande hauteur",
        body: "Classement GHA, GHW ou GHZ selon l'usage, obligations de l'arrêté du 30 décembre 2011.",
      },
    ],
    audience: [
      "Bureaux et sites tertiaires",
      "Entrepôts et sites logistiques",
      "Sites industriels",
      "IGH",
      "Copropriétés et résidences",
    ],
    deliverables: [
      "Qualification du régime applicable",
      "Analyse des risques d'exploitation",
      "Plan d'actions priorisé",
    ],
    references: [
      {
        label: "Arrêté du 11 avril 2017 (ICPE, rubrique 1510)",
        url: LEGIFRANCE.icpe1510,
      },
      {
        label: "Arrêté du 30 décembre 2011 (IGH)",
        url: LEGIFRANCE.arreteIgh2011,
      },
    ],
    ctaType: "audit",
    ctaLabel: "Faire auditer mon site",
    etablissement: "industrie",
  },
  {
    slug: "securite-privee",
    kind: "secteur",
    icon: "security",
    eyebrow: "Secteur",
    title: "Sociétés de sécurité privée.",
    accent: "Gagner le marché, puis le tenir.",
    lede: "Le CNAPS délivre l'agrément de l'entreprise et la carte professionnelle de chaque agent — sans elle, personne ne peut être affecté à une mission.",
    intro:
      "Le Livre VI du Code de la sécurité intérieure encadre l'ensemble de la profession : agrément des dirigeants, autorisation d'exercice de la société, carte professionnelle individuelle de chaque agent. Pour la sécurité incendie, s'ajoutent les qualifications SSIAP 1, 2 ou 3 selon le niveau de responsabilité. Une carte expirée ou un agrément suspendu invalide une prestation entière, pas seulement le poste concerné.",
    includes: [
      {
        title: "Réponse à appel d'offres",
        body: "Analyse du CCTP, mémoire technique, conformité Livre VI jusqu'au dépôt.",
      },
      {
        title: "Audit de conformité CNAPS",
        body: "Agrément de l'entreprise, cartes professionnelles des agents, obligations de formation continue.",
      },
      {
        title: "Entrée en fonction",
        body: "Audit structuré et plan de sécurité après attribution du marché.",
      },
      {
        title: "Gardiennage, sûreté, SSIAP",
        body: "Trois familles de prestation, trois cadres de qualification distincts.",
      },
    ],
    audience: [
      "Sociétés de gardiennage",
      "Prestataires de sûreté",
      "Sécurité incendie et SSIAP",
    ],
    deliverables: [
      "Dossier de réponse structuré",
      "Vérification de conformité CNAPS",
      "Plan de sécurité post-attribution",
    ],
    references: [
      {
        label: "Livre VI du Code de la sécurité intérieure (CNAPS)",
        url: LEGIFRANCE.livreVICsi,
      },
      {
        label: "Arrêté du 2 mai 2005 (qualifications SSIAP)",
        url: LEGIFRANCE.arreteSsiap2005,
      },
    ],
    ctaType: "ao",
    ctaLabel: "Faire appuyer mon dossier",
    etablissement: "securite-privee",
  },
];

export function prestationBySlug(slug: string): Prestation | undefined {
  return PRESTATIONS.find((item) => item.slug === slug);
}

export const MISSIONS = PRESTATIONS.filter((item) => item.kind === "mission");
export const SECTEURS = PRESTATIONS.filter((item) => item.kind === "secteur");
