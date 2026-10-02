# Domaine `DOM.SEC_PRIVEE` — Sécurité privée

| Champ | Valeur |
|-------|--------|
| id | `DOM.SEC_PRIVEE` |
| maturity | `draft` |
| description | Cadre d’exercice de l’activité de sécurité privée (entreprise, agents, obligations) — distinct de l’audit « site physique ». Pack : `sec-privee-cnaps` (P0 2026-09-03). |

## Sources primaires

- `SRC.FR.CSI` · `SRC.FR.CNAPS` · `SRC.FR.SEC_PRIVEE`
- Lien formation : parcours CNAPS dans **GSMS School** (pas dans le risk engine)

## Site / org context keys

`security_private=true` · type d’autorisation · effectifs · sous-traitance · sites clients couverts

## Familles de contrôle

| family_id | Label | Intent | Evidence |
|-----------|-------|--------|----------|
| `DOM.SEC_PRIVEE.FAM.AGREMENT` | Agrément / autorisation | Titres en cours de validité | Extraits CNAPS, arrêtés |
| `DOM.SEC_PRIVEE.FAM.CARTES_PRO` | Cartes professionnelles | Agents habilités | Registre, contrôles |
| `DOM.SEC_PRIVEE.FAM.CONTRATS` | Contrats / consignes client | Périmètre mission clair | Contrats, fiches de poste |
| `DOM.SEC_PRIVEE.FAM.FORMATION` | Formation / recyclage | Obligation continue | Attestations → School |
| `DOM.SEC_PRIVEE.FAM.MATERIEL` | Dotation / tenue | Conformité usage | Inventaire, photos |

## Types d’audit

`AUD.ENTREPRISE.SEC_PRIVEE` · éventuellement panier `AUD.SITE.GLOBAL` si prestataire sur site

## Hors scope

Dispositions ERP type L « moyens de secours » (→ ERP/INCENDIE) · Qualiopi OF
