# Index maître — cartographie GSMS Audit FR/UE

**Mis à jour :** 2026-09-03 (packs `site-surete` + `igh-precommission` P0)  
**Maturité globale :** `draft` sur domaines prioritaires · reste `skeleton` ailleurs

---

## Domaines

| id | Nom | Maturité | Fiche |
|----|-----|----------|-------|
| `DOM.SURETE` | Sûreté | **draft** | [domains/surete.md](./domains/surete.md) |
| `DOM.SEC_PHYSIQUE` | Sécurité physique | **draft** | [domains/securite-physique.md](./domains/securite-physique.md) |
| `DOM.SEC_PRIVEE` | Sécurité privée | **draft** | [domains/securite-privee.md](./domains/securite-privee.md) |
| `DOM.INCENDIE` | Sécurité incendie (transverse) | **draft** | [domains/incendie.md](./domains/incendie.md) |
| `DOM.ERP` | Établissements recevant du public | **draft** | [domains/erp.md](./domains/erp.md) |
| `DOM.IGH` | Immeubles de grande hauteur | **draft** | [domains/igh.md](./domains/igh.md) |
| `DOM.PRECOMMISSION` | Pré-commission / commission de sécurité | **draft** | [domains/pre-commission.md](./domains/pre-commission.md) |
| `DOM.AUDIT_SITE` | Audit global de site | skeleton | [domains/audit-site.md](./domains/audit-site.md) |
| `DOM.AUDIT_ENTREPRISE` | Audit entreprise / organisation | **draft** | [domains/audit-entreprise.md](./domains/audit-entreprise.md) |

---

## Sources (aperçu)

Voir inventaires détaillés :

- [sources/FR.md](./sources/FR.md)  
- [sources/EU.md](./sources/EU.md)  
- [sources/ISO.md](./sources/ISO.md)

| id | Nom court | Jur. |
|----|-----------|------|
| `SRC.FR.CCH` | Code de la construction et de l’habitation | FR |
| `SRC.FR.ERP.RS` | Règlement de sécurité ERP | FR |
| `SRC.FR.IGH` | Réglementation IGH | FR |
| `SRC.FR.CT` | Code du travail | FR |
| `SRC.FR.CSI` | Code de la sécurité intérieure | FR |
| `SRC.FR.CNAPS` | Cadre CNAPS / sécurité privée | FR |
| `SRC.FR.SSIAP` | Cadre SSIAP | FR |
| `SRC.FR.VIDEOPROTECTION` | Vidéoprotection | FR |
| `SRC.FR.COMMISSION` | Commissions de sécurité | FR |
| `SRC.EU.CER` | Directive CER | EU |
| `SRC.EU.NIS2` | Directive NIS2 | EU |
| `SRC.EU.EUROCODES` | Eurocodes (si pertinents) | EU |
| `SRC.ISO.31000` | ISO 31000 | ISO |
| `SRC.ISO.31010` | ISO 31010 | ISO |
| `SRC.ISO.22301` | ISO 22301 | ISO |
| `SRC.ISO.28000` | ISO 28000 | ISO |

---

## Types d’audit (aperçu)

Détail : [audit-types/INDEX.md](./audit-types/INDEX.md)

| id | Label | Domaines principaux | Mapping Grace |
|----|-------|---------------------|---------------|
| `AUD.PRECOMMISSION.ERP` | Audit pré-commission ERP | ERP · INCENDIE · PRECOMMISSION | **[mapping](./audit-types/AUD.PRECOMMISSION.ERP.mapping.md)** |
| `AUD.PRECOMMISSION.IGH` | Audit pré-commission IGH | IGH · INCENDIE · PRECOMMISSION | **[mapping](./audit-types/AUD.PRECOMMISSION.IGH.mapping.md)** |
| `AUD.SITE.GLOBAL` | Audit global de site | AUDIT_SITE · SURETE · SEC_PHYSIQUE · INCENDIE… | — |
| `AUD.SITE.SURETE` | Audit sûreté / sécurité physique | SURETE · SEC_PHYSIQUE | **[mapping](./audit-types/AUD.SITE.SURETE.mapping.md)** |
| `AUD.ENTREPRISE.SEC_PRIVEE` | Audit organisation sécurité privée | SEC_PRIVEE · AUDIT_ENTREPRISE | **[mapping](./audit-types/AUD.ENTREPRISE.SEC_PRIVEE.mapping.md)** |
| `AUD.ENTREPRISE.RISQUES` | Audit pilotage risques / continuité | AUDIT_ENTREPRISE (+ ISO) | **[mapping](./audit-types/AUD.ENTREPRISE.RISQUES.mapping.md)** |

---

## Matrice domaine × type d’audit (brouillon)

| | PRECOM.ERP | PRECOM.IGH | SITE.GLOBAL | SITE.SURETE | ENT.SEC_PRIVEE | ENT.RISQUES |
|--|:---:|:---:|:---:|:---:|:---:|:---:|
| SURETE | · | · | ● | ● | ○ | ○ |
| SEC_PHYSIQUE | ○ | ○ | ● | ● | ○ | · |
| SEC_PRIVEE | · | · | ○ | ○ | ● | ○ |
| INCENDIE | ● | ● | ● | · | · | ○ |
| ERP | ● | · | ○ | · | · | · |
| IGH | · | ● | ○ | · | · | · |
| PRECOMMISSION | ● | ● | ○ | · | · | · |
| AUDIT_SITE | ○ | ○ | ● | ○ | · | · |
| AUDIT_ENTREPRISE | · | · | ○ | · | ● | ● |

● = cœur · ○ = souvent · · = rare / N/A

---

## Hors cartographie (rappel)

- Code GRACE / risk engine  
- Clones ISRA / OpenFire / Physsec comme apps  
- 5 000 règles atomiques  
- Qualiopi OF (reste dans GSMS School — autre produit)

---

## Avancement phase 1

| Livrable | Statut |
|----------|--------|
| Mapping `AUD.PRECOMMISSION.ERP` | **done** |
| Domaines ERP / PRECOM / INCENDIE / IGH / SEC_PHYSIQUE → draft | **done** |
| Mapping IGH + pack `igh-precommission` | **done (P0)** |
| Refs Légifrance article-level | pending (`detailed`) |
| Seed pack `erp-precommission` | **done (phase 2 P0)** |
| Mapping `AUD.SITE.SURETE` + pack `site-surete` | **done (P0 Physsec)** |
| Mapping + pack `sec-privee-cnaps` | **done (P0)** |
| Mapping + pack `entreprise-risques` | **done (P0)** |
| Pack `site-global` (orchestrateur) | pending (pas un dump) |
