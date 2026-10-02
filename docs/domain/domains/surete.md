# Domaine `DOM.SURETE` — Sûreté

| Champ | Valeur |
|-------|--------|
| id | `DOM.SURETE` |
| maturity | `draft` |
| description | Protection du site contre menaces humaines / malveillance : périmètre, zones, détection, réaction, procédures. |

## Sources primaires

- `SRC.FR.CSI` · `SRC.FR.VIDEOPROTECTION` (quand caméras / finalités)
- CER si `critical_infra` (`SRC.EU.CER`)
- ISO 28000 / 31000 en complément management (`SRC.ISO.*`)

## Inspiration (non réglementaire)

- Physsec Methodology — catégories Doors, CCTV, RFID, Detection & Response, Training…
- GRACE — 3-A, surveys, evidence, IRV (HOW)
- ISRA — chemins d’attaque / treatments (idées modèle)

## Site context keys

`country` · `site_kind` · `has_acs` · `has_cctv` · `has_bms` · `sensitive_zones` · `adversary_sl_target` (SL1–SL4) · `test_damage_ok`

## Familles de contrôle (buckets)

| family_id | Label | Intent | Evidence typique |
|-----------|-------|--------|------------------|
| `DOM.SURETE.FAM.PERIMETRE` | Périmètre | Barrières, clôtures, limites | Photos, plans, constatation |
| `DOM.SURETE.FAM.ZONES` | Zones sensibles | Classement / séparation | Plan de zonage, visite |
| `DOM.SURETE.FAM.DETECTION` | Détection intrusion | Capteurs, report alarme | Essais, journaux, config |
| `DOM.SURETE.FAM.REACTION` | Réaction / consignes | Chaîne d’alerte, délais | Procédures, exercices |
| `DOM.SURETE.FAM.PERSONNEL` | Personnel sûreté | Présence, consignes, formation | Plannings, attestations |
| `DOM.SURETE.FAM.PROCEDURES` | Procédures | Consignes écrites à jour | Documents versionnés |

## Types d’audit

`AUD.SITE.SURETE` · `AUD.SITE.GLOBAL` · (léger) audits entreprise

## Pack Grace

`site-surete` — mapping [`../audit-types/AUD.SITE.SURETE.mapping.md`](../audit-types/AUD.SITE.SURETE.mapping.md). Physsec CSV → surveys (inspiration). Droit = CSI / vidéoprotection.

## Hors scope

ERP/IGH dispositions incendie · Qualiopi · calculs FSE OpenFire · organisation CNAPS (`AUD.ENTREPRISE.SEC_PRIVEE`)
