# Domaine `DOM.SEC_PHYSIQUE` — Sécurité physique

| Champ | Valeur |
|-------|--------|
| id | `DOM.SEC_PHYSIQUE` |
| name | Sécurité physique |
| maturity | `draft` |
| description | Mesures physiques et techniques : portes, serrures, ACS, éclairage, CCTV, BMS/SMS — couche « contrôle matériel » souvent croisée avec SÛRETÉ. En **précom ERP**, seul un sous-ensemble (issues / accès secours) est chargé. |

## Sources primaires

- `SRC.FR.VIDEOPROTECTION` · parties pertinentes `SRC.FR.CSI`
- Exigences ERP/IGH **uniquement** quand le RS impose un dispositif physique (issues, désenfumage mécanique…) → tracer d’abord dans `DOM.ERP` / `DOM.INCENDIE` et croiser ici

## Inspiration

Physsec : Doors · Locks · Keys · RFID/PACS · CCTV · BMS/SMS · Building design — **inspiration**, pas droit.

## Site context keys

Équipements présents · type ACS · couverture CCTV · éclairage extérieur · points d’accès · `precom_access_only` (filtre léger)

## Familles de contrôle

| family_id | Label | Intent | Evidence | Dans précom ERP ? |
|-----------|-------|--------|----------|:-----------------:|
| `DOM.SEC_PHYSIQUE.FAM.PORTES` | Portes / issues | Intégrité, fermeture, anti-retour | Photo, test, fiche | ● (issues secours) |
| `DOM.SEC_PHYSIQUE.FAM.SERRURES_CLES` | Serrures & clés | Gestion clés, qualité serrure | Inventaire clés | · |
| `DOM.SEC_PHYSIQUE.FAM.ACS` | Contrôle d’accès | PACS/EACS, badges | Config, logs | · / ○ site global |
| `DOM.SEC_PHYSIQUE.FAM.CCTV` | Vidéoprotection technique | Couverture, enregistrement | Plan caméras | · → `AUD.SITE.SURETE` |
| `DOM.SEC_PHYSIQUE.FAM.ECLAIRAGE` | Éclairage sûreté | Zones d’ombre | Mesure / photo nuit | · |
| `DOM.SEC_PHYSIQUE.FAM.BMS_SMS` | Supervision | Config BMS/SMS | Captures, essais | · |

## Types d’audit

`AUD.SITE.SURETE` · `AUD.SITE.GLOBAL` · support léger `AUD.PRECOMMISSION.ERP` (portes/issues seulement)

## Note architecture

Éviter le double comptage avec `DOM.SURETE` : physique = **composants** ; sûreté = **intention / processus / menace**.  
Pack Grace `site-surete` (Physsec). Précom ERP : issues seulement — [`../audit-types/AUD.PRECOMMISSION.ERP.mapping.md`](../audit-types/AUD.PRECOMMISSION.ERP.mapping.md) §4.4.
