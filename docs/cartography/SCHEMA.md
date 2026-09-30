# Schéma des fiches — cartographie GSMS Audit

IDs stables (futurs RuleSets). Pas encore de code d’évaluation.

---

## 1. Source (`sources/*.md`)

| Champ | Description |
|-------|-------------|
| `id` | Ex. `SRC.FR.CCH`, `SRC.FR.ERP.RS`, `SRC.EU.CER` |
| `name` | Nom usuel |
| `jurisdiction` | `FR` \| `EU` \| `ISO` \| `OTHER` |
| `nature` | `law` \| `decree` \| `order` \| `standard` \| `guidance` \| `methodology` |
| `official_refs` | Liens / cotes (Légifrance, JO, EUR-Lex…) — `TBD` OK |
| `scope_note` | Périmètre en une phrase |
| `domains` | Domaines liés (ids) |
| `status` | `listed` \| `scoped` \| `detailed` |

---

## 2. Domaine (`domains/*.md`)

| Champ | Description |
|-------|-------------|
| `id` | Ex. `DOM.ERP`, `DOM.SURETE`, `DOM.IGH` |
| `name` | Libellé FR |
| `description` | Ce que couvre le domaine dans GSMS Audit |
| `primary_sources` | Liste d’ids `SRC.*` |
| `site_context_keys` | Attributs site nécessaires à l’applicabilité |
| `control_families` | Familles de contrôles (pas encore règles atomiques) |
| `evidence_kinds` | Types de preuves typiques |
| `audit_types` | Types d’audit qui consomment ce domaine |
| `inspiration_only` | Sources GitHub utiles (Physsec, OpenFire…) — **non réglementaires** |
| `out_of_scope` | Ce qu’on n’y met pas |
| `maturity` | `skeleton` \| `draft` \| `reviewed` \| `ready-for-ruleset` |

### `site_context_keys` (exemples globaux)

| Key | Usage |
|-----|--------|
| `country` | `FR`, … |
| `site_kind` | ERP, IGH, ICPE, bureau, entrepôt, multi… |
| `erp_type` | Type ERP (L, M, N, …) si applicable |
| `erp_category` | 1 à 5 |
| `occupancy` | Effectif / capacité |
| `activity` | Activité déclarée |
| `building_features` | Étages, atriums, SSI, etc. |
| `security_private` | Activité sécurité privée ? |
| `critical_infra` | CER / résilience ? |
| `commission_phase` | Pré-commission / périodique / suite prescription |

Implémentation pack précom : [`CUSTOM-FIELDS-ERP-PRECOM.md`](./CUSTOM-FIELDS-ERP-PRECOM.md).

---

## 3. Famille de contrôle (dans la fiche domaine)

Pas une règle évaluable encore — un **bucket** :

| Champ | Description |
|-------|-------------|
| `family_id` | Ex. `DOM.ERP.FAM.EVACUATION` |
| `label` | Évacuation |
| `intent` | Pourquoi on contrôle |
| `applicability_hints` | Conditions grossières (affiner plus tard) |
| `typical_evidence` | Docs / photos / essais |
| `source_hints` | `SRC.*` + chapitre/thème (pas forcément article exact) |
| `outcome_scale` | Aligné moteur : `PASS` \| `FAIL` \| `WARNING` \| `N/A` \| `NOT_VERIFIABLE` |

---

## 4. Type d’audit (`audit-types/INDEX.md`)

| Champ | Description |
|-------|-------------|
| `id` | Ex. `AUD.PRECOMMISSION.ERP` |
| `label` | Audit pré-commission ERP |
| `domains` | Domaines chargés |
| `required_context` | Keys obligatoires avant démarrage |
| `optional_context` | Keys utiles |
| `downstream` | Finding → risk → CAPA → formation |

---

## 5. Flux Applicability (cible, non implémenté)

```
SiteContext
  + AuditType
  → filter Domains
  → filter ControlFamilies
  → (plus tard) filter Rules
  → Assessment package GRACE
```

---

## 6. Séparation stricte

| Couche | Exemple |
|--------|---------|
| Réglementaire | Disposition ERP type L — issue de `SRC.FR.ERP…` |
| Méthodo audit | Checklist Physsec « Doors » — inspiration `DOM.SURETE` |
| Ingénierie | Calcul OpenFire / PD 7974 — outil optionnel, pas obligation FR |
| Risk engine GRACE | IRV / TEAR / scoring — **HOW**, pas le texte de loi |
