# Domaine `DOM.ERP` — Établissements recevant du public

| Champ | Valeur |
|-------|--------|
| id | `DOM.ERP` |
| name | Établissements recevant du public |
| maturity | `draft` |
| description | Applicabilité et contrôles issus du règlement de sécurité ERP (DG + DP par type) et du CCH. Contenu Grace via pack `erp-precommission` — **pas** dans le risk engine. |

## Sources primaires

| id | Rôle |
|----|------|
| `SRC.FR.CCH` | Socle construction / habitation |
| `SRC.FR.ERP.RS` | Règlement de sécurité ERP |
| `SRC.FR.ERP.DG` | Dispositions générales |
| `SRC.FR.ERP.DP` | Dispositions particulières par `erp_type` |
| `SRC.FR.COMMISSION` | Avis / prescriptions (croise précom) |

Croise : `DOM.INCENDIE` · `DOM.PRECOMMISSION` · (léger) `DOM.SEC_PHYSIQUE`

## Site context keys (critiques)

| Key | Obligatoire | Rôle applicabilité |
|-----|:-----------:|-------------------|
| `country=FR` | ● | Entrée juridiction |
| `site_kind=ERP` | ● | Entrée domaine |
| `erp_type` | ● | Charge DP (L, M, N, O, P, R, S, T, U, V, W, X, Y, PA, CTS…) |
| `erp_category` | ● | 1–5 |
| `occupancy` | ○ | Seuils effectif / capacité |
| `activity` | ○ | Affinage usage |
| `building_features` | ○ | Atriums, niveaux, SSI… |
| `commission_phase` | ○* | *Obligatoire si audit précom |

→ Mapping Grace : [`../audit-types/AUD.PRECOMMISSION.ERP.mapping.md`](../audit-types/AUD.PRECOMMISSION.ERP.mapping.md) §2

## Familles de contrôle

| family_id | Label | Intent | Evidence typique | Source hint | Levier Grace (P0) |
|-----------|-------|--------|------------------|-------------|-------------------|
| `DOM.ERP.FAM.CLASSEMENT` | Classement / type / catégorie | Cohérence déclaration vs réalité | Arrêté, plans, visite | RS · DP | module `mod-classement` + survey + custom fields |
| `DOM.ERP.FAM.CONSTRUCTION` | Conception / structure / isolement | DG + éléments structurants | Plans, notices, constat | DG | module `mod-construction` (P1) |
| `DOM.ERP.FAM.DEGAGEMENTS` | Dégagements / calculs | Largeurs, nombres, distances | Mesures, photos issues | DG · DP | **P0** `mod-degagements` + survey |
| `DOM.ERP.FAM.AMENAGEMENTS` | Aménagements intérieurs | Matériaux, décoration | Fiches matériaux, photos | DG | P1 `mod-amenagements` |
| `DOM.ERP.FAM.SECOURS_SPE` | Dispositions particulières type | Selon `erp_type` | Checklist DP | DP | P1 `mod-dp-{type}` (démo 1–2 types) |
| `DOM.ERP.FAM.REGISTRE` | Registre de sécurité | Tenue, visas, vérifications | Registre, visas | RS | **P0** `mod-registre` + survey |

*(Articles Légifrance exacts = maturité `detailed` / RuleSets — pas ici.)*

## Types d’audit

- `AUD.PRECOMMISSION.ERP` (cœur)  
- `AUD.SITE.GLOBAL` si ERP présent (panier partiel)

## Evidence kinds

`doc` · `photo` · `mesure` · `attestation` · `constat_visite`

## Hors scope

- IGH → `DOM.IGH`  
- OpenFire / FSE comme obligation  
- CNAPS / sécurité privée  
- Sûreté malveillance complète → `DOM.SURETE`

## Notes métier

1. Un même site peut être **ERP + autre** (bureau salarié, parking) : l’Applicability compose les domaines, elle ne fusionne pas les RuleSets.  
2. Les **seuils** (catégorie, type) filtrent les familles DP — jamais des `if` dans `risk-engine.ts`.  
3. Phase 2 seed : prioriser classement + dégagements + registre ; DP complète ensuite.
