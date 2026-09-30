# Adapter InvoicePilot → façade GSMS (historique)

> **2026-09-04 — ATTENTION :** ce doc date d’une phase où l’on explorait un « Core » dans InvoicePilot.  
> **Canon actuel :** Core / cockpit = **Comp AI CRM** (`apps/crm`), pas InvoicePilot.  
> InvoicePilot = vitrine + portail. Voir [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md).  
> Ne pas appliquer ce document comme plan pour faire d’InvoicePilot le CRM.

**Date d’origine :** 2026-09-03  

**Date :** 2026-09-03  
**Canvas :** plan visuel dans Cursor canvases `gsms-core-adaptation`  
**Apps analysées :** Xacta, Grace, QAtrial, Tender MCP (NUC)

---

## Analogues (web)

| Pattern | Projet / texte | Ce qu’on en prend |
|---------|----------------|-------------------|
| BFF | [Sam Newman — Backends For Frontends](https://samnewman.io/patterns/architectural/bff/) · [Orkes / Conductor BFF](https://orkes.io/blog/guide-to-backend-for-frontend) | Un backend pour **cette** UX Core. 1 GET mission = N appels **parallèles**. Réponse **partielle** si une app est down. |
| Catalog + links | [Backstage Software Catalog](https://github.com/backstage/backstage/blob/master/docs/features/software-catalog/descriptor-format.md) | Entité `Mission` + `metadata.links[]`. On ne stocke pas GitHub / Xacta findings. |
| DocType serveur | Frappe/ERPNext (modèle, pas le produit) · School `domains/*/doctypes.ts` | `kind` AUDIT/AO dicte bindings. UI = client. |
| Orchestration lourde | Camunda / Orkes | **Pas maintenant** — Eve fait déjà le dispatch agents. |

---

## Les 4 moteurs (contrat réel)

| App | Comment ça marche | Binder | Core fetch | Lien |
|-----|-------------------|--------|------------|------|
| **Xacta** | Django REST + Knox `Token`. Engagement audit = **entier**. OpenAPI `/api/schema/`. | `engagementId` | `GET /api/audits/engagements/{id}/` | `/audits/engagements/{id}` :3000 |
| **Grace** | Fastify JWT. Assessment **UUID**. Meilleur feed : `GET /api/assessments/:id/circuit-handoff`. NUC via `:3020/api`. | `assessmentId` | summary / handoff | `/assessments/{uuid}` |
| **QAtrial** | Hono JWT, CAPA UUID + **projectId**. Pas de permalink CAPA propre. | `projectId`+`capaId` | `GET /api/capa/:id` | à améliorer (`/capa/:id`) |
| **Tender** | MCP HTTP `:8090` Bearer, 20 tools, pas d’UI. Hors `apps/`. | proposal id | **pas depuis le browser** — Agent Tender | — |

Quatre auths différentes → **service accounts** dans le Core, jamais dans le front.

---

## Adapter InvoicePilot (efficace)

1. **Ne pas** mapper `Invoice` / `Counterparty` / PA vers le circuit.  
2. Extraire (même repo) un module **`server/core`** : DocTypes + BFF `GET /api/core/missions/:id`.  
3. Un fichier adapter par app (anti-corruption). Tender uniquement côté Eve.  
4. `_app` TanStack = cartes sur le DTO. Nav e-facture masquée, code conservé.  
5. CRM Deal pour le commercial ; snapshot Core pour l’écran mission.

Détail DocType : [`GSMS_CORE_DOCTYPE.md`](./GSMS_CORE_DOCTYPE.md).
