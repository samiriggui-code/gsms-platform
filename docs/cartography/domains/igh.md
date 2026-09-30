# Domaine `DOM.IGH` — Immeubles de grande hauteur

| Champ | Valeur |
|-------|--------|
| id | `DOM.IGH` |
| name | Immeubles de grande hauteur |
| maturity | `draft` |
| description | Réglementation spécifique IGH — **ne pas fusionner** avec les RuleSets / packs ERP. Pack : `igh-precommission` (P0 2026-09-03). |

## Sources primaires

- `SRC.FR.IGH` · `SRC.FR.CCH`  
- Croise `DOM.INCENDIE` · `DOM.PRECOMMISSION`

## Site context keys

| Key | Notes |
|-----|--------|
| `country=FR` | Obligatoire |
| `site_kind=IGH` | Entrée domaine |
| `igh_usage` / hauteur | Classes R146-4 + `last_floor_height_m` (R146-3 : 50 m hab. / 28 m autres) |
| `commission_phase` | Si audit précom IGH |

## Familles de contrôle

| family_id | Label | Intent | Levier Grace (pack `igh-precommission`) |
|-----------|-------|--------|-------------------------------------|
| `DOM.IGH.FAM.CLASSEMENT` | Classement IGH | Catégorie / hauteur | custom fields + survey classement |
| `DOM.IGH.FAM.COMPARTIMENTAGE` | Compartimentage / isolement | Spécificités IGH | module + assets zones |
| `DOM.IGH.FAM.EVACUATION` | Évacuation IGH | Chemins, refuges, consignes | réutilise familles INCENDIE + seuils IGH |
| `DOM.IGH.FAM.MOYENS` | Moyens de secours / colonnes | Selon classe | module moyens |
| `DOM.IGH.FAM.SSI` | SSI / supervision | Exigences IGH | module SSI |
| `DOM.IGH.FAM.EXPLOITATION` | Exploitation / maintenance | Registres, contrats | survey + registre |

## Types d’audit

`AUD.PRECOMMISSION.IGH` · `AUD.SITE.GLOBAL` si IGH

## Règle doctrine

```
ERP ruleset ≠ IGH ruleset
ERP pack    ≠ IGH pack
Applicability choisit l’un, l’autre, ou les deux (site mixte) explicitement
```

## Lien avec ERP

Pack **séparé** `igh-precommission` — mapping [`../audit-types/AUD.PRECOMMISSION.IGH.mapping.md`](../audit-types/AUD.PRECOMMISSION.IGH.mapping.md). Site mixte = deux packs, pas une fusion.
