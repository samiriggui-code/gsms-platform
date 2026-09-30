# Mapping `AUD.ENTREPRISE.SEC_PRIVEE` — familles → leviers Grace

**Date :** 2026-09-03  
**Maturité :** `draft` (pack P0 seedé)  
**Pack :** `sec-privee-cnaps` (`regionScope: FR`)

Honnêteté : [`../SOURCES-STATUS-SEC-PRIVEE-CNAPS.md`](../SOURCES-STATUS-SEC-PRIVEE-CNAPS.md)

---

## Objectif

Audit **organisation** sécurité privée : titres CNAPS, cartes pro, contrats, formation (School), tenue, sous-traitance.

Pas le walkthrough Physsec (`site-surete`). Pas le LMS (School).

---

## Contexte

| Key | Obligatoire | Notes |
|-----|:-----------:|-------|
| `country` | ● | FR |
| `org_kind` | ● | entreprise_secu / donneur_ordre / mixte |
| `activity_focus` | ● | surveillance_gardiennage, protection_physique, … |
| `agent_count` | ○ | |
| `has_subcontractors` | ○ | |
| `school_tracking` | ○ | preuves formation → School |

---

## Modules

| Module | Famille | Survey |
|--------|---------|--------|
| `mod-cnaps-agrement` | `DOM.SEC_PRIVEE.FAM.AGREMENT` | agrément |
| `mod-cnaps-cartes-pro` | `DOM.SEC_PRIVEE.FAM.CARTES_PRO` | cartes |
| `mod-cnaps-contrats` | `DOM.SEC_PRIVEE.FAM.CONTRATS` | contrats |
| `mod-cnaps-formation` | `DOM.SEC_PRIVEE.FAM.FORMATION` | formation |
| `mod-cnaps-materiel` | `DOM.SEC_PRIVEE.FAM.MATERIEL` | matériel |
| `mod-cnaps-sous-traitance` | sous-traitance | sous-traitance |

Agrégé : `survey-sec-privee-cnaps` (12 Q).

---

## Hors scope

Physsec portes/CCTV · ERP/IGH · Qualiopi · article-atomique CSI
