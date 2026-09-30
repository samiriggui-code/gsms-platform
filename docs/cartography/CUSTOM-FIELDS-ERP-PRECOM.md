# Custom fields — pack `erp-precommission`

Aligné sur [`SCHEMA.md`](./SCHEMA.md) § `site_context_keys` et  
[`AUD.PRECOMMISSION.ERP.mapping.md`](./audit-types/AUD.PRECOMMISSION.ERP.mapping.md) §2.

**Stockage Grace :** `Assessment.metadata.customFields.erp-precommission.<key>`  
**Schéma :** `TemplatePackage.customFieldSchema` (`appliesTo: assessment`)  
**UI :** Wizard assessment · étape Scope  

Les tags `FR_*` (phase 4) et `complianceRefs` du pack restent des **labels** — ces keys sont le **contexte d’applicabilité** (entrée RuleSets phase 6).

---

## Keys

| Key | Obligatoire | Type | Options / notes | Mapping SCHEMA |
|-----|-------------|------|-----------------|----------------|
| `country` | ● | select | `FR` | `country` |
| `site_kind` | ● | select | `ERP` · `IGH` · `AUTRE` | `site_kind` |
| `erp_type` | ● | select | L…Y, PA, CTS, SG, PS, OA, Autre | `erp_type` |
| `erp_category` | ● | select | `1`–`5` | `erp_category` |
| `commission_phase` | ● | select | `pre_commission` · `periodique` · `apres_prescription` · `ouverture` | `commission_phase` |
| `occupancy` | ○ | number | Effectif / capacité | `occupancy` |
| `has_ssi` | ○ | boolean | Focus modules SSI / essais | `building_features` (flag) |
| `ssiap_required` | ○ | boolean | Famille service incendie (P1) | hint domaine incendie |
| `activity` | ○ | text | Activité déclarée | `activity` |
| `building_features` | ○ | text | Atriums, niveaux, sommeil… | `building_features` |

---

## Hors scope (phase 5)

- Filtrage automatique des surveys / modules selon ces keys → **phase 6 RuleSets**
- Champs `appliesTo: asset` sur ce pack (non utilisés pour le précom P0)
- Écriture dans le risk-engine

---

## Seed

`apps/grace/server/prisma/seed-erp-precommission.mjs` → upsert `customFieldSchema`  
Commande : `pnpm db:seed:erp-precom`
