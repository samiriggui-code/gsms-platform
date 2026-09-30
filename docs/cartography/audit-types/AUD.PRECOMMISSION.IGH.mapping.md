# Mapping `AUD.PRECOMMISSION.IGH` — familles → leviers Grace

**Date :** 2026-09-03  
**Maturité :** `draft` (pack P0 seedé)  
**Pack :** `igh-precommission` (`regionScope: FR`)  
**Doctrine :** pack **séparé** de `erp-precommission`. Pas d’OpenFire. Pas de mega `EU_FIRE`.

Honnêteté sources : [`../SOURCES-STATUS-IGH-PRECOM.md`](../SOURCES-STATUS-IGH-PRECOM.md)  
Custom fields : [`../CUSTOM-FIELDS-IGH-PRECOM.md`](../CUSTOM-FIELDS-IGH-PRECOM.md)

---

## 1. Objectif

Préparer / suivre une **commission IGH** : classement (hauteur / usage), compartimentage, refuges, colonnes, SSI, dossier, essais.

Ne pas copier les largeurs ERP (CO 34+) : seuils IGH ≠ RS ERP.

---

## 2. Contexte site

| Key | Obligatoire | Notes |
|-----|:-----------:|-------|
| `country` | ● | FR |
| `site_kind` | ● | IGH |
| `igh_usage` | ● | habitation (GHA), hotel (GHO), bureaux (GHW), enseignement (GHR), archives (GHS), soins (GHU), tour_controle (GHTC), ghz, itgh, autre — [R146-4](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819083) |
| `last_floor_height_m` | ○ | Plancher bas du dernier niveau (m). **R146-3 : > 50 m habitation / > 28 m autres** — [LEGIARTI000043819081](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819081) |
| `commission_phase` | ● | même vocabulaire que ERP |
| `has_refuge` | ○ | |
| `has_colonne` | ○ | sèche / humide |
| `ssiap_required` | ○ | service de sécurité unique IGH (R146-23) — seuils ≠ MS ERP |

---

## 3. Modules pack

| Module | Famille | Survey |
|--------|---------|--------|
| `mod-igh-classement` | `DOM.IGH.FAM.CLASSEMENT` | agrégé + `survey-igh-precom-classement` |
| `mod-igh-compartimentage` | `DOM.IGH.FAM.COMPARTIMENTAGE` | `survey-igh-precom-compartimentage` |
| `mod-igh-evacuation` | `DOM.IGH.FAM.EVACUATION` | `survey-igh-precom-evacuation` |
| `mod-igh-moyens` | `DOM.IGH.FAM.MOYENS` | `survey-igh-precom-moyens` |
| `mod-igh-ssi` | `DOM.IGH.FAM.SSI` | `survey-igh-precom-ssi` |
| `mod-igh-exploitation` | `DOM.IGH.FAM.EXPLOITATION` | `survey-igh-precom-exploitation` |
| `mod-igh-dossier` | `DOM.PRECOMMISSION.FAM.DOSSIER` | `survey-igh-precom-dossier` |
| `mod-igh-essais` | `DOM.PRECOMMISSION.FAM.ESSAIS` | `survey-igh-precom-essais` |

Agrégé : `survey-igh-precom` (16 questions).

Slugs assets distincts ERP : `igh-site` (pas `erp-site`).

---

## 4. Wizard (inchangé)

Scope (custom fields IGH) → assets pack → threats IGH → IRV existant → surveys → treatment.

---

## 5. Hors scope

ERP RS / types L–Y · Physsec · OpenFire · fusion ERP+IGH · RuleSets article-atomiques · GHZ/ITGH détaillés au-delà du classement
