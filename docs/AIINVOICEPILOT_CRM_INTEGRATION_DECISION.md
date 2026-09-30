# AIInvoicePilot ↔ Comp CRM — Integration Decision

> **2026-09-04 :** Option D **confirmée** et intégrée au [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md).  
> Priorité #1 chantier = config `GSMS_CRM_API_URL` + `GSMS_PUBLIC_API_KEY`.

**Statut :** **GO Option D** — 2026-09-03 (user) · chantier ouvert, pas de fusion monorepos

**Date :** 2026-09-03  
**Statut :** **GO Option D** — 2026-09-03 (user) · chantier ouvert, pas de fusion monorepos  
**Sources :** inventaires code `apps/InvoicePilot-AI` · `apps/crm`

---

## 1. AIInvoicePilot — architecture actuelle

- Vite + React 19 + **TanStack Start**
- Prisma Postgres dédiée (e-facture)
- Auth cookie custom + 2FA
- Marketing riche + back-office SaaS facturation
- Pas de Lead/Opportunity ; `ContactMessage` pour contact

## 2. Comp CRM — architecture actuelle

- Turborepo Bun : **Next.js** app + **NestJS/tRPC** API + **eve** agent
- Prisma : Company, Contact, **Deal**, Activity, Fields, Tracking, Agent*
- Auth **NextAuth** credentials · API keys · pas de signup public
- Eve : tools, skills, `AgentTask`, cron minute, `schedule_recheck`
- Landing marketing optionnelle (`IS_MARKETING`)
- Intake webhook leads : **pas prêt**

## 3. Compatibilité stacks

| | InvoicePilot | Comp CRM |
|--|--------------|----------|
| Framework | TanStack Start / Vite | Next App Router |
| API style | Server fns + `/api/v1` | tRPC + REST bridge |
| Auth | Custom cookies | NextAuth JWT |
| Package mgr | npm/bun mix | Bun monorepo |

**Fusion profonde des codebases = haut risque** (dépendances, upgrades upstream Comp AI, Eve).

## 4–6. Chevauchements / uniques

| | |
|--|--|
| Overlap | Clients/companies, contact capture, dashboards, auth users |
| Unique IP | Landing e-facture, PA, invoices, Stripe SaaS, Anthropic extract |
| Unique CRM | Deals, Eve, enrichment, mail sync, tracking, agent queue |

## 7. APIs CRM réellement disponibles

| Capability | Status |
|------------|--------|
| companies/contacts/deals CRUD | **EXISTS** (tRPC, auth session ou `x-api-key`) |
| activities | EXISTS |
| public tracking `/api/t/*` | **EXTERNAL READY** |
| public lead intake | **PARTIEL** — capture contact simple via tracking (`POST /api/t/e` `@AllowAnonymous` → Contact+Company `RecordSource.TRACKING` → Eve) si domaine allowlisté ; **MANQUANT** pour flux enrichis (audit / AO + pièces) → adapters `POST /api/public/*` |
| webhooks ingress | **MISSING** (enum only) |
| Eve dispatch | **INTERNAL ONLY** (`AGENT_BRIDGE_SECRET`) — auth bridge interne, mais **déclenchement déjà câblé** à la création Contact / Company / Deal (`AgentTriggerService` → `agentTask` + poke immédiat ; cron `* * * * *` en filet). Pas de nouveau bus d’événements à construire pour Option D. |
| OpenAPI `/rest/*` | EXISTS for authed surface |

## 8–9. Auth

Deux systèmes. Cible : login public → **CRM**. Pas de SSO improvisé multi-apps tout de suite.  
InvoicePilot signup SaaS → **REMOVE** pour façade GSMS.

## 10. Modèles concernés

Owner CRM : Company, Contact, Deal (+ Activity).  
Mission/Project/Document refs apps : **à ajouter côté CRM** (pas dans IP).  
IP peut garder DB technique (session, draft, rate-limit) — pas Lead métier.

---

## 11–14. Options

### OPTION A — Fusion contrôlée

Mettre le public dans le repo CRM / même Next app.

| Critère | Note |
|---------|------|
| Complexité | Haute (réécrire landing TanStack → Next) |
| Couplage | Fort |
| Auth | Plus simple si unifié |
| Réutilisation UI IP | Faible sans portage |
| Maintenance upstream Comp | Difficile |
| Impact Eve | Risque si gros merge |
| Verdict | **Non recommandé maintenant** |

### OPTION B — Front public séparé + API CRM

IP reste app ; forms → adapter → CRM tRPC/API key.

| Critère | Note |
|---------|------|
| Complexité | Moyenne |
| Couplage | Faible |
| Auth | Redirect login CRM |
| Réutilisation | **Max** (landing/composants IP) |
| Upstream CRM | Intact |
| Eve | Intact |
| Verdict | **Forte candidate** |

### OPTION C — API + events/webhooks

Comme B + webhooks CRM→IP pour notifs.

| Critère | Note |
|---------|------|
| Valeur | Faible au début (IP n’a pas besoin du retour deal) |
| Verdict | **Secondaire** — webhooks plus tard si besoin async |

### OPTION D — Hybride (recommandé)

```text
PUBLIC UI (InvoicePilot refondu, TanStack)
        │
        │ HTTPS → Public Adapter (petit, rate-limit)
        ▼
COMP CRM (Nest tRPC + NextAuth)
        │
       EVE ↕ TENCENT
```

- **KEEP** landing, layouts marketing, composants UI, formulaires (réécrits GSMS).
- **CONNECT** forms → `POST /api/public/*` → services CRM existants.
- **ARCHIVE** back-office e-facture, Stripe produit, PA, invoices UI.
- **REMOVE** vérité commerciale IP.
- **MOVE** éventuellement quelques composants premium vers CRM **seulement** s’ils valent le portage Next.
- **EVENTS** : CRM→Eve déjà là ; pas besoin IP↔webhook pour MVP.

---

## 15. Comparaison courte

| | A Fusion | B API | C Events | **D Hybride** |
|--|----------|-------|----------|---------------|
| Simplicité MVP | ✗ | ✓ | ~ | **✓✓** |
| Upstream Comp | ✗ | ✓ | ✓ | **✓** |
| Réuse IP marketing | ✗ portage | ✓ | ✓ | **✓** |
| Double CRM | risque | évitable | évitable | **évité** |
| Eve safe | risque | ✓ | ✓ | **✓** |

## 16. RECOMMANDATION

**OPTION D (hybride) biaisée Option B.**

1. Refondre AIInvoicePilot en **GSMS Public** (rebrand, pages services/audit/AO/contact/login).
2. Ajouter une **couche publique mince** côté CRM (ou BFF) : `leads` / `audit-request` / `tender-request` → Company+Contact+Deal.
3. Login = redirection vers Comp CRM authentifié.
4. Ne pas fusionner les monorepos.
5. Ne pas utiliser Tencent comme bus.
6. Eve gère qualification / rechecks dès Deal créé.
7. Mission cockpit CRM = chantier **séparé** (modèles manquants).

## 17. Schéma cible

```text
www (Public IP) ──API public──► Comp CRM ──► Eve ↕ Tencent
                     │
                     └── Deal/Company/Contact (truth)
Login ─────────────────────────► app CRM
```

## 18–20. KEEP / MOVE / REMOVE

| KEEP (IP) | CONNECT | ARCHIVE / REMOVE (façade) |
|-----------|---------|---------------------------|
| `_marketing`, landing, UI kits | contact → CRM | `_app` invoices, PA, compliance, billing Stripe, signup SaaS |
| assets, animations utiles | audit/AO forms → CRM | Counterparty as business truth |
| | login → CRM | dual Lead DB |

## 21. Adapters nécessaires

1. `POST /api/public/contact`
2. `POST /api/public/audit-request`
3. `POST /api/public/tender-request` (+ upload meta)
4. Rate limit / honeypot / CORS
5. (Plus tard) summary sync Xacta/Grace/QAtrial → CRM mission card

**Prérequis technique CRM (petite migration Prisma, avant branchement adapters) :**
- Étendre `RecordSource` (aujourd’hui : `MANUAL, IMPORT, EMAIL, CALENDAR, TRACKING`) — pas de valeur `FORM` / `API` / `EXTERNAL` pour marquer « vient d’AIInvoicePilot / GSMS Public ».
- Ajouter sur `Contact` / `Company` / `Deal` un couple `externalId` + `sourceSystem` (ou équivalent) pour réconciliation avec l’enregistrement côté façade publique. Aucun de ces champs n’existe aujourd’hui sur ces modèles (le `externalId` existant est ailleurs, ex. calendrier/mail).

## 22. Risques

- Inventer Mission sans design CRM → scope creep
- Garder Stripe/PA « au cas où » → confusion produit
- Fusion forcée TanStack↔Next → months perdues
- Brancher Tencent trop tôt en écriture métier
- **CRM mono-tenant en dur** : `WORKSPACE_ID` constant (`packages/db/src/workspace`) ; `Company` / `Contact` / `Deal` sans colonne `organizationId` / `workspaceId`. `Organization` / `Member` = rôles humains, pas isolation de données. OK tant que Comp CRM = CRM interne agence GSMS (Company = client externe). Bloquant si un jour plusieurs tenants cloisonnés sur le même déploiement.

## 23. Plan de migration (après GO)

1. Validation ce doc  
2. Spec pages publiques GSMS (mock §30 architecture)  
3. Implémenter adapters CRM publics  
4. Rebrand IP marketing → GSMS (copy métier, pas noms moteurs)  
5. Brancher forms → CRM → Eve  
6. Redirect login  
7. Archive routes `_app` produit e-facture (feature flag / remove deploy)  
8. Ensuite seulement : Mission cockpit + app summaries  

---

## Proposition structure frontend public (non implémentée)

```text
/
├── Home
├── Services (Audit · Évaluation · Risque · CAPA · AO)
├── Expertise · Methodology · About
├── Contact
├── Request Audit
├── Submit Tender
└── Login → CRM
```

Client achète **services**, pas les noms Xacta/Grace/QAtrial (optionnellement invisibles).
