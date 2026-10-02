# Audit — DocuLens AI (`apps/doculens`)

**Date :** 2026-10-02 · **Décision V2 :** EXTRACT ENGINE → `apps/core/gsms_core/documents` · le reste REMOVE · `apps/doculens` reste l'amont de référence, non déployé

## Identité et provenance
- **Upstream :** `github.com/CodeWithMoin/doculens-ai` @ `218caef`, **MIT**, © 2025 Moinuddin Shaik. Importé par `git subtree` avec l'historique complet. Détail et preuves d'identification : [`apps/doculens/GSMS-PROVENANCE.md`](../../apps/doculens/GSMS-PROVENANCE.md).
- **Stack :**
  - backend : Python 3.12, FastAPI 0.111, Celery 5.4 + Redis, **Docling 2.95** (EasyOCR) + HybridChunker, SQLAlchemy 2 + Alembic, timescale-vector (StreamingDiskANN), Instructor (OpenAI / Anthropic / Ollama / OpenRouter), embeddings OpenAI `text-embedding-3-small` ;
  - frontend : React 19.1 + Vite 7 + Tailwind 3.4.
- **Taille :** 3,2 Mo. Les PDF d'exemple amont (CV, avis de taxe foncière, factures) ont été **retirés** de l'arbre.

## Correspondance avec la chaîne documentaire GSMS

| Étape | État amont | Cible |
|---|---|---|
| Ingestion | upload 25 Mo, disque local | MinIO + sha256 + version + workspace / mission |
| Extraction | **Docling** (layout, tables, pages) ✅ | conservé |
| Classification | LLM + labels hiérarchiques + historique / correction ✅ (OpenAI codé en dur) | factory multi-fournisseurs, taxonomie FR |
| Structuration | champs libres par événement | schémas par type (RC, CCTP, CCAP, registres…) |
| Indexation | timescale-vector, FTS **anglais** | pgvector + `tsvector('french')` |
| Recherche | hybride sans rerank | RRF + rerank optionnel |
| Résumé | ✅ | prompts FR |
| Citations | `[n]` + chunk, **page non remontée** | page + extrait |
| Dossier exploitable | ❌ | `dossier_template` + complétude (Core) |

## Faiblesses bloquantes
- **Pas de table `documents` :** un document = un `event` JSONB, requêtes SQL brutes.
- Pas de hash, de version, de MIME ni de S3 ; le fichier n'est pas supprimé au delete.
- **Auth non appliquée :** `/events/*` protégé seulement par une clé API optionnelle ; les rôles sont déclaratifs ; comptes démo codés en dur.
- **Aucun scope workspace / mission** sur documents, événements et vecteurs.
- `endpoint.py` monolithique (1 266 lignes).
- 12 tests seulement (rien sur LLM, Docling, DB, Celery, auth).

## Décisions par composant

| Composant | Décision |
|---|---|
| `doc_utils/extraction.py`, `chunking.py` | **EXTRACT INTO CORE** |
| `services/llm_factory.py`, `config/llm_config.py` | **EXTRACT INTO CORE** (mettre à jour `anthropic`) |
| `services/prompt_loader.py` / `prompts/*.j2` | EXTRACT le chargeur / **REPLACE** les prompts (FR, par type) |
| `services/vector_store.py` | **ADAPT** (filtre workspace obligatoire, Alembic, pgvector, FR) |
| `label_service`, `classification_service`, `classification_audit` | **ADAPT** |
| `core/*` pipeline Node / LLMNode | **ADAPT** (motif conservé) |
| Celery (late acks, prefetch 1) | **KEEP** la config |
| `evaluation/retrieval.py` | **KEEP** (non-régression RAG) |
| table `events`, `api/endpoint.py`, `document_lifecycle.py` | **REMOVE** |
| auth, users, rôles | **REMOVE** (identité = Core) |
| frontend | **REMOVE** comme app ; patterns (tokens, citations QA, page Intake) → `apps/web` |
| demo / playground / requests / compose showcase | **REMOVE** |

## Règles d'extraction
- Copie attribuée : en-tête MIT + « adapted from CodeWithMoin/doculens-ai@218caef ».
- `apps/doculens` sera supprimé quand `core/documents` couvrira la chaîne avec tests ; mises à jour amont via `git subtree pull`.
