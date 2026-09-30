# Récapitulatif Eve / CRM — capacités, pages agentic, chantiers

**Statut :** synthèse figée — 2026-09-04  
**Parent stack :** [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md)  
**Code vérifié :** `apps/crm` (trycompai/crm), couche `apps/agent/agent/` ; patterns Comp AI (`apps/comp`) pour contraste UI.

Document de synthèse : *« Eve remplit-elle ses promesses face à OpenClaw, et que faire si une capacité manque ? »*

---

## 1. Eve vs OpenClaw

**Verdict :** ne pas basculer le cœur CRM vers OpenClaw.

- Les capacités manquantes GSMS (GRACE, TenderAI, LexSocket, conformité) ne sont **natives ni chez Eve ni chez OpenClaw**. Les skills OpenClaw sont génériques — hors métier.
- Le coût de « créer la capacité » est le même dans les deux cas.
- Eve a `agent_builder` pour construire une capacité à partir d’une description NL.
- OpenClaw = rôle **limité** possible (canal externe type WhatsApp via Jarvis), **pas** remplacement du cœur CRM.

**Non résolu :** aucun test Eve **bout-en-bout** réel dans cette stack à ce jour. Le doute ne se tranche que par ce test.

---

## 2. Alternative CRM Next.js plus mature ?

| Projet | Stars | Licence | Verdict |
|--------|-------|---------|---------|
| Twenty | ~56k | AGPL-3.0 | CRM mature, **pas** d’agent type Eve |
| trycompai/crm (en place) | ~9.6k | MIT | Agentic-first, Eve dedans |
| Erxes | ~4k | AGPL | All-in-one, pas agentique ciblé |
| Open Mercato | ~1.7k | MIT | Plus jeune |
| Warpdrive | ~73 | MIT | Trop petit |

**Conclusion :** garder Comp CRM. Twenty imposerait de reconstruire toute la couche agent (même logique que Comp AI vs Xacta).

---

## 3. Architecture Eve (code réel)

Trois agents dans `apps/agent/agent/` :

### A. Agent principal (research / chat cockpit)
~25 tools — recherche/enrichissement, lecture CRM, écriture avec preuve (`record_fact`, `write_brief`…), méta (`schedule_recheck`…).

### B. `agent_runner`
Exécute un agent déployé (`/agents/{id}/run`). Bac à sable : `bash`, `grep`, `glob`, fichiers + `query_crm` / activités + Slack + web + `ask_question` + `todo`.

### C. `agent_builder`
Construit un nouvel agent depuis une description NL (`write_agent_file`, `save_agent_draft`, `inspect_context`).

### Cœur : `schedules/dispatch.ts`
Cron **chaque minute** : sweep faits, drain tâches, queue runs dus, réveil builder/runner en pause.

### Channels
`crm.ts` et `eve.ts`.

---

## 4. Fondations : npm `eve` + Vercel AI SDK

- Package **`eve`** (`^0.29.x`) — pas un cloud propriétaire.
- Sandbox : backends Vercel / **Docker** / microsandbox — sur NUC probablement Docker. `networkPolicy: deny-all` par défaut.
- Du SDK `ai` : gateway multi-modèles, sandbox, AI Elements (surtout côté Comp AI).

---

## 5. UI agentic — deux recettes

### Comp AI (`apps/comp`)
Utilise **ai-elements** + `@ai-sdk/react` / `useChat` — chat **encastré** dans pages métier (policy editor, automation task). Preuve que le modèle « page agentic » existe dans l’écosystème.

### CRM (`apps/crm`)
**N’utilise pas** ai-elements pour Eve. Pattern maison : `eve/client` + `eve/react` (ex. `agent-builder-chat.tsx`).

| App | Recette à copier |
|-----|------------------|
| CRM | `agent-builder-chat.tsx` (`eve/client` + `eve/react`) |
| Comp AI | `policy-ai-assistant.tsx` (`useChat`) |

Le dossier `.agents/skills/ai-elements` = doc skill agent de code, **pas** composants CRM actifs.

---

## 6. Coût

- **Dev :** scaffolding (exemples existants) — tokens outil une fois.
- **Runtime :** appels modèle proportionnels à l’usage ; modèle plus léger possible pour aides rédaction vs orchestration.

---

## 7. « Eve me construit une page »

| Option | Décision |
|--------|----------|
| **A** — gabarit de page codé une fois ; Eve y dépose les données | **À faire** |
| **B** — Eve écrit un nouveau fichier page à chaque demande | **À éviter** (prod sans revue) |

Mécanisme A : Generative UI / tool output structuré → `record_fact` / `write_brief` sur le Deal → fiche Deal affiche la section dédiée.

---

## 8. Persistance

- Gabarit page + Deal Postgres + faits/briefs (+ MinIO fichiers) = **persisté**.
- Seul point fragile connu côté façade : **Cockpit missions InvoicePilot** = store **mémoire** (`server/core/store.ts`) — disparaît au restart. Le Deal CRM n’a pas ce défaut.

---

## 9. Option A aujourd’hui dans le CRM

- **`FactProvenance` / `FactSuggestion`** existent pour **Contact** (`ContactFact`, `trpc.contacts.decideFact`).
- Page Deal (`[dealId]/page.tsx`) **n’importe pas** encore ce pattern.
- Pattern prouvé ; besoin AO/TenderAI sur Deal = **pas câblé**.

---

## 10. Chantiers code CRM (portage, pas invention)

1. Équivalent **`DealFact`** + mutation type `deals.decideFact`.
2. Afficher sur **`[dealId]/page.tsx`**.
3. Page / panneau agentic résultats AO (ou moteurs externes) — pattern `agent-builder-chat.tsx`, **pas** `useChat`.
4. Rendu riche `ToolOutput` (ou maison) selon type de retour moteur.
5. Câbler retour **TenderAI MCP** → `record_fact` / `write_brief` sur le Deal (après Eve client MCP).

---

## 11. Priorité absolue avant de trancher « Eve suffit »

1. Intake vitrine → CRM (`GSMS_CRM_API_*`) — [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md) #1  
2. **Eve → client MCP TenderAI**  
3. **Test réel bout-en-bout** sur un cas AO (ou audit)  
4. Puis seulement : DealFact UI, pages agentic, n8n si trou prouvé  

Sans le test #3, « Eve suffit / ne suffit pas » reste une hypothèse.

---

## Liens

- Stack globale : [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md)  
- Décision IP ↔ CRM : [`AIINVOICEPILOT_CRM_INTEGRATION_DECISION.md`](./AIINVOICEPILOT_CRM_INTEGRATION_DECISION.md)  
- Circuit AO : [`TENDER_SEARCH_AND_DELIVERABLES.md`](./TENDER_SEARCH_AND_DELIVERABLES.md)
