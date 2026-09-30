# Sources d’inspiration — GSMS Audit (fork GRACE FR/UE)

**Date :** 2026-09-02  
**Statut :** figé — pas de 15 apps supplémentaires dans le lab  
**Doctrine parente :** [`DOCTRINE.md`](./DOCTRINE.md) · cartographie : [`cartography/`](./cartography/)

---

## Principe

Séparer **logiciels/code** et **référentiels/méthodologies**.

| Rôle | Source | Action lab |
|------|--------|------------|
| **BASE à forker** | GRACE | Seul fork réel |
| **Inspiration risk model** | Thales ISRA | Auditer / comparer — **ne pas** déployer comme app GSMS |
| **Inspiration sûreté** | Physsec Methodology | Extraire checklists → RuleSets |
| **Inspiration FSE incendie** | OpenFire | Méthodes/calculs — **≠** droit FR |
| **Doctrine UE incendie** | JRC / Commission | Lecture méthodologique — pas un repo |
| **Droit applicable** | ERP, IGH, Code du travail, CNAPS, CER, NIS2… | RuleSets versionnés |
| **Circuit plateforme** | Xacta · SimpleRisk · QAtrial · GSMS School | Complément process — **pas** sources du référentiel GRACE |

---

## 1. GRACE — base unique

Repo lab : `apps/grace`  
Upstream : https://github.com/grace-pse/grace.git

**Garder :** sites/assets, assessments, surveys, evidence, review, snapshots, PDF, RBAC, risk engine, UI.

**Étendre :** RuleSets FR/UE + Applicability + EvidenceRequirement + Evaluation — **sans** remplacer `risk-engine.ts` par un fichier réglementaire géant.

```
GRACE ORIGINAL → FORK GSMS → GSMS SECURITY & SAFETY AUDIT
  Sûreté · Sécurité physique · Sécurité privée · Incendie · ERP · IGH · Pré-commission
```

---

## 2. Thales ISRA — priorité 🥈

| | |
|--|--|
| Repo | https://github.com/ThalesGroup/security-risk-assessment-tool |
| Nature | Electron · évaluations risque **techniques** (Thales DIS) |
| Méthode | **ISO 27005** (+ TLoT ISO 27034, qualités ISO 25010) |
| Licence | BSD-4-Clause |
| Usage GSMS | **Comparer** le modèle Asset → Threat → Vulnerability → Risk → Treatment avec GRACE |

**Idées à récupérer (conceptuel) :**
- Business assets vs supporting assets
- Threat agents + scénarios + chemins d’attaque (AND/OR)
- Scoring vulnérabilités (0–10 / CVSS-adjacent)
- Traitements : Mitigate/Modify · Retain · Avoid · Share (proche TEAR)

**Ne pas :** en faire une 6ᵉ app du lab.

---

## 3. Physsec Methodology — priorité 🥉

| | |
|--|--|
| Repo | https://github.com/evildaemond/physsec-methodology |
| Nature | Méthodologie / checklists **public domain** — pas une grosse app |
| Usage GSMS | Enrichir domaines **SÛRETÉ** (périmètre, accès, CCTV, détection, personnel, procédures…) |

Source principale pour templates / RuleSets terrain sûreté physique.

Pack Grace P0 : `site-surete` (surveys). Mapping : `docs/cartography/audit-types/AUD.SITE.SURETE.mapping.md`.

---

## 4. OpenFire — priorité 🔥

| | |
|--|--|
| Repo | https://github.com/emberon-tech/openfire |
| PyPI | `ofire` |
| Nature | Lib **Fire Safety Engineering** (Rust + Python), MIT |
| Standards | BR 187, PD 7974, CIBSE Guide E, SFPE… (UK / ingénierie) |
| Usage GSMS | Calculs / méthodes FSE optionnels dans le module incendie |

**Règle absolue :** OpenFire ≠ réglementation française ERP/IGH.  
Calcul/méthode d’un côté · RuleSets FR de l’autre.

---

## 5. JRC / Commission européenne — doctrine UE

| | |
|--|--|
| Ex. | [JRC131689 — Status & needs FSE in Europe](https://publications.jrc.ec.europa.eu/repository/handle/JRC131689) · [JRC143347 — Prospects](https://publications.jrc.ec.europa.eu/repository/handle/JRC143347) |
| Nature | Rapports techniques — **pas** un code à intégrer |
| Leçon archi | **Pas** de ruleset unique `EU_FIRE` qui remplace les règles nationales |

Europe = cadre (CER, NIS2, Eurocodes, FSE) · France = RuleSets nationaux (ERP, IGH…).

---

## 6. Référentiels officiels (couche droit)

**France :** ERP · IGH · Code du travail · sécurité incendie · SSI · SSIAP · CNAPS · sécurité privée · vidéoprotection · commissions de sécurité…

**Europe :** CER · NIS2 · Eurocodes · normes applicables · travaux JRC FSE

→ Versionnés sous `rulesets/FR/…` et `rulesets/EU/…` (cible fork).

---

## 7. Circuit apps (inchangé — hors fabrication référentiel)

```
Xacta (mission) → GRACE fork (terrain + règles) → SimpleRisk (risque) → QAtrial (CAPA) → GSMS School (formation)
```

---

## 8. Interdits

- Cloner 15 apps « au cas où »
- Remplacer le risk engine GRACE par du `if (ERP)`
- Fusionner OpenFire / ISRA dans le monorepo CRM (`gsms-school`)
- Confondre FSE UK avec ERP français

---

## 9. Prochaines études agent (ordre)

1. **Thales ISRA** — fiche comparaison vs `grace/.../risk-engine.ts`
2. **Physsec** — inventaire domaines/checklists → mapping RuleSet SÛRETÉ
3. **OpenFire** — cartographie modules utiles vs limites (hors droit FR)
4. **JRC** — notes doctrine (pas de clone)

Pas de nouvelles apps lab avant ces fiches.
