# Audits des briques GSMS Platform

Un dossier par application qui compose la plateforme. Chaque `AUDIT.md` est établi **sur le code réel**, pas sur les docs.
Dernière campagne : **2026-10-02** (base `main@80e7419` + import DocuLens).

| Brique | Dossier app | Rôle V2 | Décision | Licence | Audit |
|---|---|---|---|---|---|
| GSMS Core | `apps/core` | cerveau métier transverse | **NEW** | GSMS | — (naît testé) |
| GSMS Web | `apps/web` | UI unique (landing + plateforme) | **NEW** | GSMS | — |
| CRM + Eve | `apps/crm` | commercial + assistant | KEEP + ADAPT | MIT | [crm/AUDIT.md](./crm/AUDIT.md) |
| GRACE | `apps/grace` | audit terrain sûreté / incendie | KEEP + ADAPT (service) | **AGPL-3.0** | [grace/AUDIT.md](./grace/AUDIT.md) |
| QAtrial | `apps/qatrial` | CAPA formelle / qualité | KEEP + ADAPT (service), revue M+6 | **AGPL-3.0** | [qatrial/AUDIT.md](./qatrial/AUDIT.md) |
| Tenant Core | `apps/tenant-core` | identité + portail (POC) | MERGE INTO CORE (modèle) · EXTRACT UI → web | aucune (GSMS) | [tenant-core/AUDIT.md](./tenant-core/AUDIT.md) |
| DocuLens | `apps/doculens` | moteur documentaire | EXTRACT ENGINE → Core | MIT | [doculens/AUDIT.md](./doculens/AUDIT.md) |
| TenderAI MCP Max | `apps/tenderai-mcp-server-max` | répondre aux AO (MCP) | KEEP (MCP) + ADAPT léger | ⚠ **aucune** | [tenderai/AUDIT.md](./tenderai/AUDIT.md) |
| LexSocket | `apps/mcp-tenders` | veille AO (MCP distant) | KEEP (config) | MIT | [lexsocket/AUDIT.md](./lexsocket/AUDIT.md) |
| TencentDB Agent Memory | `apps/tdai-memory-agents` | mémoire de contexte agents | KEEP séparé | ⚠ aucune | [tdai-memory/AUDIT.md](./tdai-memory/AUDIT.md) |

Architecture et justification des décisions : [`../docs/architecture/GSMS-PLATFORM-CORE-V2.md`](../docs/architecture/GSMS-PLATFORM-CORE-V2.md).

**Hors plateforme (retirés, pas d'audit) :** Comp AI GRC, SimpleRisk/RiskManager, Xacta, InvoicePilot (vitrine), Thales ISRA / OpenFire / Physsec (inspiration seulement).
