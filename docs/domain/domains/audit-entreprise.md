# Domaine `DOM.AUDIT_ENTREPRISE` — Audit entreprise / organisation

| Champ | Valeur |
|-------|--------|
| id | `DOM.AUDIT_ENTREPRISE` |
| maturity | `draft` |
| description | Gouvernance, organisation, obligations employeur / opérateur — complément du walkthrough site. Pack : `entreprise-risques` (P0 2026-09-03). Registre → SimpleRisk. |

## Sources primaires

- `SRC.FR.CT` · `SRC.FR.PREVENTION_RISQUES` · `SRC.FR.CNAPS` (si société sécu)
- `SRC.EU.CER` / `SRC.EU.NIS2` si pertinents
- `SRC.ISO.31000` · `22301` · `28000`

## Familles de contrôle

| family_id | Label | Intent |
|-----------|-------|--------|
| `DOM.AUDIT_ENTREPRISE.FAM.GOUV_RISQUE` | Gouvernance risque | Politique, rôles, revue |
| `DOM.AUDIT_ENTREPRISE.FAM.DOCUMENTAIRE` | Système documentaire | Procédures à jour |
| `DOM.AUDIT_ENTREPRISE.FAM.FORMATION` | Plan de formation | Compétences → School |
| `DOM.AUDIT_ENTREPRISE.FAM.CONTINUITE` | Continuité / crise | PCA / exercices |
| `DOM.AUDIT_ENTREPRISE.FAM.SOUS_TRAITANCE` | Prestataires | Contrôle fournisseurs sécu |

## Types d’audit

`AUD.ENTREPRISE.SEC_PRIVEE` · `AUD.ENTREPRISE.RISQUES`

## Lien circuit

Findings organisationnels → SimpleRisk / QAtrial ; formations → GSMS School.
