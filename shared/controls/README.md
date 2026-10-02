# Catalogues de contrôles GSMS

**Rôle.** Données pour **GRACE** (physique + module cyber) et **QAtrial** (échéances / policy). Comp AI GRC **supprimé** du laptop 2026-09-06.

**Origine :** données récupérées de Comp AI GRC avant son retrait (historique git). Architecture : [`docs/architecture/GSMS-PLATFORM-CORE-V2.md`](../../docs/architecture/GSMS-PLATFORM-CORE-V2.md).

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
3. Lus au runtime par GRACE (`circuit/controls-catalog.ts`) et QAtrial (`lib/controls-catalog.ts`) : ne pas renommer.
