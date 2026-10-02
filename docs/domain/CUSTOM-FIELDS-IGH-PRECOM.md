# Custom fields — pack `igh-precommission`

Aligné sur [`AUD.PRECOMMISSION.IGH.mapping.md`](./audit-types/AUD.PRECOMMISSION.IGH.mapping.md) §2.

**Stockage Grace :** `Assessment.metadata.customFields.igh-precommission.<key>`  
**Schéma :** `TemplatePackage.customFieldSchema` (`appliesTo: assessment`)  
**UI :** Wizard assessment · étape Scope

---

## Keys

| Key | Obligatoire | Type | Options / notes |
|-----|-------------|------|-----------------|
| `country` | ● | select | `FR` |
| `site_kind` | ● | select | `IGH` · `ERP` · `AUTRE` — ce pack = IGH |
| `igh_usage` | ● | select | habitation · hotel · bureaux · enseignement · archives · soins · tour_controle · ghz · itgh · autre (CCH R146-4) |
| `last_floor_height_m` | ○ | number | Plancher bas dernier niveau (m). R146-3 : **> 50 m hab. / > 28 m autres** |
| `commission_phase` | ● | select | `pre_commission` · `periodique` · `apres_prescription` · `ouverture` |
| `has_refuge` | ○ | boolean | Focus évacuation / refuges |
| `has_colonne` | ○ | boolean | Focus moyens |
| `ssiap_required` | ○ | boolean | Service unique R146-23 — pas MS ERP |

## Hors scope

- Filtrage auto surveys selon keys → RuleSets IGH (plus tard, après 2–3 packs)  
- Fusion avec `erp-precommission`

## Seed

`pnpm db:seed:igh-precom` (idempotent).
