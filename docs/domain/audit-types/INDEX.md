# Types d’audit — index

**Maturité :** draft sur `AUD.PRECOMMISSION.ERP` / `AUD.PRECOMMISSION.IGH` / `AUD.SITE.SURETE` · skeleton ailleurs  
**Rôle :** packages d’assessment que l’Applicability Engine compose à partir des domaines.

---

## Catalogue

### `AUD.PRECOMMISSION.ERP`

| Champ | Valeur |
|-------|--------|
| Label | Audit pré-commission ERP |
| Maturité | `draft` |
| Domaines | `DOM.ERP` · `DOM.INCENDIE` · `DOM.PRECOMMISSION` (+ `DOM.SEC_PHYSIQUE` léger si accès/secours) |
| Context requis | `country=FR`, `site_kind=ERP`, `erp_type`, `erp_category`, `occupancy` (si connu), `commission_phase` |
| Context utile | `activity`, `building_features`, présence SSI, type exploitation |
| Sorties | Findings réglementaires → risque → prescriptions / actions → évent. formation SSIAP |
| Downstream | QAtrial · SimpleRisk · GSMS School (si formation) |
| **Mapping Grace** | [`AUD.PRECOMMISSION.ERP.mapping.md`](./AUD.PRECOMMISSION.ERP.mapping.md) |
| Pack cible | `erp-precommission` (phase 2) |

### `AUD.PRECOMMISSION.IGH`

| Champ | Valeur |
|-------|--------|
| Label | Audit pré-commission IGH |
| Domaines | `DOM.IGH` · `DOM.INCENDIE` · `DOM.PRECOMMISSION` |
| Context requis | `country=FR`, `site_kind=IGH`, `igh_usage`, `commission_phase` |
| **Mapping Grace** | [`AUD.PRECOMMISSION.IGH.mapping.md`](./AUD.PRECOMMISSION.IGH.mapping.md) |
| Pack cible | `igh-precommission` (P0 seedé 2026-09-03) |
| Notes | Ne pas fusionner les familles ERP et IGH dans un seul ruleset |

### `AUD.SITE.GLOBAL`

| Champ | Valeur |
|-------|--------|
| Label | Audit global de site |
| Domaines | `DOM.AUDIT_SITE` + panier selon contexte (SURETE, SEC_PHYSIQUE, INCENDIE, ERP/IGH si présents) |
| Context requis | `country`, `site_kind` (peut être multi) |
| Notes | Orchestrateur : charge plusieurs domaines, ne duplique pas les contrôles |

### `AUD.SITE.SURETE`

| Champ | Valeur |
|-------|--------|
| Label | Audit sûreté / sécurité physique |
| Domaines | `DOM.SURETE` · `DOM.SEC_PHYSIQUE` (+ vidéoprotection) |
| Inspiration | Physsec (familles) — preuves / droit via `SRC.FR.CSI` / vidéoprotection |
| Context | Périmètre, zones sensibles, APS/ACS, CCTV |
| **Mapping Grace** | [`AUD.SITE.SURETE.mapping.md`](./AUD.SITE.SURETE.mapping.md) |
| Pack cible | `site-surete` (P0 seedé 2026-09-03) |

### `AUD.ENTREPRISE.SEC_PRIVEE`

| Champ | Valeur |
|-------|--------|
| Label | Audit organisation sécurité privée |
| Domaines | `DOM.SEC_PRIVEE` · `DOM.AUDIT_ENTREPRISE` |
| **Mapping Grace** | [`AUD.ENTREPRISE.SEC_PRIVEE.mapping.md`](./AUD.ENTREPRISE.SEC_PRIVEE.mapping.md) |
| Pack cible | `sec-privee-cnaps` (P0 seedé 2026-09-03) |
| Lien School | Formations CNAPS / recyclages |

### `AUD.ENTREPRISE.RISQUES`

| Champ | Valeur |
|-------|--------|
| Label | Audit pilotage risques / continuité |
| Domaines | `DOM.AUDIT_ENTREPRISE` |
| Sources | ISO 31000 / 22301 · CER si applicable · CT prévention |
| **Mapping Grace** | [`AUD.ENTREPRISE.RISQUES.mapping.md`](./AUD.ENTREPRISE.RISQUES.mapping.md) |
| Pack cible | `entreprise-risques` (P0 seedé 2026-09-03) |
| Lien | SimpleRisk (pilotage) — pas le walkthrough porte/CCTV |

---

## Composition (principe)

```
AuditType
  → required SiteContext
  → Domains[]
  → ControlFamilies[] (filtrées)
  → Assessment GRACE (HOW)
```

Aucun type d’audit ne code le règlement dans le risk engine.
