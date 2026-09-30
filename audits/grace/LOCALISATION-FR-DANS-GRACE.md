# Où placer le contenu FR/UE dans GRACE — sans casser le repo

**Date :** 2026-09-02  
**Statut :** décision d’architecture lab  
**Doctrine :** [`../docs/DOCTRINE.md`](../../docs/DOCTRINE.md)  
**Cartographie métier :** [`../docs/cartography/`](../../docs/cartography/)

---

## 1. Verdict méthodo (figé)

| Question | Réponse |
|----------|---------|
| Les 7 steps CSMP (3-A, IRV, TEAR) sont-ils **légalement imposés** UE/FR ? | **Non** |
| Qu’est-ce que c’est ? | Méthode pro d’assessment sûreté physique, alignable ISO 31000 / tags NIS2·CER / ASIS / ISO 28000 |
| Faire Grace = conforme ERP/IGH/préfecture ? | **Non** — traçabilité possible, pas preuve légale |
| Faut-il ajouter / réécrire des steps pour la France ? | **Non** — fork lourd et inutile |
| Où vit le « spécialiste » FR ? | **Packages + templates + surveys + tags** |

```
7 STEPS = MOTEUR (HOW)     →  ne pas toucher
PACKS / SURVEYS / TAGS     →  spécialité contenu (WHAT FR)
```

Réf. upstream : `apps/grace/docs/methodology/README.md` · `server/src/lib/risk-engine.ts`

---

## 2. Mapping mental FR → 7 steps (wizard inchangé)

| Besoin / phase FR | Step Grace | Contenu FR via… |
|-------------------|------------|-----------------|
| Périmètre mission, type ERP/IGH, pré-commission | **1 Scope** | Cluster/site + **custom fields package** (`TemplatePackage.customFieldSchema`) |
| Inventaire locaux / équipements / issues | **Assets** (lié scope) | **Asset templates** du pack |
| Menaces / scénarios (malveillance, incendie volontaire, intrusion…) | **2 Threats** | **Threat templates** + liens asset↔threat |
| Notation | **3–6** Likelihood / Impact / IRV / Vulnerability | Moteur existant ; **surveys** alimentent Vulnerability (`EvidenceBasis`) |
| Mesures & plan d’action | **7 Treatment** | **Countermeasure templates** + action plans |
| Checklist réglementaire (précom / IGH) | *pas une step* | **Survey templates** / scopes / questions branchés à l’assessment |
| Preuves, PV, photos | *transverse* | Evidence + réponses survey + action plans |
| Références ERP, IGH, CNAPS, ISO… | *tags* | `complianceTags` (+ `complianceRefs` package) |
| Validation / signature | Review queue → Approver → PDF | Déjà là |

**Audit pré-commission / IGH** = surtout **surveys + pack**, pas 3 nouvelles steps.

---

## 3. Carte des points d’accroche dans le repo (ne pas casser)

### Couches à **ne pas modifier** (moteur)

| Zone | Chemin | Pourquoi |
|------|--------|----------|
| Risk engine | `server/src/lib/risk-engine.ts` | IRV / Priority — HOW |
| Wizard steps UI | `client/src/components/assessment/…` | Flux 7 steps |
| TEAR / états assessment | `server/src/modules/assessments/` | Cycle de vie |
| Méthodo canonique | `docs/methodology/README.md` | Source de vérité CSMP |

### Couches **additives** (contenu FR)

```
TemplatePackage          ← pack métier (ex. fr-erp-precommission)
  └── TemplateModule     ← modules (évacuation, SSI, issues…)
        ├── AssetTemplate
        ├── ThreatTemplate
        ├── CountermeasureTemplate
        └── *TemplateQuestion → SurveyQuestion

SurveyTemplate           ← checklists réglementaires (YES/PARTIAL/NO…)
SurveyQuestion           ← bibliothèque de questions
ClusterSurveyScope       ← périmètre survey sur un site

Threat.complianceTags    ← tags framework (étendre liste shared)
ActionPlan.complianceTags
TemplatePackage.complianceRefs  ← strings libres (ERP, IGH…) — déjà flexible
TemplatePackage.regionScope     ← ex. "FR" / "EU-FR"
TemplatePackage.customFieldSchema ← erp_type, erp_category, commission_phase…
```

#### Fichiers / API concrets

| Quoi | Où |
|------|-----|
| Modèle Prisma packs | `server/prisma/schema.prisma` → `TemplatePackage`, `TemplateModule`, `AssetTemplate`, `ThreatTemplate`, … |
| Exemple seed amont | `server/prisma/seed-banking-finance.mjs` + `banking_finance_seed.json` |
| Admin CRUD packs | `server/src/modules/templates/admin-routes.ts` · UI `client/.../TemplatePackagesPage.tsx` |
| Fork pack (safe) | API `POST admin/template-packages/:id/fork` — **préférer fork** plutôt qu’éditer un pack `isSystem` upstream |
| Survey templates | `server/src/modules/surveys/templates.ts` · UI `SurveyTemplatesPage.tsx` |
| Questions + liaisons templates | `seed-survey-questions.mjs` · `AssetTemplateQuestion` / `ThreatTemplateQuestion` |
| Tags conformité (enum app) | `shared/src/index.ts` (`ComplianceTag`) · miroir `client/src/lib/csmp-types.ts` |
| Guide UX templates | `client/src/content/guides/templates.tsx` |
| **Swagger live** | http://localhost:3011/api/docs/ · JSON http://localhost:3011/api/docs/json |

**Swagger aide pour :** lister les endpoints additifs (packs, fork, import/export, surveys, assessments) **sans lire tout le code**. Ce n’est **pas** la source de vérité réglementaire FR — juste le contrat HOW de l’API. Auth Bearer JWT pour « Try it out ».

---

## 4. Stratégie « ne pas casser Grace »

### Autorisé (lab GSMS)

1. **Nouveau package** `slug` dédié, ex. :
   - `fr-erp-precommission`
   - `fr-igh`
   - `fr-surete-physique`
   - `fr-securite-privee`
2. Seed JSON **à côté** du banking (même pattern que `seed-banking-finance.mjs`) — idempotent `upsert` sur slug.
3. **Fork** via admin si on part d’un pack existant.
4. Survey templates `isSystem: false` ou seed FR séparé.
5. Étendre `ComplianceTag` **seulement** quand un tag stable est nécessaire en UI/PDF (sinon `complianceRefs` string sur le package suffit au début).
6. `regionScope: "FR"` + `customFieldSchema` pour keys cartographie (`erp_type`, `erp_category`, `commission_phase`…).

### Interdit (pour l’instant)

- Modifier `risk-engine.ts` / matrices IRV  
- Ajouter Step 8 « Conformité ERP » dans le wizard  
- Remplacer le seed banking ou patcher packs upstream en place  
- Mélanger OpenFire / Physsec comme dépendance runtime  
- Coder 5 000 règles dans TypeScript assessment  

### Pattern recommandé (comme banking)

```
server/prisma/
  seed-fr-erp-precommission.mjs      ← nouveau (plus tard)
  fr_erp_precommission_seed.json
  fr_erp_countermeasures_seed.json   ← optionnel
```

Upstream Grace reste pullable ; le contenu FR est **additive**.

---

## 5. Matrice besoin FR → levier Grace

| Besoin FR (cartographie) | Package / module | Survey | Tag / ref | Step |
|--------------------------|------------------|--------|-----------|------|
| Vocabulaire IGH, précom, PPS | Pack + modules + asset templates | — | `complianceRefs` | Scope / Assets |
| Checklist ERP DG/DP | Modules + questions liées | **Survey template** précom ERP | `FR_ERP` (futur tag) ou refs | Survey → Vuln |
| Checklist IGH | Idem pack IGH | Survey IGH | `FR_IGH` | Survey |
| Preuves / PV / photos | — | Réponses + evidence | — | Transverse |
| CNAPS / sécu privée org | Pack org + surveys | Survey entreprise | `FR_CNAPS` | Scope + Survey |
| NIS2 / CER | — | — | Tags **déjà** `NIS2_*`, `CER` | Threat / action plan |
| ISO 31000 | — | — | Tag existant | Méthodo / rapport |
| Validation commission | — | — | — | **Review** + PDF |
| Formation corrective | Action plan → lien School (hors Grace) | — | — | Treatment |

Lien cartographie domaines : `docs/cartography/domains/*.md` · types d’audit `AUD.PRECOMMISSION.ERP` etc.

---

## 6. Quand (et seulement quand) revoir la méthode ?

| Situation | Action |
|-----------|--------|
| Contenu FR manquant | Pack / survey / tag |
| Checklist pure conformité sans scoring | Survey branché ; IRV optionnel / secondaire |
| Trou **impossible** à couvrir par pack+survey+tag+review | Alors seulement discuter d’un step custom / produit séparé |
| Produit « pure conformité réglementaire sans risk » | Autre produit éventuel — **pas** un fork soft des 7 steps |

---

## 7. Ordre concret (aligné doctrine)

```
① Lister normes / phases FR          ← cartography/ (en cours)
② Pour chacune : package | survey | tag | step existant
③ Seeds packs FR additifs (ERP précom en premier)
④ Surveys FR branchés
⑤ Étendre ComplianceTag si besoin UI
⑥ Toucher risk-engine / wizard     ← seulement si trou prouvé
```

**Maintenant :** localisation = ce document.  
**Pas encore :** écrire les JSON de seed ni patcher shared tags (sauf go explicite).

---

## 8. Schéma récap

```
                    ┌─────────────────────────┐
                    │  7 STEPS CSMP (intact)   │
                    │  risk-engine.ts          │
                    └────────────▲────────────┘
                                 │ alimenté par
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
   TemplatePackage         SurveyTemplate          ComplianceTag
   + modules/templates     + questions/scopes      + complianceRefs
         │                       │                       │
         └─────────── contenu FR / UE (WHAT) ────────────┘
```
