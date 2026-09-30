# Catalogues de contrôles GSMS

**Rôle.** Données pour **GRACE** (physique + module cyber) et **QAtrial** (échéances / policy). Comp AI GRC **supprimé** du laptop 2026-09-06.

**Canon :** [`COMP-AI-DECOMPOSITION.md`](../../COMP-AI-DECOMPOSITION.md) · [`gsms-plateforme-complet.md`](../../gsms-plateforme-complet.md) §7.

## Fichiers salvage

| Fichier | Contenu |
|---------|---------|
| `ssp-surete.json` | SSP-01…12 (IP GSMS) |
| `iso27001-2022.json` | 119 id+titres ISO |
| `soc2-tsc.json` | 63 id+titres SOC 2 |
| `control-prompts.json` | 204 noms contrôles checklist |
| `control-requirement-edges-iso-soc2.json` | mapping contrôle↔exigence |
| `policy-template-titles.json` | 52 titres policies → QAtrial |
| `task-template-titles.json` | 148 tâches type preuve |
| `finding-template-categories.json` | catégories finding inspo |
| `frameworks-inventory.json` | inventaire frameworks seed |

## Règles

1. Texte normatif ISO/SOC2 = **OSCAL**, pas Comp.
2. Aucun code AGPL Comp dans Grace/QAtrial/CRM.
3. Patterns : [`../PATTERNS-FROM-COMP-AI.md`](../PATTERNS-FROM-COMP-AI.md).
4. Ops : laptop → NUC → VPS si RAM/CPU insuffisants (`STACK-GSMS-FINALE`).
