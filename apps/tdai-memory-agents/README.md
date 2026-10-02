# tdai-memory-agents — outillage TencentDB Agent Memory

Outillage **client** de la mémoire d'agents Tencent utilisée par Eve : `asset-import.ts` (import de skills, mémoires et sessions), `setup-proxy.sh` (configuration du proxy mémoire), et un guide par client (`claude-code/`, `codex/`, `opencode/`…).

Le serveur (core, hub, proxy) n'est **pas** dans ce dépôt : il tourne sur le NUC (`/opt/jarvis/TencentDB-Agent-Memory`) et sur le VPS (`hub.` / `memory.global-it-ss.com`).

**Règle GSMS :** mémoire de **contexte** uniquement, jamais source de vérité, jamais bus d'intégration. Voir [`../../audits/tdai-memory/AUDIT.md`](../../audits/tdai-memory/AUDIT.md).

⚠ Aucune licence ni URL amont dans ce dossier : à clarifier avant toute redistribution.
