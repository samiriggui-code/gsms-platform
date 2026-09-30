# Domaine `DOM.AUDIT_SITE` — Audit global de site

| Champ | Valeur |
|-------|--------|
| id | `DOM.AUDIT_SITE` |
| maturity | `skeleton` |
| description | Orchestration multi-domaines sur un site (pas un catalogue réglementaire autonome). |

## Rôle

Composer un assessment « site » :

```
contexte site → domaines applicables → familles filtrées → package GRACE
```

## Sources

Indirectes : union des `SRC.*` des domaines chargés.

## Familles (méta)

| family_id | Label | Intent |
|-----------|-------|--------|
| `DOM.AUDIT_SITE.FAM.PERIMETRE_AUDIT` | Périmètre mission | Ce qui est in/out |
| `DOM.AUDIT_SITE.FAM.SYNTHESE` | Synthèse / criticité | Priorisation findings |
| `DOM.AUDIT_SITE.FAM.RETEST` | Points de retest | Boucle clôture |

## Types d’audit

`AUD.SITE.GLOBAL` (principal)

## Hors scope

Remplacer Xacta (mission cabinet) — ici = **contenu terrain** du site.
