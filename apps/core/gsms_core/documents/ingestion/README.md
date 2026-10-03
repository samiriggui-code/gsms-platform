# Pipeline documentaire du Core — état (2026-10-03)

> Ce dossier contenait le plan d'extraction du moteur DocuLens. Décision du 2026-10-03 :
> **Docling est le moteur documentaire universel**, intégré par un *adapter*, et le **Digest
> appartient au Core**. Le parsing ne s'extrait donc plus de DocuLens (qui reste l'interface
> documentaire : dépôt, consultation, recherche, navigation, provenance).

```
DocuLens / apps/web  ──►  GSMS Core  ──►  DoclingAdapter (DocumentParser)  ──►  Docling
                              │                       │
                              │                 NormalizedDocument (blocs, tableaux, SourceRef)
                              ▼                       │
                     Digest (gsms_core/digest)  ◄─────┘
                              │
                       WorkspaceDigest (multi-document, provenance, conflits, manquants)
                              │
                       EventBus → orchestration (Tender / GRACE / QAtrial / Eve : phase suivante)
```

| Élément | Emplacement |
|---|---|
| Contrat de sortie (`NormalizedDocument`, `SourceRef`) | `documents/parsers/schemas.py` |
| Interface moteur (`DocumentParser`, `ParseError`) | `documents/parsers/base.py` |
| Seul point de contact avec Docling | `documents/parsers/docling_adapter.py` |
| Cycle de parsing + événements | `documents/parsing.py` (table `document_parse`) |
| Routes lues par DocuLens (liste + `parse_status`, `content`, `normalized`, `search`) | `documents/router.py`, `documents/search.py` |
| Digest (classification, exigences, obligations, échéances, livrables, risques, conflits, manquants) | `digest/` (table `digest_workspace_digest`) |

Ce qui reste utile de DocuLens pour plus tard (chunking hybride, embeddings, recherche citée,
`evaluation/retrieval.py`) est listé dans `docs/HANDOFF-CURSOR.md` (DEFERRED).
