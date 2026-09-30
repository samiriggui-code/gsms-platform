# GSMS Core — DocTypes (composition plateforme)

> **2026-09-04 :** les DocTypes décrits ici vivent surtout dans InvoicePilot `src/server/core/` (**store mémoire**).  
> Ce n’est **pas** la source de vérité CRM. Cockpit ops = Comp CRM.  
> Canon : [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md) (chantier #5 = retirer ou brancher ce cockpit sur l’API CRM).


**Date :** 2026-09-03 (élargi)  
**Leçon d’archi (pas l’app) :** règles circuit **serveur**, pas dans les pages React — on a payé ça sur un autre chantier ; **GSMS School n’est pas dans la plateforme** (app indépendante, hors circuit).  
**Portée :** du **site vitrine** jusqu’à **TencentDB Agent Memory** — pas seulement Mission ↔ Xacta.  
**Formation :** si l’audit recommande une formation → **rapport + plan de formation uniquement**. Pas d’appel School, pas de DocType OF/Qualiopi, pas d’inscription auto.

Réfs : [`ARCHITECTURE.md`](./ARCHITECTURE.md) §9 · [`ARCHITECTURE-COMPLEMENT-TENCENT-INVOICEPILOT.md`](./ARCHITECTURE-COMPLEMENT-TENCENT-INVOICEPILOT.md) · [`GSMS_TENCENT_MEMORY_MAP.md`](./GSMS_TENCENT_MEMORY_MAP.md) · [`TENDER_SEARCH_AND_DELIVERABLES.md`](./TENDER_SEARCH_AND_DELIVERABLES.md)

---

## 1. Composition à tenir dans le modèle

```text
VITRINE (IP marketing)
    │  IntakeRequest (form contact / audit / AO + pièces meta)
    ▼
CRM Comp (Postgres)          ← vérité commerciale
    │  Company · Contact · Deal  (ids seulement côté Core)
    ▼
CORE DocTypes                 ← vérité de circuit / cockpit
    │  Mission · bindings · snapshots · agent runs
    ▼
EVE + Agents                  ← orchestration (AgentTask ids)
    │
    ├── Tender MCP / LexSocket (veille)
    ├── Xacta ↕ Grace → QAtrial
    └── …
    ↕
TENCENT Agent Memory          ← contexte agents (scopes), JAMAIS vérité métier
```

Le DocType Core **référence** chaque couche. Il **ne remplace** aucune DB métier et **n’utilise pas** Tencent comme bus.

---

## 2. Qui porte quelle vérité

| Couche | Porte | Core DocType stocke |
|--------|-------|---------------------|
| Vitrine | UX publique, formulaires | `IntakeRequest` (ou id + payload résumé) → lien vers Deal |
| CRM | Company, Contact, Deal, Activity | `crmDealId`, `crmCompanyId`, `crmContactId` |
| Core | circuit mission, cartes UI, deep links | `Mission`, `AppBinding`, `AppSnapshot`, `AgentRunRef` |
| Apps | findings, CAPA, RFP parsés, DOCX | `externalId` + `deepLink` + snapshot **léger** |
| Eve | AgentTask, schedules, rechecks | `eveTaskId` / dernier run |
| Tencent | preference, context, observation… | `memoryScope` keys **uniquement** — pas le contenu comme fait |

---

## 3. DocTypes (registre)

### v0 — à coder en premier (gates UI)

| DocType | Champs clés | Règles |
|---------|-------------|--------|
| **Mission** | `kind`: `AUDIT` \| `AO` \| `OTHER` · `status` · `auditType?` · `origin`: `VITRINE` \| `VEILLE` \| `CRM` \| `INTERNAL` · `crmDealId` · `crmCompanyId?` · `intakeRequestId?` · `title` | Un `AUDIT` n’expose pas PA e-facture. Un `AO` exige binding Tender (éventuellement LexSocket en veille). |
| **AppBinding** | `missionId` · `app`: `XACTA` \| `GRACE` \| `QATRIAL` \| `TENDER` \| `LEXSOCKET` · `externalId` · `deepLink?` · `role`: `PRIMARY` \| `SUPPORT` \| `DISCOVERY` | Pas de findings ici. LEXSOCKET = découverte seulement. |
| **AppSnapshot** | `bindingId` · `status` · `metrics` (JSON borné) · `fetchedAt` | Cache UI / carte. **Pas** truth. Invalidable. |

### v0.5 — même sprint si possible (sinon juste après)

| DocType | Rôle |
|---------|------|
| **IntakeRequest** | Trace vitrine → CRM : `channel` `CONTACT` \| `AUDIT_REQUEST` \| `TENDER_REQUEST` · `publicExternalId` · `crmDealId?` · `payloadSummary` · `attachmentMeta[]` (noms/types/tailles, pas blobs métier dans Core long-terme) · `receivedAt` |
| **AgentRunRef** | Lien Eve : `missionId` · `agent`: `CRM` \| `TENDER` \| `AUDIT` · `eveTaskId` · `status` · `startedAt` / `finishedAt?` · `resultSummary?` |

### v1 — mémoire (référence, pas dump)

| DocType | Rôle |
|---------|------|
| **MemoryScopeRef** | `missionId?` · `crmCompanyId?` · `agent?` · `scopeKey` (ex. `mission:AUD-042`) · `hub` hint | Permet à Eve/tools de **lire/écrire** Tencent au bon scope. **Interdit** : stocker `official_status`, risk score, CAPA closure dans Core *ou* Tencent comme vérité. |

Pas de DocType « TencentMemoryRow » dans Core : le contenu vit dans `tdai-*`.

---

## 4. Règles circuit (tests `test:doctype`)

1. **Origin vitrine** → `IntakeRequest` créé avant ou avec Deal ; Mission `origin=VITRINE` + `intakeRequestId` + `crmDealId`.
2. **Origin veille** → Mission `origin=VEILLE` + binding `LEXSOCKET` (optionnel) puis `TENDER` ; Deal CRM quand on « ouvre dossier ».
3. **AUDIT** → bindings autorisés : XACTA, GRACE, QATRIAL. Pas TENDER sauf mission liée post-AO gagné (kind peut rester AO ou basculer / lier).
4. **AO** → binding TENDER requis pour exécution ; LEXSOCKET seulement en phase découverte.
5. **Core n’écrit jamais** finding Xacta / CAPA / DOCX dans sa DB comme source.
6. **Eve consomme** ResourceService (mêmes DocTypes) — pas l’UI React.
7. **Tencent** : write = proposal/context via agent ; mutation métier = app uniquement. Flux interdit : `Vitrine → Tencent → CRM`.
8. **E-facture** InvoicePilot hors de ces DocTypes (nav archivée, code conservé).
9. **School exclu** — aucun `AppBinding` `SCHOOL`, aucun agent formation branché. Besoin formation = livrable texte/PDF dans le rapport mission (plan), FIN.

---

## 5. Contrat API BFF (shape mentale)

`GET /api/core/missions/:id` renvoie **une composition**, pas un join SQL des apps :

```ts
{
  mission: Mission,
  intake?: IntakeRequest,
  crm: { dealId, companyId?, contactId?, dealDeepLink },
  bindings: AppBinding[],
  snapshots: AppSnapshot[],
  agentRuns: AgentRunRef[],
  memory: { scopes: MemoryScopeRef[] },  // ids de scope, pas les souvenirs
  cards: [ /* dérivé serveur selon kind */ ]
}
```

Front = client HTTP. Zéro « si audit alors Xacta » dans un loader.

---

## 6. Tuyauterie bout-en-bout

```text
Vitrine form
  → POST /api/public/* (CRM adapter)
  → Company + Contact + Deal (+ RecordSource / externalId)
  → Eve AgentTask (déjà câblé create)
  → Core crée Mission + IntakeRequest + MemoryScopeRef(mission/client)
  → Agent (Tender|Audit) tools → apps
  → AppSnapshot refresh (BFF / worker)
  → UI Core + carte Deal CRM
  ↕ Tencent (prefs / contexte agent, scoped)
```

---

## 7. Ordre d’implémentation (inchangé en esprit)

1. Zod + tests DocType **Mission / AppBinding / AppSnapshot** (+ règles kind).  
2. `GET /api/core/missions/:id` stub composition.  
3. `IntakeRequest` + branchement adapter public.  
4. `AgentRunRef` quand Agent Tender branché.  
5. `MemoryScopeRef` quand adapter Eve → Hub Tencent prêt (infra déjà UP).

**Gates avant jolie page :** contrat + tests verts + un GET mission. Ensuite `/ao/*` et missions audit.

**Code v0 :** `apps/InvoicePilot-AI/src/server/core/` · `npm run test:doctype` · server fns `fns/core-missions.ts`.

---

## 8. Interdit (rappel)

- Règle métier dans loader React  
- Recopier findings / CAPA / RFP complets dans Prisma Core  
- Tencent comme bus ou comme CRM  
- **Importer / dépendre du code GSMS School** (app hors plateforme)  
- Qualiopi / OF / inscription formation dans ce Core  
- Brancher School « parce que le rapport parle de formation »  
- Nouveau microservice qui refait Eve  
