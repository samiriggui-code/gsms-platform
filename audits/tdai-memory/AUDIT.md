# Audit — TencentDB Agent Memory (`apps/tdai-memory-agents`)

**Date :** 2026-10-02 · **Décision V2 :** KEEP séparé — mémoire de **contexte** pour Eve, jamais source de vérité, jamais bus d'intégration

## Identité
- **Contenu du dossier :** uniquement l'outillage client du projet Tencent « TencentDB Agent Memory » :
  - `asset-import.ts` (2 692 lignes) : import de skills, mémoires et sessions ;
  - `setup-proxy.sh` (1 187 lignes) ;
  - README par client (claude-code, codex, opencode, openclaw…).
- **Licence :** ⚠ aucune, et pas d'URL upstream.
- **Serveur hors repo :** `/opt/jarvis/TencentDB-Agent-Memory` sur le NUC (core `:8420`, hub `:8125`, proxy `:8096`), copie VPS (`hub.` / `memory.global-it-ss.com`).
- **Interfaces :**
  - proxy LLM `POST /<agent>/<spaceId>/v1/{messages,responses,chat/completions}` avec injection de mémoire L2/L3 ;
  - panel REST `/api/v1/*` (`auth/verify`, `agent/*`, `chat-memory/import`, `skill/*`), clé `sk-mem-…`.

## Règles (inchangées, confirmées en V2)
- **Types de mémoire :** `preference`, `context`, `observation`, `working_memory`, `prior_decision`, `workflow_pattern`.
- **Écriture en mode « proposal » uniquement.**
- **Le Core ne lit jamais Tencent comme une donnée métier.** Seul Eve s'en sert pour le contexte conversationnel.
- **Interdits :**
  - vitrine → Tencent → CRM ;
  - Tencent comme passerelle ou bus de synchronisation.

## Actions V2
1. Brancher Eve → Hub (adaptateur côté `apps/crm/apps/agent`) ; journaliser les écritures.
2. Documenter le déploiement serveur dans `docs/ops/` le jour où il est versionné.
3. Clarifier la licence avant toute redistribution.
