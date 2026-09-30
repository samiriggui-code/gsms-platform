# GSMS Integration Map

> **2026-09-04 :** discovery 2026-09-03. Canon Eve/MCP/REST = [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md). Lignes Xacta = héritage NUC, pas cible lab portable.

**Date :** 2026-09-03  
**Statut :** discovery — adapters non écrits

Format : `SOURCE → EVENT → OWNER → DESTINATION → API/TOOL → DATA → RESPONSE → CRM SUMMARY → MEMORY IMPACT`

---

## A. Entrées publiques (cible)

| SOURCE | EVENT | OWNER | DESTINATION | API/TOOL | DATA | RESPONSE | CRM SUMMARY | MEMORY |
|--------|-------|-------|-------------|----------|------|----------|-------------|--------|
| GSMS Public (IP) | `contact_submitted` | CRM | Comp CRM | **À créer** `POST /api/public/contact` ou adapter → tRPC + API key | name, email, message | `contact_id` / `activity_id` | Activity + optional Contact | none |
| GSMS Public | `audit_request` | CRM | Comp CRM | **EXISTS** (vérifié 2026-09-05) `POST /api/public/audit-request` (`public-intake.service.ts` → délègue à `tenderRequest()`) | company, sites, scope, docs | `deal_id` | Deal + Company + Contact | none initially |
| GSMS Public | `tender_request` | CRM | Comp CRM | **EXISTS** `POST /api/public/tender-request` (`x-gsms-public-key` / `GSMS_PUBLIC_API_KEY`) → Company+Contact+Deal `RecordSource.FORM` + `sourceSystem=gsms-public` + `externalId` · Eve via `deal.created` / `contact.created` | RFP meta | `deal_id` | Deal tagged `[AO]` | none |
| Marketing site (CRM flag) | tracking / form | CRM | CRM | **EXISTS** `/api/t/e`, `FormSubmission` | events, form fields | 204 / filed | may create Contact | none |

## B. Orchestration Eve

| SOURCE | EVENT | OWNER | DESTINATION | API/TOOL | DATA | RESPONSE | CRM SUMMARY | MEMORY |
|--------|-------|-------|-------------|----------|------|----------|-------------|--------|
| CRM | `deal.created` / stage | Eve | Agent CRM | **EXISTS** `AgentTriggerService` → `AgentTask` | deal id | task claimed | Activity | optional context write Tencent |
| Agent CRM | follow-up due | Eve | Agent CRM | **EXISTS** `schedule_recheck` | dueAt, reason | future task | Activity | recall prior prefs |
| CRM | `audit_started` | Eve | Audit Agent | **À brancher** | mission context | status | Agent Activity | mission scope Tencent |
| Audit Agent | need terrain | Agent | Grace | **À définir** handoff API | assessment payload | assessment id | Grace summary | observation |
| Grace | terrain done | Agent | Xacta | **À définir** | results | risk scenarios | Xacta metrics | update context |
| Xacta | CAPA needed | Agent | QAtrial | **À définir** | findings | capa ids | CAPA metrics | — |
| Apps | status sync | Core | CRM | **À créer** summary upsert | status, metrics, deep_link | ok | Mission card | not truth |

## C. Interdits

| Anti-pattern | Pourquoi |
|--------------|----------|
| IP → Tencent → CRM | Tencent ≠ bus / ≠ business truth |
| IP DB Lead sync CRM Lead | double vérité |
| n8n pour recheck | Eve déjà capable |
| Worker qui « décide » | Eve décide, Worker transporte |

---

## APIs CRM réellement utilisables aujourd’hui

| Surface | Auth | Ready for public façade? |
|---------|------|--------------------------|
| tRPC `/api/trpc/*` | Session JWT ou `x-api-key` | **INTERNAL READY** — adapter public nécessaire |
| REST `/rest/*` + OpenAPI | Same | INTERNAL READY |
| `/api/t/*` tracking | Public | YES (analytics/forms) |
| `/health` | Public | YES |
| Intake webhook product | — | **MISSING** |
| Eve bridge `/internal/crm/dispatch` | `AGENT_BRIDGE_SECRET` | INTERNAL ONLY |
