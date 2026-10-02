/**
 * Copie FR de la vitrine publique GSMS.
 * Portée depuis apps/crm/apps/app/components/landing/gsms-copy.ts (contenu retenu, cf. §17).
 * Règle : aucun nom d'outil interne dans la copie publique.
 * TODO i18n : migrer vers next-intl (FR par défaut, EN).
 */
export const GSMS_META = {
  title: "GSMS — Sécurité, sûreté et prévention pour établissements",
  description:
    "GSMS accompagne établissements recevant du public et sociétés de sécurité privée : audits, commissions de sécurité, prévention incendie, appels d'offres.",
} as const;

export const NAV_LINKS = [
  { label: "Parcours", href: "/#parcours" },
  { label: "Prestations", href: "/prestations" },
  { label: "Environnements", href: "/#environnements" },
  { label: "Offres", href: "/#offres" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/demande?type=contact" },
] as const;

export const HERO = {
  badge: "Sécurité · Sûreté · Prévention",
  title: "Faire de la sécurité une évidence,",
  accent: "pas une contrainte.",
  lede: "De l'audit à la commission de sécurité, nous accompagnons les établissements recevant du public dans leurs obligations de sécurité et de prévention.",
  domains: [
    { icon: "audit", label: "Audits et commissions de sécurité" },
    { icon: "fire", label: "Prévention incendie et conformité" },
    { icon: "tender", label: "Appels d'offres sécurité" },
  ],
  panel: {
    title: "Restitution d'audit",
    caption: "Exemple de livrable",
    columns: { point: "Point de contrôle", area: "Domaine" },
    rows: [
      { label: "Désenfumage", area: "Incendie", status: "conforme" },
      { label: "Issues de secours", area: "Évacuation", status: "conforme" },
      { label: "Registre de sécurité", area: "Organisation", status: "action" },
      {
        label: "Formation du personnel",
        area: "Organisation",
        status: "cours",
      },
      { label: "SSI et alarme incendie", area: "Incendie", status: "conforme" },
    ],
    footer: "Chaque point est repris dans un plan d'actions priorisé.",
  },
} as const;

export const TRUST = {
  items: [
    {
      label: "Intervention cadrée",
      detail: "Périmètre défini avec vous avant toute visite.",
    },
    {
      label: "Livrables exploitables",
      detail: "Rapport, plan d'actions priorisé, dossier réglementaire.",
    },
    {
      label: "Accompagnement en commission",
      detail: "Présents jusqu'au passage et après.",
    },
    {
      label: "Suivi après mission",
      detail: "Échéances réglementaires et mise en œuvre.",
    },
  ],
} as const;

export const PROBLEM = {
  eyebrow: "Vous vous reconnaissez ?",
  title: "La commission approche.",
  accent: "Et personne ne sait où en est le dossier.",
  lede: "Les obligations de sécurité ne préviennent pas. Elles arrivent avec une date, une visite, et une liste de points à justifier. Vous dirigez un établissement, pas un service conformité.",
  pains: [
    "Vous ne savez pas ce que la commission va contrôler.",
    "Le registre de sécurité n'est pas à jour, et personne n'a le temps.",
    "On vous demande un mémoire technique, vous n'avez jamais rédigé de réponse à un appel d'offres.",
    "Vous avez reçu des préconisations, sans savoir par laquelle commencer.",
  ],
  answer:
    "Nous reprenons le dossier. Nous vous disons ce qui bloque, dans quel ordre le traiter, et nous restons jusqu'au passage.",
} as const;

export const CONTEXTS = {
  eyebrow: "Où en êtes-vous ?",
  title: "Choisissez votre situation.",
  accent: "Nous adaptons la mission.",
  lede: "Sélectionnez le contexte le plus proche du vôtre. Votre demande arrive déjà qualifiée, et nous vous répondons avec le bon interlocuteur.",
  groups: [
    {
      icon: "public",
      slug: "erp",
      title: "Établissement recevant du public",
      description:
        "Vous accueillez du public et devez justifier vos dispositifs de sécurité et d'évacuation.",
      type: "audit",
      items: [
        "Écoles",
        "Commerces",
        "Centres commerciaux",
        "Restaurants & hôtellerie",
        "Salles de spectacle & sport",
        "Musées & lieux culturels",
      ],
    },
    {
      icon: "care",
      slug: "sante",
      title: "Santé et accueil spécialisé",
      description:
        "Votre public est vulnérable et l'évacuation demande une organisation adaptée.",
      type: "audit",
      items: [
        "Établissements de santé",
        "Structures d'accueil spécialisé",
        "Établissements scolaires spécialisés",
      ],
    },
    {
      icon: "industry",
      slug: "industrie",
      title: "Tertiaire, industrie et logistique",
      description:
        "Vos sites cumulent risques d'exploitation et obligations propres à votre activité.",
      type: "audit",
      items: [
        "Bureaux & sites tertiaires",
        "IGH",
        "Entrepôts",
        "Sites industriels",
        "Parkings & sites logistiques",
        "Copropriétés & résidences",
      ],
    },
    {
      icon: "security",
      slug: "securite-privee",
      title: "Société de sécurité privée",
      description:
        "Vous répondez à un marché et devez produire un dossier conforme au cahier des charges.",
      type: "ao",
      items: [
        "Gardiennage",
        "Sûreté",
        "Sécurité incendie & SSIAP",
        "Réponses aux appels d'offres",
      ],
    },
  ],
  cta: "Voir les obligations applicables",
} as const;

export const FAQ = {
  eyebrow: "Questions fréquentes",
  title: "Ce qu'on nous demande",
  accent: "avant de commencer.",
  items: [
    {
      question: "Comment se passe une première prise de contact ?",
      answer:
        "Nous échangeons avec vous pour comprendre votre établissement, son activité et ses obligations. Cet échange cadre le périmètre de la mission avant toute intervention. Il n'engage à rien.",
    },
    {
      question: "Qu'est-ce que je reçois à la fin d'une mission ?",
      answer:
        "Un rapport d'audit ou un dossier de préparation, un plan d'actions priorisé, et les documents prêts pour la commission de sécurité ou pour l'appel d'offres. Le tout est présenté lors d'une restitution dédiée.",
    },
    {
      question: "Vous intervenez sur site ou à distance ?",
      answer:
        "Sur site. Nos intervenants se déplacent pour relever les installations, vérifier les dispositifs de sécurité et de sûreté, et s'entretenir avec vos équipes. Le cadrage initial et la restitution peuvent se faire à distance.",
    },
    {
      question: "Que se passe-t-il après la remise du rapport ?",
      answer:
        "Nous restons disponibles. Nous vous accompagnons dans la mise en œuvre des recommandations et dans le suivi de vos échéances réglementaires. L'accompagnement ne s'arrête pas au rapport.",
    },
    {
      question: "Vous accompagnez aussi les sociétés de sécurité privée ?",
      answer:
        "Oui. Nous intervenons sur l'analyse du CCTP, la structuration du mémoire technique, la rédaction et la relecture du dossier, et la conformité administrative, jusqu'au dépôt. Après attribution, nous accompagnons l'entrée en fonction sur site.",
    },
    {
      question: "Comment sont chiffrées vos interventions ?",
      answer:
        "Sur devis. Chaque mission est chiffrée selon le périmètre de votre établissement ou de votre dossier. Décrivez-nous votre contexte, nous revenons vers vous avec une proposition adaptée.",
    },
  ],
} as const;

export const COMPARE = {
  head: { them: "Sans accompagnement", us: "Avec GSMS" },
  rows: [
    {
      them: "Vous découvrez les points de contrôle le jour de la visite.",
      us: "Vous savez ce qui sera contrôlé, avant la visite.",
    },
    {
      them: "Les préconisations arrivent en vrac, sans ordre de priorité.",
      us: "Un plan d'actions priorisé, du bloquant au secondaire.",
    },
    {
      them: "Le registre et les pièces sont dispersés.",
      us: "Un dossier réglementaire constitué et vérifié.",
    },
    {
      them: "Vous passez la commission seul.",
      us: "Nous sommes présents le jour du passage.",
    },
    {
      them: "Après le rapport, plus personne.",
      us: "Un suivi des échéances après la mission.",
    },
  ],
} as const;

export const GAUGE = {
  caption: "Exemple de restitution",
  title: "Préparation à la commission",
  score: 68,
  scoreLabel: "prêt pour le passage",
  subtitle: "7 domaines de contrôle évalués",
  rows: [
    { label: "Désenfumage", value: 90 },
    { label: "Issues de secours", value: 85 },
    { label: "SSI et alarme incendie", value: 78 },
    { label: "Éclairage de sécurité", value: 70 },
    { label: "Registre de sécurité", value: 40 },
    { label: "Formation du personnel", value: 35 },
    { label: "Affichage et consignes", value: 60 },
  ],
  footer: "Chaque domaine est repris dans un plan d'actions priorisé.",
} as const;

export const PARCOURS = {
  eyebrow: "Parcours",
  title: "Comment se déroule une mission",
  lede: "Du brief à la restitution : une intervention cadrée, des livrables exploitables, un suivi après la mission.",
  steps: [
    {
      title: "Prise de brief",
      lead: "Nous échangeons avec vous pour comprendre votre établissement, son activité et ses obligations réglementaires. Cet échange initial cadre précisément le périmètre de la mission.",
      bullets: [
        "Présentation de l'établissement et de son activité",
        "Identification des obligations applicables",
        "Définition du périmètre de la mission",
      ],
      footer: "Un cadrage clair avant toute intervention.",
      result: "Périmètre défini",
    },
    {
      title: "Analyse sur site",
      lead: "Nos intervenants se rendent sur place pour examiner l'organisation, les installations et les dispositifs existants.",
      bullets: [
        "Visite et relevé des installations",
        "Vérification des dispositifs de sécurité et de sûreté",
        "Entretiens avec les équipes concernées",
      ],
      footer: "Une observation rigoureuse, au plus près du terrain.",
      result: "Relevé terrain",
    },
    {
      title: "Élaboration des livrables",
      lead: "Nous rédigeons un rapport détaillé et des préconisations concrètes, adaptés à votre établissement et directement exploitables.",
      bullets: [
        "Rapport d'audit ou dossier de préparation",
        "Plan d'actions priorisé",
        "Documents prêts pour la commission de sécurité ou l'appel d'offres",
      ],
      footer: "Des documents clairs, prêts à l'usage.",
      result: "Dossier constitué",
    },
    {
      title: "Restitution",
      lead: "Nous présentons nos conclusions et répondons à vos questions lors d'un échange dédié.",
      bullets: [
        "Présentation des résultats et des priorités",
        "Réponses à vos questions",
        "Remise des documents finaux",
      ],
      footer: "Une restitution pour décider en connaissance de cause.",
      result: "Priorités arbitrées",
    },
    {
      title: "Suivi",
      lead: "Nous restons disponibles après la mission pour vous accompagner dans la mise en œuvre des recommandations.",
      bullets: [
        "Accompagnement à la mise en œuvre",
        "Suivi des échéances réglementaires",
        "Disponibilité pour vos questions",
      ],
      footer: "Un accompagnement qui ne s'arrête pas au rapport.",
      result: "Échéances suivies",
    },
  ],
} as const;

export const FEATURES = {
  eyebrow: "Savoir-faire",
  title: "Notre savoir-faire",
  lede: "Ce que nous apportons aux établissements — et, sur sollicitation, aux sociétés de sécurité privée.",
  cards: [
    {
      icon: "audit",
      title: "Audit de sécurité",
      description:
        "Évaluation complète de l'organisation et des dispositifs de sécurité de votre établissement, avec préconisations concrètes.",
    },
    {
      icon: "fire",
      title: "Prévention incendie",
      description:
        "Analyse des risques incendie et accompagnement à la mise en conformité de vos installations et procédures.",
    },
    {
      icon: "commission",
      title: "Préparation aux commissions de sécurité",
      description:
        "Constitution des dossiers et accompagnement jusqu'au passage devant la commission de sécurité.",
    },
    {
      icon: "building",
      title: "Sécurité des installations et bâtiments",
      description:
        "Sécurisation de vos sites, entrepôts et bâtiments tertiaires selon les exigences applicables à votre activité.",
    },
    {
      icon: "tender",
      title: "Réponses à appels d'offres",
      description:
        "Accompagnement des sociétés de sécurité privée : dossiers de réponse (gardiennage, sûreté, incendie, SSIAP), puis entrée en fonction sur site.",
    },
    {
      icon: "rule",
      title: "Accompagnement réglementaire",
      description:
        "Veille et conseil sur les obligations de sécurité et de prévention applicables à votre établissement.",
    },
  ],
} as const;

export const OFFERS = {
  eyebrow: "Offres",
  title: "Des missions sur devis",
  lede: "Chaque intervention est chiffrée selon le périmètre de votre établissement ou de votre dossier.",
  plans: [
    {
      name: "Audit ponctuel",
      price: "Sur devis",
      description:
        "Un état des lieux complet de votre établissement, pour identifier les priorités et vous mettre en conformité.",
      features: [
        "Visite et analyse sur site",
        "Vérification des dispositifs existants",
        "Rapport d'audit détaillé",
        "Plan d'actions priorisé",
        "Restitution avec l'équipe",
      ],
      kind: "audit" as const,
      highlighted: false,
    },
    {
      name: "Préparation à la commission de sécurité",
      price: "Sur devis",
      description:
        "Un accompagnement complet pour préparer et réussir le passage devant la commission de sécurité.",
      features: [
        "Constitution du dossier réglementaire",
        "Vérification des points de contrôle",
        "Préconisations correctives",
        "Accompagnement le jour de la commission",
        "Suivi post-commission",
      ],
      kind: "audit" as const,
      highlighted: true,
      badge: "Le plus demandé",
    },
    {
      name: "Accompagnement appel d'offres",
      price: "Sur devis",
      description:
        "Un appui dédié aux sociétés de sécurité privée : réponse conforme au cahier des charges, puis accompagnement à l'entrée en fonction sur site.",
      features: [
        "Analyse du CCTP",
        "Structuration du mémoire technique",
        "Rédaction et relecture du dossier",
        "Vérification de conformité administrative",
        "Appui jusqu'au dépôt",
        "Audit structuré et plan de sécurité post-attribution",
      ],
      kind: "ao" as const,
      highlighted: false,
    },
  ],
} as const;

export const CLOSING = {
  eyebrow: "Prendre contact",
  title: "Parlons de votre établissement",
  lede: "Chaque situation est différente. Décrivez-nous votre contexte, nous vous proposons une intervention adaptée.",
} as const;

export const FOOTER = {
  blurb:
    "GSMS accompagne les établissements et les sociétés de sécurité privée dans leurs obligations de sécurité, de sûreté et de prévention. Une expertise de terrain, au service de votre conformité.",
  columns: [
    {
      title: "Missions",
      links: [
        { label: "Audit de sécurité", href: "/prestations/audit-securite" },
        {
          label: "Prévention incendie",
          href: "/prestations/prevention-incendie",
        },
        {
          label: "Commission de sécurité",
          href: "/prestations/commission-securite",
        },
        {
          label: "Réponses à appel d'offres",
          href: "/prestations/appel-offres",
        },
      ],
    },
    {
      title: "Établissements",
      links: [
        { label: "Recevant du public", href: "/prestations/erp" },
        { label: "Santé et accueil spécialisé", href: "/prestations/sante" },
        { label: "Tertiaire et industrie", href: "/prestations/industrie" },
        {
          label: "Sociétés de sécurité privée",
          href: "/prestations/securite-privee",
        },
      ],
    },
    {
      title: "Entreprise",
      links: [
        { label: "Parcours d'une mission", href: "/#parcours" },
        { label: "Offres", href: "/#offres" },
        { label: "Contact", href: "/demande?type=contact" },
        { label: "Demander un devis", href: "/demande?type=audit" },
      ],
    },
  ],
  legal: "© 2026 GSMS / Global IT Soft Services",
} as const;
