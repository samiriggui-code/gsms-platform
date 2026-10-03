# Audit contexte métier / workspace GSMS — Phase 1

**Date :** 2026-10-03  
**Branche :** `cursor/gsms-core-context-authority-74cc`  
**Priorité :** architecture N°1 (pas un bug de header)

## Verdict

Le symptôme `X-GSMS-Workspace-Id` manquant révèle une **absence d’autorité contextuelle unique**.  
Core possède déjà `Organization` / `Site` / `Workspace` / `Mission`, mais :

- aucune API de création d’engagement → workspace déterministe ;
- DocuLens / CRM / QAtrial / GRACE portent chacun un autre sens de « workspace » ;
- le frontend retombe sur `workspaces[0]` ou un UUID hardcodé ;
- Core **ne lit pas** le header workspace (scope path `{ws}`) alors que DocuLens l’exige.

**Règle cible :** une prestation GSMS = un engagement = un workspace Core = N apps liées via bindings.

---

## Réponses aux 16 questions

### 1. Qui crée actuellement le workspace ?

| Acteur | Crée ? | Preuve |
|---|---|---|
| Core | Seed démo uniquement (`seed_demo.py`) — **pas d’API create** | `identity/router.py` : list / login / switch |
| DocuLens | Non | UUID opaque + default env |
| CRM | Singleton `Organization.id = "workspace"` | `apps/crm/packages/db/src/workspace.ts` |
| QAtrial | À l’inscription / SSO | propre hiérarchie Org→Workspace→Project |
| Frontend web | Non — sélection cookie / JWT | `apps/web/lib/core/client.ts` |

### 2. Où est-il persisté ?

- **Canonique :** `identity_workspace` — `apps/core/gsms_core/identity/models.py`
- Concurrent : Tenant Core Prisma, CRM `Organization`, QAtrial `Workspace`, DocuLens JSONB `events.data.workspace_id`

### 3. DocuLens a-t-il son propre workspace ?

**Non** (pas de table Workspace). Isolation via string UUID + colonne nullable `document_labels.workspace_id`.

### 4. Le Core a-t-il déjà une entité Workspace ?

**Oui.** `Workspace` lié à `organization_id` + `site_id`, kinds PERMANENT/TEMPORARY, `created_from_mission_id`.

### 5. Modèles concurrents ?

Oui — Core (site), DocuLens (UUID), CRM (singleton instance), QAtrial (project container), GRACE (aucun, `GSMS_CLIENT_ID`).

### 6. Comment le frontend récupère le workspace courant ?

`apps/web` : cookie `gsms_ws` → sinon `me.workspace_id` → sinon **`me.workspaces[0]`** (dangereux).  
DocuLens UI : localStorage + UUID hardcodé + Settings paste.

### 7. Pourquoi `X-GSMS-Workspace-Id` manque ?

Chaîne : cookie/JWT absents → `coreFetch` n’envoie le header que si `workspaceId` truthy → Core ignore le header (path) → DocuLens exige header/claim → 400.  
Appels API key DocuLens sans header + default vide → 400 ; avec default → faux succès.

### 8. Quelles routes exigent le header ?

- **DocuLens** `/events/*` sécurisés : oui (`get_workspace_id` / `resolve_workspace_id`)
- **Core** : non — path `/workspaces/{ws}/…` + membership DB
- **Web** : envoie opportuniste, n’exige pas côté serveur

### 9. Fallback dangereux ?

Oui : `workspaces[0]` (web + login Core), `DOCULENS_DEFAULT_WORKSPACE_ID` / UUID `a000…0001`, CRM `"workspace"`, QAtrial `findFirst`.

### 10. Default site/workspace = métier ou rustine ?

**Rustine / transition** — commentaires DocuLens + handoff. Seed Core Lyon/Paris = démo réelle, pas le default singleton.

### 11. Multi-sites ?

Core oui (N workspaces / org). Web switcher oui. DocuLens filtre string. CRM/GRACE mono.

### 12. Multi-prestations ?

Pas d’entité `Engagement`. Plus proche : Core `Mission` (types AUDIT, COMMISSION_SECURITE, APPEL_OFFRES…). CRM Deal + `[GSMS_INTAKE]` dans description. DocuLens « prestations » = taxonomie labels UI.

### 13. DocuLens rattache les documents comment ?

`attach_workspace` injecte `workspace_id` dans le JSON event ; listes filtrent `data->>'workspace_id'` ; notify Core HMAC avec body `workspace_id`.

### 14. Tender ?

`TenderCase.workspace_id` + `mission_id` (Core). TenderAI Max SQLite : pas de `workspace_id` GSMS.

### 15. GRACE / QATrial ?

Findings stampent `client_id` env. Core connectors envoient headers ; apps les ignorent souvent pour le scope. Liens via `ExternalReference` / `FindingRef`.

### 16. CRM Eve ?

Tout sous `Organization.id = "workspace"`. Pas de `workspace_id` / `mission_id` Core sur Contact/Task. Eve ≠ orchestrateur engagement.

---

## Inventaire registries

| Composant | État |
|---|---|
| ClientRegistry | Absent (Organization ≈ client) |
| ContactRegistry | Absent |
| SiteRegistry | Absent (table Site existe) |
| EngagementManager | Absent (Mission ≈ engagement) |
| WorkspaceManager | **À créer** (UI QAtrial homonyme ≠ plateforme) |
| ApplicationRegistry | **À créer** |
| ContextResolver | **À créer** |
| EventBus | Présent (`events/bus.py`) |
| WorkflowEngine | Présent (`workflows/engine.py`) |

## Hiérarchie cible vs aujourd’hui

```
Cible: Tenant → Client → Contact → Site → Engagement → Workspace → Apps
Aujourd’hui: (pas Tenant) → Organization → (Contact CRM only) → Site → Mission → Workspace
             Apps en silos avec bindings faibles / ExternalReference
```

## Interdits (Phase 1+)

- Ne pas « réparer » avec un default workspace / first available en prod.
- Une prestation → workspace **déterministe** créé par Core.
- DocuLens workspace ≠ workspace GSMS ; mapping via `workspace_application_bindings`.
- Eve ne devient pas une plateforme parallèle au Core.
