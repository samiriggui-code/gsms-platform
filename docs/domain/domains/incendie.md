# Domaine `DOM.INCENDIE` — Sécurité incendie (transverse)

| Champ | Valeur |
|-------|--------|
| id | `DOM.INCENDIE` |
| name | Sécurité incendie (transverse) |
| maturity | `draft` |
| description | Exigences et contrôles incendie **partagés** (évacuation, moyens, SSI, consignes) — spécialisés ensuite par ERP / IGH / CT via Applicability, pas via un mega-ruleset unique. |

## Sources primaires

| id | Rôle |
|----|------|
| `SRC.FR.ERP.RS` / DG / DP | ERP |
| `SRC.FR.IGH` | IGH |
| `SRC.FR.CT` | Salariés / employeur |
| `SRC.FR.SSI` | SSI / alarme / normes associées |
| `SRC.FR.SSIAP` | Service sécurité incendie |
| `SRC.FR.EVACUATION` | Exercices / évacuation |

UE : Eurocodes / JRC FSE = **appui méthodo**, pas remplacement FR.

## Inspiration ingénierie (non droit)

`SRC.METH.OPENFIRE` — calculs FSE optionnels **après** règles FR.

## Site context keys

| Key | Usage |
|-----|--------|
| `site_kind` | ERP / IGH / autre |
| `has_ssi` | Charge famille SSI |
| `has_desenfumage` | Charge désenfumage |
| `ssiap_required` / effectif | Famille service |
| `erp_category` / classe IGH | Seuils (filtrés hors moteur) |
| `public_present` / `employees_present` | Croise CT vs ERP |

## Familles de contrôle

| family_id | Label | Intent | Evidence | Levier Grace précom ERP |
|-----------|-------|--------|----------|-------------------------|
| `DOM.INCENDIE.FAM.EVACUATION` | Évacuation | Cheminements, balisage, dégagements | Plans, mesures, photos | **P0** `mod-evacuation` |
| `DOM.INCENDIE.FAM.MOYENS_SECOURS` | Moyens de secours | Extincteurs, RIA, colonnes… | Vérifications, étiquettes | **P0** `mod-moyens` |
| `DOM.INCENDIE.FAM.SSI_ALARME` | SSI / alarme | Détection, alarme, centralisation | PV essais, maintenance | **P0** `mod-ssi` |
| `DOM.INCENDIE.FAM.DESENFUMAGE` | Désenfumage | Fonctionnement attendu | Essais, notices | P0/P1 avec SSI |
| `DOM.INCENDIE.FAM.CONSIGNES` | Consignes / affichages | Information occupants | Affichages, registres | P1 `mod-consignes` |
| `DOM.INCENDIE.FAM.EXERCICES` | Exercices / formation | Fréquence, traçabilité | CR exercices · School | P1 + lien School |
| `DOM.INCENDIE.FAM.SSIAP_SERVICE` | Service sécurité incendie | Présence / missions agents | Plannings SSIAP | P1 `mod-ssiap` |

## Types d’audit

`AUD.PRECOMMISSION.ERP` · `AUD.PRECOMMISSION.IGH` · `AUD.SITE.GLOBAL`

## Règle

```
Familles INCENDIE = partagées
Seuils / articles ERP vs IGH = RuleSets séparés (plus tard)
Pas de if(ERP) dans risk-engine.ts
```

Mapping précom ERP : [`../audit-types/AUD.PRECOMMISSION.ERP.mapping.md`](../audit-types/AUD.PRECOMMISSION.ERP.mapping.md) §4.3
