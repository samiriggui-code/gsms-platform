# Mapping `AUD.PRECOMMISSION.ERP` — familles → leviers Grace

**Date :** 2026-09-02  
**Maturité :** `draft` (cartographie métier — **pas** de règles évaluables)  
**Audit type :** `AUD.PRECOMMISSION.ERP`  
**Pack cible (phase 2) :** `erp-precommission`  
**Doctrine :** 7 steps = HOW · packs / surveys / tags = WHAT FR  
**Ne pas :** toucher `risk-engine.ts` · ajouter des steps wizard · fusionner ERP+IGH

---

## 1. Objectif de ce document

Pour chaque **famille de contrôle** du panier pré-commission ERP, indiquer **où** elle vit dans Grace **sans changer le moteur** :

| Levier | Rôle |
|--------|------|
| `package` / `module` | Conteneur TemplatePackage + TemplateModule |
| `asset` | AssetTemplate (locaux, issues, SSI, extincteurs…) |
| `threat` | ThreatTemplate (scénarios 3-A utiles au walkthrough) |
| `cm` | CountermeasureTemplate (mesures / traitements) |
| `survey` | SurveyTemplate / questions (checklist réglementaire) |
| `tag` / `complianceRefs` | Traçabilité FR (pas le moteur) |
| `customField` | Contexte site (applicabilité) |
| `step` | Step Grace **existant** (1–7) — lecture seule |

Échelle future (hors scope code) : `PASS` \| `FAIL` \| `WARNING` \| `N/A` \| `NOT_VERIFIABLE`.

---

## 2. Contexte site requis → Grace

| Key cartographie | Obligatoire | Levier Grace | Notes |
|------------------|:-----------:|--------------|-------|
| `country` | ● | `customField` + `regionScope: FR` | Filtre pack |
| `site_kind` | ● | `customField` `site_kind=ERP` | Sinon audit N/A |
| `erp_type` | ● | `customField` (L, M, N, …) | Charge DP |
| `erp_category` | ● | `customField` (1–5) | Seuils effectifs |
| `commission_phase` | ● | `customField` | `pre_commission` \| `periodique` \| `apres_prescription` \| `ouverture` |
| `occupancy` | ○ | `customField` | Capacité / effectif |
| `activity` | ○ | `customField` | Affinage |
| `building_features` | ○ | `customField` (JSON / multi) | SSI, atriums, niveaux… |
| `has_ssi` | ○ | `customField` bool | Module SSI |
| `ssiap_required` | ○ | `customField` bool | Famille service incendie |

→ Ces keys alimentent **`TemplatePackage.customFieldSchema`** du pack `erp-precommission` (phase 5 peut affiner ; le schéma minimal part dès phase 2).

---

## 3. Domaines chargés par l’audit

| Domaine | Rôle dans l’audit | Pack module(s) suggérés |
|---------|-------------------|-------------------------|
| `DOM.PRECOMMISSION` | Orchestration dossier / essais / prescriptions | `mod-dossier`, `mod-essais`, `mod-prescriptions` |
| `DOM.ERP` | Classement, construction, dégagements, registre | `mod-classement`, `mod-degagements`, `mod-registre` |
| `DOM.INCENDIE` | Évacuation, moyens, SSI, consignes, SSIAP | `mod-evacuation`, `mod-moyens`, `mod-ssi`, `mod-consignes` |
| `DOM.SEC_PHYSIQUE` | Léger : issues / accès secours seulement | sous-ensemble dans `mod-degagements` / `mod-moyens` |

`DOM.IGH` = **hors** cet audit (voir `AUD.PRECOMMISSION.IGH`).

---

## 4. Matrice familles → leviers Grace

### 4.1 Pré-commission (processus)

| family_id | Intent | package/module | asset | threat | cm | survey | tag / refs | step |
|-----------|--------|----------------|-------|--------|-----|--------|------------|------|
| `DOM.PRECOMMISSION.FAM.DOSSIER` | Pièces dossier présentes | `mod-dossier` | — | — | — | **Survey** « Complétude dossier précom » | `complianceRefs: CCH, COMMISSION` | 1 Scope |
| `DOM.PRECOMMISSION.FAM.PLANS` | Plans / notices cohérents | `mod-dossier` | Asset « jeu de plans » (INFORMATION) | — | — | Survey plans + photos | idem | 1 · Assets |
| `DOM.PRECOMMISSION.FAM.ESSAIS` | PV / essais fonctionnels | `mod-essais` | Assets SSI / désenfumage | — | CM « essai périodique » | Survey essais + upload PV | `SRC.FR.SSI` | 6 Vuln · Evidence |
| `DOM.PRECOMMISSION.FAM.PRESCRIPTIONS` | Suivi levée prescriptions | `mod-prescriptions` | — | — | Action plans | Survey suivi | COMMISSION | 7 Treatment |
| `DOM.PRECOMMISSION.FAM.REGISTRE` | Registre & visas | `mod-registre` | Asset « registre de sécurité » | — | — | Survey registre | ERP.RS | 1 · 6 |

### 4.2 ERP (spécifique établissement)

| family_id | Intent | package/module | asset | threat | cm | survey | tag / refs | step |
|-----------|--------|----------------|-------|--------|-----|--------|------------|------|
| `DOM.ERP.FAM.CLASSEMENT` | Type / catégorie / cohérence | `mod-classement` | SITE / BUILDING typés ERP | Threat « sous-classement / dérive d’usage » | — | Survey classement | `SRC.FR.ERP.RS` · DP | 1 Scope · Assets |
| `DOM.ERP.FAM.CONSTRUCTION` | Structure / isolement / conception | `mod-construction` | FLOOR / ZONE / isolements | Threat incendie propagation | CM coupe-feu / isolement | Survey construction (échantillon) | ERP.DG | 2–6 |
| `DOM.ERP.FAM.DEGAGEMENTS` | Largeurs, nb issues, distances | `mod-degagements` | Assets **ISSUE** / **DEGAGEMENT** (ROOM/ZONE) | Threat panique / obstruction | CM balisage, dégagement libre | Survey mesures + photos | ERP.DG · DP | Assets · 6 |
| `DOM.ERP.FAM.AMENAGEMENTS` | Matériaux / décoration | `mod-amenagements` | — | Threat charge calorifique décor | CM matériaux M… | Survey aménagements | ERP.DG | 6 |
| `DOM.ERP.FAM.SECOURS_SPE` | Dispositions particulières type | `mod-dp-{erp_type}` *(phase 2 : 1–2 types démo)* | selon DP | selon type | selon type | Survey DP conditionnel | ERP.DP | 1 (filtre) · 6 |
| `DOM.ERP.FAM.REGISTRE` | Registre sécurité ERP | `mod-registre` | voir précom | — | — | Survey | ERP.RS | 6 |

### 4.3 Incendie transverse (dans le panier ERP)

| family_id | Intent | package/module | asset | threat | cm | survey | tag / refs | step |
|-----------|--------|----------------|-------|--------|-----|--------|------------|------|
| `DOM.INCENDIE.FAM.EVACUATION` | Cheminements, balisage | `mod-evacuation` | Issues, balisage, points de rassemblement | Threat obstruction / panique | CM évacuation | Survey évacuation | ERP + CT | Assets · 2 · 6 |
| `DOM.INCENDIE.FAM.MOYENS_SECOURS` | Extincteurs, RIA, colonnes | `mod-moyens` | EQUIPMENT extincteur / RIA | Threat absence moyen | CM moyens | Survey inventaire + dates vérif | ERP.DG | Assets · 6 |
| `DOM.INCENDIE.FAM.SSI_ALARME` | SSI / détection / alarme | `mod-ssi` | SYSTEM / EQUIPMENT SSI | Threat défaillance alarme | CM maintenance SSI | Survey SSI + PV | `SRC.FR.SSI` | Assets · 6 |
| `DOM.INCENDIE.FAM.DESENFUMAGE` | Désenfumage | `mod-ssi` ou `mod-desenfumage` | EQUIPMENT désenfumage | Threat enfumage | CM essais | Survey | ERP.DG | 6 |
| `DOM.INCENDIE.FAM.CONSIGNES` | Affichages / consignes | `mod-consignes` | INFORMATION consignes | — | CM affichage | Survey photo | ERP · CT | 6 |
| `DOM.INCENDIE.FAM.EXERCICES` | Exercices évacuation | `mod-consignes` | — | — | CM exercice | Survey CR | CT · School | 7 · School |
| `DOM.INCENDIE.FAM.SSIAP_SERVICE` | Service sécurité incendie | `mod-ssiap` | PERSON / PROCESS SSIAP | Threat absence service | CM effectif | Survey plannings | `SRC.FR.SSIAP` | Assets · 6 · School |

### 4.4 Sécurité physique (léger — accès / issues)

| family_id | Intent | package/module | asset | threat | cm | survey | tag / refs | step |
|-----------|--------|----------------|-------|--------|-----|--------|------------|------|
| `DOM.SEC_PHYSIQUE.FAM.PORTES` *(filtre précom)* | Issues de secours utilisables | `mod-degagements` | ISSUE / porte secours | Threat issue bloquée | CM issue libre | items dans survey dégagements | ERP.DG | Assets · 6 |

Autres familles Physsec (ACS, CCTV…) → **`AUD.SITE.SURETE`**, pas le cœur précom ERP.

---

## 5. Découpage pack `erp-precommission` (preview phase 2)

```
TemplatePackage slug: erp-precommission
  regionScope: FR
  complianceRefs: ["ERP.RS", "CCH", "COMMISSION", "SSI"]
  customFieldSchema: { country, site_kind, erp_type, erp_category, commission_phase, … }

  modules (P0 minimal) :
    mod-classement
    mod-degagements
    mod-evacuation
    mod-moyens
    mod-ssi
    mod-registre
    mod-dossier
    mod-essais

  P1 (après démo) :
    mod-construction · mod-amenagements · mod-consignes · mod-ssiap · mod-prescriptions · mod-dp-*
```

**Surveys P0 (noms cibles) :**

1. `survey-erp-precom-dossier` — complétude dossier  
2. `survey-erp-precom-degagements` — issues / mesures / photos  
3. `survey-erp-precom-ssi-essais` — SSI + PV  
4. `survey-erp-precom-registre` — registre / visas  
5. `survey-erp-precom` — agrégé « Pré-commission ERP » (lancement démo)

**État :** seed `seed-erp-precommission-surveys.mjs` — **fait 2026-09-02**.  

---

## 6. Flux parcours utilisateur (wizard inchangé)

```
1 Scope          → cluster site + custom fields ERP / phase commission
   Assets        → inventaire depuis asset templates du pack
2 Threats        → scénarios pack (incendie, panique, obstruction…)
3–5 Scoring      → moteur existant (ne pas patcher)
6 Vulnerability  → surveys + evidence (cœur checklist réglementaire)
7 Treatment      → CM + action plans (prescriptions, CAPA)
Review / PDF     → tags + complianceRefs visibles
```

---

## 7. Preuves typiques (transverse)

| evidence_kind | Exemples | Où dans Grace |
|---------------|----------|---------------|
| `doc` | Plans, notices, PV, courriers | Evidence / pièces jointes survey |
| `photo` | Issues, affichages, extincteurs | Survey + media |
| `mesure` | Largeurs, distances | Champs survey numériques |
| `attestation` | Visas, maintenance | Upload |
| `constat_visite` | Observation terrain | Note threat / finding |

---

## 8. Hors scope explicite

- Articles Légifrance atomiques (phase `detailed` / RuleSets)  
- Calculs OpenFire / FSE comme obligation  
- IGH (autre audit type)  
- CNAPS / sûreté malveillance complète  
- Qualiopi / OF (produit School)  
- Modification IRV / TEAR / steps  

---

## 9. Critères « done » phase 1 (cette fiche)

- [x] Context keys → leviers Grace documentés  
- [x] Toutes familles PRECOM + ERP + INCENDIE du panier mappées  
- [x] Preview modules / surveys pack phase 2  
- [x] Steps 1–7 rappelés sans modification  

**Suite :** phase 5 custom fields — **fait 2026-09-03** (`Assessment.metadata` + Scope UI + `CUSTOM-FIELDS-ERP-PRECOM.md`). Phase 6 = RuleSets (gate).
