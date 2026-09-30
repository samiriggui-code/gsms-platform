# GSMS CRM Capability Map

> **2026-09-04 :** archive utile. Canon = [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md). Cockpit = Comp CRM.

**Date :** 2026-09-03  
**CRM path :** `apps/crm` (trycompai/crm fork)  
**Compare :** AIInvoicePilot vs Comp CRM

---

## 1. Comp CRM — ce qui existe vraiment

| Capability | Owner | Existe ? | Surface |
|------------|-------|----------|---------|
| Company | CRM | YES | tRPC `companies` |
| Contact | CRM | YES | tRPC `contacts` |
| Deal (= opportunity) | CRM | YES | tRPC `deals` |
| Lead (modèle) | — | **NO** | custom fields « Lead source » seulement |
| Project / Mission | — | **NO** | à créer pour cockpit GSMS |
| Document métier | — | **NO** | Activity notes · attachments conversation |
| Activities / tasks | CRM | YES | tRPC `activities` |
| Custom fields | CRM | YES | `fields` |
| Dashboard | CRM | YES | `dashboard` |
| Mail sync | CRM | YES | Google/Microsoft |
| Website tracking | CRM | YES | **public** `GET/POST /api/t/*` · `FormSubmission` · allowlist domaine (`addDomain`) |
| Public lead intake (simple) | CRM | **PARTIEL** | tracking `POST /api/t/e` → Contact+Company `TRACKING` → Eve ; pas d’upload docs |
| Public lead intake (enrichi) | PublicModule | **PARTIEL** | `POST /api/public/tender-request` livré ; `audit-request` / `contact` encore à faire |
| Intake webhook leads | CRM | **STUB** | settings UI « not available yet » |
| Webhook HTTP ingress | CRM | **NO** | enum `AgentTriggerType.WEBHOOK` sans receiver |
| Auth | CRM | YES | NextAuth credentials · no public signup · API keys |
| Eve agents | CRM/agent | YES | tools, skills, `AgentTask`, schedule `* * * * *`, `schedule_recheck` · auto-trigger à création Contact/Company/Deal |
| Tenant isolation (données) | CRM | **NO** | mono-tenant : `WORKSPACE_ID` hardcodé ; pas de `workspaceId` sur Company/Contact/Deal |
| `RecordSource` API/FORM | CRM | **NO** | enum = MANUAL/IMPORT/EMAIL/CALENDAR/TRACKING seulement |
| Marketing landing | CRM | OPTIONAL | `IS_MARKETING=true` |
| Cockpit Xacta/Grace/QAtrial summaries | — | **NO** | à définir après APIs apps |

---

## 2. InvoicePilot vs CRM (doublons)

| Capability | InvoicePilot | Comp CRM | Owner cible | Action |
|------------|--------------|----------|-------------|--------|
| Landing marketing | Riche (e-facture) | Landing légère optionnelle | **Public IP refondu** | KEEP/REBRAND IP · ne pas dual-site |
| Contact / lead capture | `ContactMessage` | `FormSubmission` + Contact/Company | **CRM** | CONNECT IP → CRM |
| Clients / companies | `Counterparty` | `Company` | **CRM** | IP ne garde pas la vérité |
| Invoices e-facture | Full | Absent | ARCHIVE IP (hors façade) | — |
| Auth | Custom | NextAuth | **CRM platform** | Login public → CRM |
| Dashboard ops | Full SaaS | Full CRM | **CRM** | IP back-office hors façade |
| Relances / rechecks | Non | Eve `schedule_recheck` | **Eve** | Ne rien coder |
| Mémoire agent | AiConversation locale | Eve + **Tencent** (cible) | **Tencent** | Pas AiConversation IP |

---

## 3. Trous CRM pour le cockpit GSMS (pas encore là)

| Besoin architecture | Status |
|---------------------|--------|
| Mission / Project object | MISSING |
| App summary cards (Xacta/Grace/QAtrial) | MISSING |
| `source_system` / `deep_link` refs | MISSING |
| Public `POST /api/public/leads` (enrichi) | MISSING (adapter à créer) — tracking simple = PARTIEL |
| `externalId` / `sourceSystem` sur Company/Contact/Deal | MISSING (prérequis adapters publics) |
| Document intake mission | MISSING / partial attachments |
| Training needs (rapport only) | MISSING field/section |
| Multi-tenant data isolation | MISSING by design (mono-workspace) |

Ces trous = travail CRM **après** validation — pas dans InvoicePilot.
