# GSMS Platform

Plateforme métier de **GSMS — Global IT Soft Services** pour la sécurité, la sûreté et la prévention : audits, commissions de sécurité, prévention incendie, appels d'offres et accompagnement des établissements et des sociétés de sécurité privée.

L'utilisateur ne travaille pas « dans GRACE, QAtrial, le CRM ou DocuLens ». Il travaille dans **GSMS Platform**, avec des clients, des sites, des missions, des documents, des audits, des constats, des actions, des appels d'offres, des échéances et des rapports.

## Architecture (V2 — hybride)

```
            ┌───────────────────────────────┐
            │ apps/web  — Next.js            │  landing publique + plateforme /app
            └───────────────┬───────────────┘
                            │ REST /api/v1 + SSE (le navigateur ne parle qu'au Core)
            ┌───────────────▼───────────────┐
            │ apps/core — Python / FastAPI   │  identité · sites (workspace) · missions ·
            │                                │  documents (moteur DocuLens) · preuves ·
            │                                │  actions · échéances · événements ·
            │                                │  workflows · audit trail · passerelle MCP
            └───┬──────────┬──────────┬─────┘
                │          │          │            MCP
           ┌────▼───┐ ┌────▼───┐ ┌────▼────┐  ┌──────────────┐ ┌───────────┐
           │ CRM    │ │ GRACE  │ │ QAtrial │  │ TenderAI MCP │ │ LexSocket │
           │ + Eve  │ │ audit  │ │ CAPA    │  │ répondre AO  │ │ veille AO │
           └────────┘ └────────┘ └─────────┘  └──────────────┘ └───────────┘
```

Chaque brique **possède son métier et sa base**. Le Core possède le **transverse** : identité, sites, missions, relations, documents, workflows, événements, tâches, échéances, notifications et audit trail. Pour une donnée spécialisée, le Core ne garde qu'une **référence** (`grace://assessment/…`, `qatrial://capa/…`, `crm://deal/…`, `tender://rfp/…`).

**Doctrine agents :** le code calcule, le moteur exécute, l'agent (Eve) explique et assiste, l'humain valide.

**Document de référence :** [`docs/architecture/GSMS-PLATFORM-CORE-V2.md`](docs/architecture/GSMS-PLATFORM-CORE-V2.md)

## Dépôt

| Chemin | Contenu |
|---|---|
| [`apps/`](apps/README.md) | les applications (Core, Web, services spécialisés, MCP) |
| [`shared/`](shared/README.md) | contrats et données lus par le code (finding schema, catalogues de contrôles, rulesets) |
| [`audits/`](audits/README.md) | un audit de code par brique (stack, licence, données, API, tests, décisions) |
| [`docs/`](docs/README.md) | architecture, savoir réglementaire (domaine), exploitation NUC / VPS |
| `scripts/` | scripts d'exploitation (VPS, NUC, dev) |

## Démarrer

| Brique | Commande | Doc |
|---|---|---|
| Core (Python) | `cd apps/core && make install && make migrate && make dev` | [`apps/core/README.md`](apps/core/README.md) |
| Web (Next.js) | `cd apps/web && npm install && npm run dev` | [`apps/web/README.md`](apps/web/README.md) |
| Services spécialisés | voir le README de chaque app | [`apps/README.md`](apps/README.md) |

## Licences

Le dépôt assemble du code GSMS et des projets open source adaptés, **chacun sous sa propre licence** (voir le `LICENSE` de chaque app) :
- **MIT :** CRM, DocuLens, LexSocket client ;
- **AGPL-3.0 :** GRACE, QAtrial — services internes, jamais copiés dans le Core ;
- ⚠ **sans licence :** TenderAI MCP Max, outillage Tencent — à régulariser (voir [`audits/`](audits/README.md)).

Le code GSMS (`apps/core`, `apps/web`, `apps/tenant-core`) n'a pas encore de licence déclarée.
