# Pipeline d'ingestion documentaire — extraction DocuLens (à venir, phase P2)

Ce dossier accueillera le pipeline d'ingestion du Core, **extrait de DocuLens** :

- Source : `apps/doculens` (subtree de `github.com/CodeWithMoin/doculens-ai`, commit `218caef`),
  licence **MIT**, © 2025 Moinuddin Shaik. Voir `apps/doculens/GSMS-PROVENANCE.md`.
- Méthode : **copie attribuée** (§18 du document V2). Chaque fichier repris garde l'en-tête MIT
  d'origine suivi de la mention `adapted from CodeWithMoin/doculens-ai@218caef`.
- **Aucun code DocuLens n'est copié à ce stade** : ce dossier ne contient que ce plan.

## Composants prévus

| Composant DocuLens | Cible Core | Adaptation |
|---|---|---|
| `doc_utils/extraction.py` (Docling : layout, tables, pages) | `ingestion/extraction.py` | lecture depuis le stockage objet (`documents/storage.py`), pas depuis le disque |
| `doc_utils/chunking.py` (Docling `HybridChunker`, ~800 tokens) | `ingestion/chunking.py` | conserver page de début/fin et titre de section pour les citations |
| `services/llm_factory.py` + `config/llm_config.py` (Instructor multi-fournisseurs) | `gsms_core/llm/factory.py` | fournisseur abstrait, option d'hébergement souverain, `anthropic` à jour |
| `services/prompt_loader.py` (+ `prompts/*.j2`) | `gsms_core/llm/prompts.py` | chargeur repris ; prompts **réécrits en français**, par type de pièce |
| `services/vector_store.py` + embeddings | `ingestion/vector_store.py` | table `document_chunk` via Alembic, **pgvector** + `tsvector('french')`, filtre `workspace_id` obligatoire, fusion RRF |
| `core/*` (Node, LLMNode, Pipeline) | `ingestion/pipeline.py` | motif Node à sortie Pydantic, déclenché par `document.uploaded` |
| `evaluation/retrieval.py` (Recall@K, MRR) | `tests/eval/` | non-régression RAG sur un corpus GSMS |

## Flux cible (§15)

```
document.uploaded ─► worker « ingest » (lit le blob par object_key)
  ─► Docling ─► HybridChunker ─► embeddings ─► classification (taxonomie FR)
  ─► extraction par schéma du type de pièce ─► document.ingested / document.classified
  ─► recalcul de complétude du dossier (documents/dossier.py)
```

Les colonnes `embedding vector(...)` et `tsv tsvector` sont spécifiques à PostgreSQL : elles seront
ajoutées par une migration Alembic dédiée, protégée par un test de dialecte
(`op.get_bind().dialect.name == "postgresql"`), afin que la suite de tests reste exécutable sur SQLite.
