# apps/ — briques de GSMS Platform

| App | Rôle dans la plateforme | Stack | Licence | Statut V2 | Audit |
|---|---|---|---|---|---|
| [`core/`](core/README.md) | **GSMS Core** : identité, sites (workspace), missions, documents, preuves, actions, échéances, événements, workflows, audit trail, connecteurs, passerelle MCP | Python 3.12 · FastAPI · SQLAlchemy · Alembic · PostgreSQL | GSMS | nouveau — cœur | — |
| [`web/`](web/README.md) | **GSMS Web** : landing publique + plateforme `/app` (UI unique) | Next.js · React 19 · Tailwind 4 | GSMS | nouveau — UI unique | — |
| [`crm/`](crm/README.md) | commercial (sociétés, contacts, opportunités, mails, agenda) + **Eve** (assistant) | Next 16 · NestJS/tRPC · Prisma · Postgres · eve | MIT | service conservé | [audit](../audits/crm/AUDIT.md) |
| [`grace/`](grace/README.md) | audit terrain sûreté / incendie (assessments 3-A, enquêtes, rapports PDF) | Fastify · Prisma · Postgres · React/Vite | AGPL-3.0 | service conservé | [audit](../audits/grace/AUDIT.md) |
| [`qatrial/`](qatrial/README.md) | CAPA formelle, signatures, document control qualité | Hono · Prisma · Postgres · React/Vite | AGPL-3.0 | service conservé (revue M+6) | [audit](../audits/qatrial/AUDIT.md) |
| [`doculens/`](doculens/README.md) | amont **DocuLens AI** (moteur documentaire) — source de l'extraction vers `core/documents` | FastAPI · Celery · Docling | MIT | référence, non déployé | [audit](../audits/doculens/AUDIT.md) · [provenance](doculens/GSMS-PROVENANCE.md) |
| [`tenderai-mcp-server-max/`](tenderai-mcp-server-max/README.md) | MCP « répondre aux AO » (RFP, mémoire technique, offre financière, offres passées) | Python · FastMCP · SQLite | ⚠ aucune | service MCP conservé | [audit](../audits/tenderai/AUDIT.md) |
| [`mcp-tenders/`](mcp-tenders/README.md) | client LexSocket — MCP distant « trouver les AO » (TED + national) | Node (proxy) | MIT | configuration | [audit](../audits/lexsocket/AUDIT.md) |
| [`tdai-memory-agents/`](tdai-memory-agents/README.md) | outillage client TencentDB Agent Memory (mémoire de contexte d'Eve) | Node / shell | ⚠ aucune | séparé | [audit](../audits/tdai-memory/AUDIT.md) |
| [`tenant-core/`](tenant-core/README.md) | POC identité + portail client | Hono · Prisma · Vite/React | GSMS | **en cours d'absorption** (modèle → `core`, UI → `web`) | [audit](../audits/tenant-core/AUDIT.md) |

## Règles

1. **Le navigateur ne parle qu'au Core.** Aucune app spécialisée n'est appelée directement par `apps/web`.
2. **Les apps ne s'appellent pas entre elles.** Elles exposent une API lue par le Core et lui envoient leurs événements (`POST /api/v1/events/ingest/{source}`, HMAC).
3. **Une base par service** (même cluster Postgres par environnement). Le Core ne stocke que des références et des projections marquées « cache ».
4. **Un fichier = une copie**, dans le stockage objet du Core (MinIO). Les apps reçoivent des URL présignées.
5. **Aucun code AGPL ni sans licence copié dans `core/` ou `web/`.**
