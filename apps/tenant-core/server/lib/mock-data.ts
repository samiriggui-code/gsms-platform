/**
 * Données démo BFF — scopées par workspace_id.
 * Remplacées plus tard par CRM (prestations/finance) + Desk (docs).
 */

export type MockPrestation = {
  id: string;
  title: string;
  kind: "PRECOM" | "AUDIT" | "AO";
  status: "PIECES_MANQUANTES" | "EN_COURS" | "LIVREE" | "CLOTUREE";
  workspaceId: string;
  startedAt: string;
  contactGsms: string;
  summary: string;
};

export type MockDocument = {
  id: string;
  title: string;
  bucket: "A_FOURNIR" | "FOURNI" | "LIVRABLE";
  prestationId: string | null;
  workspaceId: string;
  updatedAt: string;
};

export type MockEchange = {
  id: string;
  subject: string;
  preview: string;
  prestationId: string | null;
  workspaceId: string;
  status: "OUVERT" | "REPONDU" | "CLOS";
  updatedAt: string;
};

export type MockFinanceLine = {
  label: string;
  detail: string;
  amountEur: number;
};

export type MockPlaquetteFinding = {
  title: string;
  detail: string;
};

export type MockPlaquetteBrief = {
  context: string;
  findings: MockPlaquetteFinding[];
  deliverables: string[];
  conditions: string[];
  sourceNote: string;
};

export type MockFinanceItem = {
  id: string;
  label: string;
  kind: "DEVIS" | "FACTURE";
  status: "A_SIGNER" | "SIGNE" | "A_PAYER" | "PAYE";
  amountEur: number;
  prestationId: string | null;
  workspaceId: string;
  updatedAt: string;
  reference: string;
  issuedAt: string;
  validUntil: string | null;
  signedAt: string | null;
  lines: MockFinanceLine[];
  paymentNote: string | null;
  plaquette: MockPlaquetteBrief;
};

const PRESTATIONS: MockPrestation[] = [
  {
    id: "pre_demo_1",
    title: "Préparation commission de sécurité",
    kind: "PRECOM",
    status: "PIECES_MANQUANTES",
    workspaceId: "*",
    startedAt: "2026-08-12",
    contactGsms: "Camille R. — cabinet GSMS",
    summary:
      "Dossier avant commission : pièces réglementaires, plans, notices. Plusieurs documents encore attendus côté établissement.",
  },
  {
    id: "pre_demo_2",
    title: "Audit de sûreté — parcours",
    kind: "AUDIT",
    status: "EN_COURS",
    workspaceId: "*",
    startedAt: "2026-09-01",
    contactGsms: "Samir I. — cabinet GSMS",
    summary:
      "Parcours terrain et analyse des flux. Visite réalisée ; rédaction du rapport et livrables en cours.",
  },
  {
    id: "pre_demo_3",
    title: "Réponse AO — gardiennage site",
    kind: "AO",
    status: "CLOTUREE",
    workspaceId: "*",
    startedAt: "2026-06-20",
    contactGsms: "Camille R. — cabinet GSMS",
    summary: "Accompagnement réponse AO puis clôture post-attribution.",
  },
];

const DOCUMENTS: MockDocument[] = [
  {
    id: "doc_1",
    title: "Plan d’évacuation (PDF)",
    bucket: "A_FOURNIR",
    prestationId: "pre_demo_1",
    workspaceId: "*",
    updatedAt: "2026-09-08T10:00:00Z",
  },
  {
    id: "doc_2",
    title: "Attestation SSIAP",
    bucket: "A_FOURNIR",
    prestationId: "pre_demo_1",
    workspaceId: "*",
    updatedAt: "2026-09-07T14:00:00Z",
  },
  {
    id: "doc_3",
    title: "Registre de sécurité — extrait",
    bucket: "FOURNI",
    prestationId: "pre_demo_1",
    workspaceId: "*",
    updatedAt: "2026-09-05T09:30:00Z",
  },
  {
    id: "doc_4",
    title: "Compte-rendu visite audit",
    bucket: "LIVRABLE",
    prestationId: "pre_demo_2",
    workspaceId: "*",
    updatedAt: "2026-09-06T16:00:00Z",
  },
  {
    id: "doc_5",
    title: "Grille parcours sûreté",
    bucket: "A_FOURNIR",
    prestationId: "pre_demo_2",
    workspaceId: "*",
    updatedAt: "2026-09-04T11:00:00Z",
  },
];

const ECHANGES: MockEchange[] = [
  {
    id: "ech_1",
    subject: "Pièces manquantes — commission",
    preview: "Merci de déposer le plan d’évacuation avant le 15/09.",
    prestationId: "pre_demo_1",
    workspaceId: "*",
    status: "OUVERT",
    updatedAt: "2026-09-08T15:20:00Z",
  },
  {
    id: "ech_2",
    subject: "Compte-rendu visite disponible",
    preview: "Le CR de la visite audit est en livrable dans Documents.",
    prestationId: "pre_demo_2",
    workspaceId: "*",
    status: "REPONDU",
    updatedAt: "2026-09-06T17:00:00Z",
  },
];

const FINANCE: MockFinanceItem[] = [
  {
    id: "fin_1",
    label: "Devis — préparation commission",
    kind: "DEVIS",
    status: "A_SIGNER",
    amountEur: 4800,
    prestationId: "pre_demo_1",
    workspaceId: "*",
    updatedAt: "2026-09-03T10:00:00Z",
    reference: "DEV-2026-0142",
    issuedAt: "2026-09-03",
    validUntil: "2026-10-03",
    signedAt: null,
    paymentNote: null,
    lines: [
      {
        label: "Diagnostic réglementaire & cadrage dossier",
        detail: "Revue pièces, écarts, plan d’actions avant commission.",
        amountEur: 1800,
      },
      {
        label: "Préparation dossier commission",
        detail: "Assemblage notices, plans, attestation — support établissement.",
        amountEur: 2200,
      },
      {
        label: "Accompagnement jour J (forfait)",
        detail: "Présence / brief avant passage commission.",
        amountEur: 800,
      },
    ],
    plaquette: {
      context:
        "Mission de préparation à la commission de sécurité : constituer un dossier cohérent, identifier les écarts réglementaires et accompagner l’établissement jusqu’au passage.",
      findings: [
        {
          title: "État du dossier",
          detail:
            "Plusieurs pièces réglementaires encore manquantes (plan d’évacuation, attestation SSIAP). Le registre de sécurité est partiellement fourni.",
        },
        {
          title: "Risques avant passage",
          detail:
            "Sans plan d’évacuation à jour, le dossier risque un ajournement. Priorité : dépôt des pièces A_FOURNIR avant le 15/09.",
        },
        {
          title: "Périmètre cabinet",
          detail:
            "Cadrage, assemblage du dossier, brief établissement. L’autorité de commission reste hors périmètre GSMS.",
        },
      ],
      deliverables: [
        "Grille d’écarts et plan d’actions",
        "Dossier commission assemblé (version établissement)",
        "Brief oral / écrit avant jour J",
      ],
      conditions: [
        "Devis valable 30 jours",
        "Signature requise avant démarrage de l’assemblage final",
        "Pièces établissement à fournir sous 10 jours ouvrés après signature",
      ],
      sourceNote:
        "Analyse cabinet (démo portail). Branchement ultérieur des constats terrain Grace / CAPA QAtrial sans changer cette plaquette.",
    },
  },
  {
    id: "fin_2",
    label: "Devis — audit de sûreté",
    kind: "DEVIS",
    status: "SIGNE",
    amountEur: 6200,
    prestationId: "pre_demo_2",
    workspaceId: "*",
    updatedAt: "2026-08-28T10:00:00Z",
    reference: "DEV-2026-0118",
    issuedAt: "2026-08-20",
    validUntil: "2026-09-20",
    signedAt: "2026-08-28T10:00:00Z",
    paymentNote: null,
    lines: [
      {
        label: "Parcours terrain & analyse des flux",
        detail: "Visite site, cartographie points sensibles.",
        amountEur: 2800,
      },
      {
        label: "Rapport d’audit & recommandations",
        detail: "Livrable écrit + restitution.",
        amountEur: 3400,
      },
    ],
    plaquette: {
      context:
        "Audit de sûreté sur parcours : comprendre les flux, les points de friction et les mesures à renforcer. Ce devis couvre la visite, l’analyse et le rapport de restitution.",
      findings: [
        {
          title: "Parcours observés",
          detail:
            "Visite réalisée. Cartographie des accès, zones d’attente et points de contrôle. Plusieurs zones à densifier (visibilité, procédures).",
        },
        {
          title: "Synthèse provisoire",
          detail:
            "Compte-rendu de visite disponible en livrable. Rédaction du rapport final et recommandations en cours.",
        },
        {
          title: "Suite métier",
          detail:
            "Les écarts structurants pourront alimenter un plan CAPA côté cabinet ; le portail client conserve ici le cadre commercial et le périmètre livré.",
        },
      ],
      deliverables: [
        "Compte-rendu de visite",
        "Rapport d’audit écrit",
        "Restitution orale des recommandations",
      ],
      conditions: [
        "Devis signé le 28/08/2026",
        "Acompte 50 % facturé séparément (FAC-2026-0087)",
        "Accès site et interlocuteur dédiés garantis par l’établissement",
      ],
      sourceNote:
        "Analyse cabinet (démo portail). Les constats détaillés Grace / QAtrial se brancheront ici sans refonte de la plaquette.",
    },
  },
  {
    id: "fin_3",
    label: "Facture — acompte audit",
    kind: "FACTURE",
    status: "A_PAYER",
    amountEur: 3100,
    prestationId: "pre_demo_2",
    workspaceId: "*",
    updatedAt: "2026-09-02T10:00:00Z",
    reference: "FAC-2026-0087",
    issuedAt: "2026-09-02",
    validUntil: null,
    signedAt: null,
    paymentNote:
      "Acompte 50 % sur devis DEV-2026-0118. Règlement par virement — IBAN communiqué hors portail (cabinet GSMS).",
    lines: [
      {
        label: "Acompte 50 % — audit de sûreté",
        detail: "Selon devis signé DEV-2026-0118.",
        amountEur: 3100,
      },
    ],
    plaquette: {
      context:
        "Facture d’acompte liée au devis d’audit de sûreté DEV-2026-0118. Elle ne remplace pas le devis : elle déclenche le règlement de la première moitié du montant signé.",
      findings: [
        {
          title: "Référence commerciale",
          detail:
            "Acompte 50 % du devis signé (6 200 € TTC) pour l’audit parcours — visite et rapport.",
        },
        {
          title: "Mission en cours",
          detail:
            "Visite réalisée ; livrables en rédaction. Le solde sera facturé à livraison du rapport.",
        },
      ],
      deliverables: [
        "Maintien du planning d’audit",
        "Accès aux livrables déjà produits sur le portail",
      ],
      conditions: [
        "Paiement à réception",
        "IBAN communiqué par le cabinet (hors portail)",
        "Sans acompte, la rédaction finale peut être suspendue",
      ],
      sourceNote:
        "Document commercial portail. Aucune analyse terrain supplémentaire sur une facture d’acompte.",
    },
  },
];

function scope<T extends { workspaceId: string }>(items: T[], workspaceId: string): T[] {
  return items.map((item) =>
    item.workspaceId === "*" ? { ...item, workspaceId } : item,
  );
}

export function mockDashboard(workspaceId: string) {
  const prestations = scope(PRESTATIONS, workspaceId).filter(
    (p) => p.status === "PIECES_MANQUANTES" || p.status === "EN_COURS",
  );
  const docs = scope(DOCUMENTS, workspaceId);
  const finance = scope(FINANCE, workspaceId);

  return {
    workspaceId,
    counts: {
      prestationsOpen: prestations.length,
      piecesPending: docs.filter((d) => d.bucket === "A_FOURNIR").length,
      devisPending: finance.filter((f) => f.kind === "DEVIS" && f.status === "A_SIGNER").length,
      livrablesUnread: docs.filter((d) => d.bucket === "LIVRABLE").length,
    },
    prestations: prestations.map((p) => ({
      id: p.id,
      title: p.title,
      kind: p.kind,
      status: p.status,
      workspaceId: p.workspaceId,
    })),
  };
}

export function mockPrestations(workspaceId: string) {
  return scope(PRESTATIONS, workspaceId);
}

export function mockPrestation(workspaceId: string, id: string) {
  return scope(PRESTATIONS, workspaceId).find((p) => p.id === id) ?? null;
}

export function mockDocuments(workspaceId: string, prestationId?: string) {
  let items = scope(DOCUMENTS, workspaceId);
  if (prestationId) items = items.filter((d) => d.prestationId === prestationId);
  return items;
}

/** Dépôt client : répond à une demande A_FOURNIR ou ajoute un FOURNI. */
export function mockUploadDocument(
  workspaceId: string,
  opts: {
    title: string;
    prestationId?: string | null;
    demandeId?: string | null;
  },
): MockDocument {
  const now = new Date().toISOString();

  if (opts.demandeId) {
    const idx = DOCUMENTS.findIndex((d) => d.id === opts.demandeId);
    if (idx >= 0) {
      const prev = DOCUMENTS[idx]!;
      const updated: MockDocument = {
        ...prev,
        title: opts.title || prev.title,
        bucket: "FOURNI",
        workspaceId: prev.workspaceId === "*" ? workspaceId : prev.workspaceId,
        updatedAt: now,
      };
      DOCUMENTS[idx] = updated;
      return { ...updated, workspaceId };
    }
  }

  const created: MockDocument = {
    id: `doc_${Date.now()}`,
    title: opts.title,
    bucket: "FOURNI",
    prestationId: opts.prestationId ?? null,
    workspaceId,
    updatedAt: now,
  };
  DOCUMENTS.unshift(created);
  return created;
}

export function mockEchanges(workspaceId: string, prestationId?: string) {
  let items = scope(ECHANGES, workspaceId);
  if (prestationId) items = items.filter((e) => e.prestationId === prestationId);
  return items;
}

export function mockFinance(workspaceId: string, prestationId?: string) {
  let items = scope(FINANCE, workspaceId);
  if (prestationId) items = items.filter((f) => f.prestationId === prestationId);
  return items;
}

export function mockFinanceItem(workspaceId: string, id: string) {
  return scope(FINANCE, workspaceId).find((f) => f.id === id) ?? null;
}

export function mockFinanceDetail(workspaceId: string, id: string) {
  const item = mockFinanceItem(workspaceId, id);
  if (!item) return null;
  const prestation = item.prestationId
    ? mockPrestation(workspaceId, item.prestationId)
    : null;
  return {
    item,
    prestation,
    pdfUrl: `/api/bff/finance/${item.id}/pdf`,
  };
}

/** Signature électronique mock — devis A_SIGNER → SIGNE. */
export function mockSignFinance(workspaceId: string, id: string) {
  const idx = FINANCE.findIndex((f) => f.id === id);
  if (idx < 0) return { error: "NOT_FOUND" as const };
  const prev = FINANCE[idx]!;
  if (prev.kind !== "DEVIS") return { error: "NOT_DEVIS" as const };
  if (prev.status !== "A_SIGNER") return { error: "NOT_SIGNABLE" as const };

  const now = new Date().toISOString();
  const updated: MockFinanceItem = {
    ...prev,
    status: "SIGNE",
    signedAt: now,
    updatedAt: now,
    workspaceId: prev.workspaceId === "*" ? workspaceId : prev.workspaceId,
  };
  FINANCE[idx] = updated;
  return {
    item: { ...updated, workspaceId },
    prestation: updated.prestationId
      ? mockPrestation(workspaceId, updated.prestationId)
      : null,
    pdfUrl: `/api/bff/finance/${updated.id}/pdf`,
  };
}

/** PDF minimal (Helvetica ASCII) pour visionneuse / téléchargement. */
export function mockFinancePdfBytes(workspaceId: string, id: string): Uint8Array | null {
  const item = mockFinanceItem(workspaceId, id);
  if (!item) return null;

  const ascii = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "?");

  const lines: string[] = [
    `GSMS — ${item.kind === "DEVIS" ? "DEVIS" : "FACTURE"} ${ascii(item.reference)}`,
    ascii(item.label),
    `Emis le ${item.issuedAt}` +
      (item.validUntil ? ` — Valable jusqu'au ${item.validUntil}` : ""),
    "",
    ...item.lines.flatMap((l) => [
      `- ${ascii(l.label)} : ${l.amountEur.toFixed(2)} EUR`,
      `  ${ascii(l.detail)}`,
    ]),
    "",
    `TOTAL TTC : ${item.amountEur.toFixed(2)} EUR`,
    `Statut : ${item.status}`,
    item.signedAt ? `Signe le : ${item.signedAt.slice(0, 10)}` : "",
    item.paymentNote ? ascii(item.paymentNote) : "",
  ].filter(Boolean);

  const contentLines = lines.map((line, i) => {
    const y = 750 - i * 18;
    const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    return `BT /F1 11 Tf 50 ${y} Td (${escaped}) Tj ET`;
  });
  const stream = contentLines.join("\n");
  const streamLen = Buffer.byteLength(stream, "utf8");

  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${streamLen} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}
