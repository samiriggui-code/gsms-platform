/**
 * Contrat d'API attendu du Core GSMS (apps/core, FastAPI) par apps/web.
 *
 * Tous les chemins sont relatifs à `${CORE_API_URL}/api/v1`.
 * Authentification : `Authorization: Bearer <JWT Core>` (cookie httpOnly gsms_session).
 * En-têtes de contexte posés par lib/core/client.ts : X-GSMS-Workspace-Id,
 * X-GSMS-Mission-Id / X-GSMS-Engagement-Id, X-GSMS-Client-Id, X-GSMS-Site-Id,
 * X-GSMS-Tenant-Id, X-GSMS-Correlation-Id (+ Idempotency-Key pour l'intake).
 *
 * Réponses liste : tableau brut ou `{ items: T[], total?: number, next_cursor?: string }`.
 * Erreurs : format FastAPI `{ detail: string | [{ msg }] }`.
 *
 * Ce fichier est la source de vérité côté front : tout endpoint utilisé par
 * l'UI doit y être déclaré. Les endpoints sans route Core correspondante
 * renvoient encore 404 (dashboard ✓ · intake ✓ · tenders spine ✓).
 */

const enc = encodeURIComponent;
const ws = (workspaceId: string) => `/workspaces/${enc(workspaceId)}`;
const tender = (workspaceId: string, missionId: string) => `${ws(workspaceId)}/tenders/${enc(missionId)}`;

export const ENDPOINTS = {
  /** Public — sans authentification. */
  public: {
    /** POST {type, firstName, lastName?, email, phone?, companyName?, title?, subject?, message?, ...}
     *  → 201/202 {id, status}. Idempotent via Idempotency-Key. Le Core relaie vers le pipeline commercial. */
    intake: () => "/intake",
  },

  auth: {
    /** POST {email, password} → {access_token, token_type: "bearer", expires_in?, workspace_id?} */
    login: () => "/auth/login",
    /** POST → 204. Révocation côté Core (best effort). */
    logout: () => "/auth/logout",
    /** GET → Me {id, email, name, org_id, organization_name, workspace_id, role, workspaces[]} (Core MeOut) */
    me: () => "/auth/me",
  },

  /** SSE notifications/événements : GET /stream (text/event-stream). À brancher côté client via un route handler. */
  stream: () => "/stream",

  workspaces: {
    /** GET → Workspace[] (sites accessibles à l'utilisateur) */
    list: () => "/workspaces",
    /** GET → fiche site */
    detail: (workspaceId: string) => ws(workspaceId),
    /** GET → contexte métier résolu (ContextResolver) */
    context: (workspaceId: string) => `${ws(workspaceId)}/context`,
    /** GET → {attention[], deadlines[], missions[], activity[]} */
    dashboard: (workspaceId: string) => `${ws(workspaceId)}/dashboard`,
    /** GET/POST → bindings apps spécialisées */
    applications: (workspaceId: string) => `${ws(workspaceId)}/applications`,
  },

  context: {
    applications: () => "/context/applications",
    engagementTypes: () => "/context/engagement-types",
    byWorkspace: (workspaceId: string) => `/context/by-workspace/${enc(workspaceId)}`,
    byEngagement: (engagementId: string) => `/context/by-engagement/${enc(engagementId)}`,
    bySite: (siteId: string) => `/context/by-site/${enc(siteId)}`,
    byClient: (clientId: string) => `/context/by-client/${enc(clientId)}`,
  },

  /** POST {client_id, site_id, engagement_type, title, ...} → engagement + workspace déterministe */
  engagements: {
    create: () => "/engagements",
  },

  /** GET → Client[] (organisations clientes, avec nb de sites et contacts) */
  clients: (workspaceId: string) => `${ws(workspaceId)}/clients`,

  /** GET ?type=audit|commission_securite|appel_offres|accompagnement|conformite → Mission[] */
  missions: (workspaceId: string) => `${ws(workspaceId)}/missions`,

  documents: {
    /** GET ?folder=&mission_id= → Document[] */
    list: (workspaceId: string) => `${ws(workspaceId)}/documents`,
    /** GET ?q= → {items: SearchHit[]} recherche plein texte + sémantique */
    search: (workspaceId: string) => `${ws(workspaceId)}/documents/search`,
    /** POST {question} → {answer, citations[]} Q/R cité */
    ask: (workspaceId: string) => `${ws(workspaceId)}/documents/ask`,
  },

  /** Coffre-fort documentaire (fichiers chiffrés par prestation, dossiers, journal d'accès). */
  vault: {
    /** GET → VaultClient[] : Client → Site → Prestation accessibles */
    tree: () => "/vault/tree",
    /** GET → VaultFolder[] (arbre) · POST {name, parent_id} → VaultFolder */
    folders: (workspaceId: string) => `${ws(workspaceId)}/vault/folders`,
    /** GET → VaultFolderContent · PATCH {name} · DELETE (vide, non système) */
    folder: (workspaceId: string, folderId: string) => `${ws(workspaceId)}/vault/folders/${enc(folderId)}`,
    /** POST {folder_id} */
    move: (workspaceId: string, documentId: string) => `${ws(workspaceId)}/vault/documents/${enc(documentId)}/move`,
    /** POST → VaultVerify[] (équipe) */
    verify: (workspaceId: string, documentId: string) => `${ws(workspaceId)}/vault/documents/${enc(documentId)}/verify`,
    /** GET → VaultAccess[] (équipe) */
    accessLog: (workspaceId: string, documentId: string) =>
      `${ws(workspaceId)}/vault/documents/${enc(documentId)}/access-log`,
    /** GET → Version[] */
    versions: (workspaceId: string, documentId: string) => `${ws(workspaceId)}/documents/${enc(documentId)}/versions`,
    /** GET → fichier déchiffré (journalisé) ; relayé par /api/vault/… côté navigateur */
    content: (workspaceId: string, documentId: string) => `${ws(workspaceId)}/documents/${enc(documentId)}/content`,
    /** POST multipart {file, folder_id?, analyze?} ; relayé par /api/vault/… côté navigateur */
    upload: (workspaceId: string) => `${ws(workspaceId)}/documents`,
  },

  /** GET → Audit[] (assessments synchronisés depuis l'outil d'audit terrain, avec external_url) */
  audits: (workspaceId: string) => `${ws(workspaceId)}/audits`,
  /** GET → Finding[] (constats normalisés) */
  findings: (workspaceId: string) => `${ws(workspaceId)}/findings`,
  /** GET → Action[] (actions et CAPA liées) */
  actions: (workspaceId: string) => `${ws(workspaceId)}/actions`,
  /** GET ?kind=reglementaire|contractuel|appel_offres → Deadline[] */
  deadlines: (workspaceId: string) => `${ws(workspaceId)}/deadlines`,

  commercial: {
    /** GET → Opportunity[] (lecture ; pipeline complet dans l'outil commercial) */
    opportunities: (workspaceId: string) => `${ws(workspaceId)}/commercial/opportunities`,
    /** GET → Quote[] */
    quotes: (workspaceId: string) => `${ws(workspaceId)}/commercial/quotes`,
  },

  assistant: {
    /** GET → Conversation[] */
    conversations: (workspaceId: string) => `${ws(workspaceId)}/assistant/conversations`,
    /** POST {message, conversation_id?, context?} → {conversation_id, reply, proposals[]} */
    messages: (workspaceId: string) => `${ws(workspaceId)}/assistant/messages`,
  },

  /** GET → Report[] (exports mission et site) */
  reports: (workspaceId: string) => `${ws(workspaceId)}/reports`,

  settings: {
    /** GET → Member[] */
    members: (workspaceId: string) => `${ws(workspaceId)}/members`,
    /** GET → Role[] */
    roles: (workspaceId: string) => `${ws(workspaceId)}/roles`,
    /** GET → NotificationPreference[] */
    notifications: (workspaceId: string) => `${ws(workspaceId)}/settings/notifications`,
    /** GET → Integration[] (statut des connecteurs gérés par le Core) */
    integrations: (workspaceId: string) => `${ws(workspaceId)}/settings/integrations`,
  },

  /**
   * Appels d'offres — Annexe B.
   * Circuit : Next.js → Core → passerelle d'outils → moteurs AO/veille → Core (persistance) → Next.js.
   * L'UI n'appelle jamais les moteurs directement.
   */
  tenders: {
    /** GET → TenderMission[] (dossiers AO du workspace) */
    list: (workspaceId: string) => `${ws(workspaceId)}/tenders`,
    /** GET ?q=&cpv=&nuts=&min_amount=&max_amount=&deadline_before= → Opportunity[] (veille) */
    opportunities: (workspaceId: string) => `${ws(workspaceId)}/tenders/opportunities`,
    /** GET → TenderSummary {mission, buyer, lots[], amount, status, next_deadlines[]} */
    summary: (workspaceId: string, missionId: string) => tender(workspaceId, missionId),
    /** GET → Piece[] {kind: RC|CCTP|CCAP|AE|BPU|DPGF|annexe, required, provided, document_id} ; POST upload zip */
    pieces: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/pieces`,
    /** GET → {sections[], criteria[]} ; POST /analysis/run déclenche l'analyse du RC/CCTP */
    analysis: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/analysis`,
    /** GET → Requirement[] {id, text, owner, status} */
    requirements: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/requirements`,
    /** GET → ComplianceRow[] (statut final décidé par l'humain) */
    compliance: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/compliance`,
    /** GET → {criteria[], score, recommendation, assistant_opinion?, decision?} ; POST /go-no-go/decision */
    goNoGo: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/go-no-go`,
    /** GET → Risk[] */
    risks: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/risks`,
    /** GET → Question[] + questions_deadline */
    questions: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/questions`,
    /** GET → TechnicalSection[] (documents versionnés) */
    technicalResponse: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/technical-response`,
    /** GET → {quotes[], bom[], pricing, proposal_document_id?} */
    financialResponse: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/financial-response`,
    /** GET → Document[] (versions générées et déposées) */
    documents: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/documents`,
    /** GET → Deadline[] (questions, visite, remise) */
    deadlines: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/deadlines`,
    /** GET → Event[] (event store + journal d'audit) */
    history: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/history`,
    /** GET → AgentRun[] (actions proposées par l'assistant, à valider) */
    agents: (workspaceId: string, missionId: string) => `${tender(workspaceId, missionId)}/agents`,
  },
} as const;
