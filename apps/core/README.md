# GSMS Core

Socle Python de la plateforme GSMS : **Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic · pytest**.
Le Core est le seul service qui connaît toutes les applications. `apps/web` (Next.js) ne parle qu'à lui
(`/api/v1`). Les apps spécialisées (CRM, GRACE, QAtrial, TenderAI, LexSocket) émettent des événements
vers le Core et exposent une API que le Core lit.

Architecture de référence : [`docs/architecture/GSMS-PLATFORM-CORE-V2.md`](../../docs/architecture/GSMS-PLATFORM-CORE-V2.md)
(§6 cible, §11 modèle de domaine, §12 événements, §13 workflows, §15 documents, §18 DocuLens,
§19 migration, Annexe C agents).

## Ce que le Core possède

| Domaine | Contenu | Source de vérité |
|---|---|---|
| `identity` | organisations, sites, workspaces (= sites), utilisateurs, memberships, rôles, service accounts | Core |
| `missions` | Mission, MissionType, participants, `ExternalReference` (`crm://`, `grace://`, `qatrial://`, `tender://`, `lexsocket://`, `doc://`) | Core |
| `documents` | Document, Version, Blob (sha256 unique), liens, `DossierTemplate`, complétude | Core (binaire : MinIO) |
| `work` | Action, Task, Deadline, Notification, Evidence (→ **version** de document), `FindingRef` (cache) | Core |
| `events` | enveloppe §12, event store, outbox, webhooks entrants signés HMAC | Core |
| `workflows` | moteur déterministe (définitions en code, instances en base), WF-REMÉDIATION | Core |
| `audit` | journal append-only chaîné par hash, `verify_chain` | Core |
| `connectors` | clients CRM / GRACE / QAtrial (anti-corruption), validation `finding.schema.json` | apps |
| `mcp_gateway` | client MCP streamable-http (JSON-RPC, Bearer) vers TenderAI et LexSocket, liste blanche d'outils | apps |
| `tenders` | `TenderCase` : score Go/No-Go calculé en Python, décision humaine motivée | Core |

Doctrine (Annexe C) : **le code calcule, le moteur exécute, l'agent assiste, l'humain valide.**
Échéances, sévérité, complétude, CAPA requise et score Go/No-Go sont calculés ici, jamais par un LLM.

## Démarrer

```bash
cd apps/core
make install          # venv .venv + dépendances (+ dev)
cp .env.example .env  # valeurs de développement, aucun vrai secret
make migrate          # alembic upgrade head (SQLite ./var/gsms_core.db par défaut)
make seed             # ABC Retail : sites Lyon et Paris, 4 comptes de démo
make dev              # http://localhost:8000/api/docs
make test             # pytest
make lint             # ruff check + ruff format --check
```

Comptes de démo (mot de passe : `GSMS_SEED_PASSWORD`, défaut `demo-password-change-me`) :

| Compte | Rôle | Portée |
|---|---|---|
| `direction@abc-retail.example` | `client_admin` | toute l'organisation (Lyon + Paris) |
| `responsable.lyon@abc-retail.example` | `client_member` | workspace Lyon |
| `responsable.paris@abc-retail.example` | `client_member` | workspace Paris |
| `consultant@gsms.example` | `consultant` | toute l'organisation ABC Retail |

PostgreSQL : `GSMS_DATABASE_URL=postgresql+psycopg://gsms:***@localhost:5432/gsms_core`.
Docker : `make docker` (image `python:3.12-slim`, migrations au démarrage).

## API (v1)

| Méthode | Chemin | Rôle requis |
|---|---|---|
| GET | `/api/v1/health` | — |
| POST | `/api/v1/auth/login` | — |
| GET | `/api/v1/auth/me` | authentifié |
| POST | `/api/v1/auth/switch-workspace` | membership sur le workspace cible |
| GET | `/api/v1/workspaces` | authentifié |
| GET/POST | `/api/v1/workspaces/{ws}/missions` | lecture : membre · création : owner/admin/manager/consultant |
| GET/PATCH | `/api/v1/workspaces/{ws}/missions/{id}` | idem |
| GET/POST | `/api/v1/workspaces/{ws}/missions/{id}/external-refs` | idem |
| GET | `/api/v1/workspaces/{ws}/missions/{id}/dossier` | membre (complétude + pièces manquantes) |
| GET/POST | `/api/v1/workspaces/{ws}/documents` | dépôt : tout rôle sauf `viewer` |
| GET | `/api/v1/workspaces/{ws}/documents/{id}[/versions]` | membre |
| GET/POST | `/api/v1/workspaces/{ws}/actions` | création : owner/admin/manager/consultant |
| POST | `/api/v1/workspaces/{ws}/actions/{id}/evidence` | tout rôle sauf `viewer` |
| POST | `/api/v1/workspaces/{ws}/actions/{id}/verify` | owner/admin/manager/consultant |
| GET | `/api/v1/workspaces/{ws}/events` | membre |
| POST | `/api/v1/events/ingest/{source}` | signature `X-GSMS-Signature: sha256=<hmac>` |

**Autorisation.** Jeton JWT HS256 (`sub`, `org_id`, `workspace_id`, `role`). Le `workspace_id` du jeton
n'est qu'une préférence d'interface : chaque route `/workspaces/{ws}/…` passe par `require_workspace`,
qui relit la membership en base (directe, ou `workspace_id NULL` = toute l'organisation). Un workspace non
autorisé donne **403** ; un objet d'un autre workspace demandé via un workspace autorisé donne **404**,
car toutes les requêtes de repository filtrent sur `workspace_id`.

**Webhooks entrants.** Corps = enveloppe §12 (`type`, `subject`, `workspace_id`, `data`…). La `source`
vient de l'URL et le secret de `GSMS_WEBHOOK_SECRETS` (JSON par source). Un `id` d'événement déjà connu
est ignoré (idempotence).

## WF-REMÉDIATION

```
finding.created (sévérité ≥ GSMS_REMEDIATION_SEVERITY_THRESHOLD, statut non conforme)
  ─► Action (échéance : critique 7 j · majeure 30 j · mineure 90 j) + Deadline + FindingRef
  ─► CAPA requise ? (critique | récurrence | demande explicite) ─► capa.requested (outbox → qatrial)
état open ── capa.created ──► open (capa_uri lié)
     open ── evidence.added (avec version) ──► verification
verification ── action.rejected ──► open
verification ── action.verified ──► closed ─► action.closed (outbox → grace)
```

## Arborescence

```
apps/core/
  pyproject.toml  alembic.ini  Makefile  Dockerfile  .env.example
  gsms_core/
    main.py  settings.py  db.py  security.py  deps.py
    identity/  missions/  documents/(+ ingestion/README.md)  work/  events/
    workflows/  audit/  connectors/  mcp_gateway/  tenders/  scripts/seed_demo.py
  migrations/  (env.py, versions/0001_initial_schema.py)
  tests/
```

Chaque domaine suit le même découpage : `models.py` (SQLAlchemy), `schemas.py` (Pydantic),
`service.py` (règles, filtres workspace, audit, événements) et `router.py` (routes minces).

## Écarts assumés par rapport au document V2

- **Schémas PostgreSQL** (`identity`, `mission`…) : remplacés pour l'instant par un préfixe de table
  (`identity_user`, `mission_mission`…) pour que les tests tournent sur SQLite. Le passage aux schémas
  se fera par migration dédiée.
- **pgvector / tsvector / pg_trgm** : non créés. Ils arriveront avec l'extraction DocuLens, dans une
  migration protégée par un test de dialecte (voir `gsms_core/documents/ingestion/README.md`).
- **Clé objet** : `sha256/{sha[:2]}/{sha}` au lieu de `ws/{workspace_id}/…`. Un sha256 unique global
  (déduplication) est incompatible avec un préfixe par workspace. L'isolation est portée par
  Document/Version, et le binaire ne sort que par URL présignée.
- **Upload** : le flux est haché par blocs de 1 Mio vers un fichier temporaire. Starlette met déjà la
  partie multipart en tampon (sur disque au-delà de 1 Mio).
- **Outbox** : écrite dans la transaction. Le drainage (worker Celery + Redis) n'est pas encore
  implémenté.
- **Timers** (`deadline.approaching` / `overdue`), SSE sortant, serveur MCP « gsms », `agents/` et
  `workers/` : prévus en phases P3 à P5.
- **S3Storage** : squelette boto3 (extra `s3`), non couvert par les tests.

## Provenance

Le futur pipeline d'ingestion documentaire sera extrait de DocuLens
(`apps/doculens`, MIT, `CodeWithMoin/doculens-ai@218caef`) : voir
[`gsms_core/documents/ingestion/README.md`](gsms_core/documents/ingestion/README.md).
Aucun code DocuLens n'est encore copié.
