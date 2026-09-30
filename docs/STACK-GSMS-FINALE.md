# Stack GSMS — version finale (canonique)

**Statut :** référence **unique** pour la plateforme — 2026-09-04  
**Mode de travail :** une brique à la fois sur le **PC portable** (Cursor / Claude) → correction / adaptation → **déploiement NUC** (lab / test). Ne pas monter toute la stack en local (ressources).  
**Remplace / prime sur :** sections contradictoires de `ARCHITECTURE.md`, `DOCTRINE.md` §2, `docs/README.md` (rôles), et tout doc qui fait d’InvoicePilot un CRM ou de Xacta le moteur GRC unique du lab.

> Les docs plus anciennes restent en archive de chantier ; si conflit → **ce fichier gagne**.

---

## Pattern ops

1. **Laptop** (Cursor) — adapter / corriger **une** brique, smoke local léger.  
2. **NUC** — déployer en lab LAN (`192.168.1.37`) pour valider.  
3. **VPS** — seulement si le NUC manque de **RAM / CPU** (ou besoin FQDN public).  
4. Passer à la brique suivante.  

Ne pas monter toute la stack sur le laptop. Comp AI GRC (`apps/comp`) : **supprimé du laptop** après salvage ; purge NUC puis VPS dans cet ordre.

---

## Les 3 apps front-facing

| App | Rôle réel | Notes |
|-----|-----------|--------|
| **InvoicePilot** (`apps/InvoicePilot-AI`) | Site marketing + portail missions authentifié (`_app`) + **legacy** e-facture (Invoice, Counterparty, ApprovedPlatform…). Le « Cockpit missions » est une **façade DocType en mémoire**, pas un CRM. | Pas de pipeline Deal/Contact local |
| **Comp AI CRM** (`apps/crm`) | **Le vrai CRM** — Company / Contact / Deal, agent **Eve**, Postgres. Swagger NestJS **`:3001`** en local (défaut Nest). | GSMS Core / cockpit ops — **à garder** |

**Comp AI GRC** (`apps/comp`) : encore dans le monorepo laptop (**restauré** 2026-09-06 après delete prématuré). Décorticage / salvage en cours — **ne pas supprimer** sans GO. Voir [`COMP-AI-DECOMPOSITION.md`](./COMP-AI-DECOMPOSITION.md).

**Jonction critique :** InvoicePilot a déjà `audit-request.ts` / `tender-request.ts` → API publique CRM via `GSMS_CRM_API_URL` + `GSMS_PUBLIC_API_KEY`. Sans ces variables : erreur « config CRM manquante ». Une fois pointées vers `apps/crm`, l’intake vitrine → CRM fonctionne **sans** nouveau code d’intake.

---

## Moteurs spécialisés

| Moteur | Rôle | Statut / notes |
|--------|------|----------------|
| **GRACE** | Audit sécurité **physique** (CSMP) + futur **module cyber** (checklist ISO/SOC2 → Finding) | React/Vite + Fastify/Prisma → API lab **`:3011`** (≠ CRM) → tool REST Eve |
| **QAtrial** | CAPA / audit-trail + extensions (calendrier, policy gen) | Traitement Findings toutes catégories |
| **TenderAI MCP Max** | Traite un AO **déjà trouvé** (RFP, mémoires, partenaires) | MCP `:8090`, déjà déployé NUC |
| **LexSocket** | **Recherche / veille** AO FR + Europe (TED, BOAMP, etc.) | `mcp.lexsocket.ai` — trouve ; TenderAI répond |

**Répartition :** LexSocket = trouver · TenderAI = répondre. Pas de recouvrement.  
**Xacta** : **retiré du NUC** le 2026-09-04. **Comp AI GRC** : **retiré du laptop** 2026-09-06 ; purge NUC/VPS à faire.

---

## Infra transverse

| Brique | Rôle |
|--------|------|
| **Tencent DB** | Une base **par** appli — jamais partagée |
| **MinIO** | Stockage objet documents / rapports |
| **n8n** | **En attente** — seulement si un test Eve réel montre un trou sur tâches répétitives / déterministes |
| **Memory (`tdai-*`)** | Hub mémoire agents — à brancher sur Eve |

---

## Principes d’intégration (non négociables)

1. **Un seul cerveau : Eve** — jamais deux agents concurrents sur le même périmètre.  
2. **Eve pull** — rien ne pousse directement dans le CRM (hors intake public contrôlé vitrine → API publique).  
3. **MCP natif d’abord** (TenderAI, LexSocket) ; sinon tool REST au fil du besoin réel.  
4. **Pas de DB partagée** — jonction uniquement par appel.  
5. **Pas de fusion** des monorepos apps (Option D).  
6. **Copy vitrine** : pas de jargon cockpit / Deal / Eve / DocType (règle marketing).

---

## Chantiers par priorité

1. Configurer `GSMS_CRM_API_URL` + `GSMS_PUBLIC_API_KEY` (InvoicePilot → CRM) — fil intake manquant.  
2. Eve → client MCP **TenderAI**.  
3. Eve → **LexSocket** (recherche AO).  
4. Eve → **GRACE** (tool REST).  
5. Décider du sort du « Cockpit missions » InvoicePilot : retirer, ou le faire lire l’API CRM (plus le store mémoire).  
6. Test réel d’un agent Eve sur tâche répétitive **avant** de trancher n8n.  
7. **Comp AI** — seulement si besoin cyber confirmé.  
8. **QAtrial** — CAPA en bout de circuit.  
9. Domaine site vitrine dans Tracking & Analytics CRM — encore à enregistrer.

**Détail Eve / pages agentic / DealFact :** [`EVE-CRM-CAPABILITES-ET-CHANTIERS.md`](./EVE-CRM-CAPABILITES-ET-CHANTIERS.md)  
(OpenClaw ≠ remplacement Eve ; Option A gabarit + données sur Deal ; ContactFact existe, DealFact à porter.)

---

## Cartographie rapide des chemins repo

| Brique | Path |
|--------|------|
| Vitrine + portail | `apps/InvoicePilot-AI` |
| CRM + Eve | `apps/crm` |
| Comp AI GRC | `apps/comp` |
| GRACE | `apps/grace` |
| QAtrial | `apps/qatrial` |
| TenderAI MCP Max | `apps/tenderai-mcp-server-max` (NUC `/opt/gsms/...`) |

État NUC (ops, peut différer) : [`GSMS_STACK_STATUS.md`](./GSMS_STACK_STATUS.md).

---

## Docs historiques

| Doc | Statut |
|-----|--------|
| `ARCHITECTURE.md` | Aligné / renvoie ici — ne plus traiter comme source si conflit |
| `DOCTRINE.md` | Interdits + HOW/WHAT inchangés ; circuit §2 → ce fichier |
| `AIINVOICEPILOT_CRM_INTEGRATION_DECISION.md` | Option D **confirmée** ; détail chantier |
| `GSMS_CORE_ADAPTATION.md` | **Ne pas** lire comme « InvoicePilot = Core » — Core = CRM |
| Inventaires / matrices 2026-09-03 | Archive utile ; rôles Xacta-centrés = obsolètes pour le lab |
