# Domaine réglementaire FR/UE — le « QUOI » contrôler

> **Principe HOW vs WHAT (repris de l'ancienne doctrine) :** les moteurs (GRACE, Core) portent le **COMMENT** (assessment, scoring, workflow) ; ce dossier et `shared/rulesets/` portent le **QUOI** contrôler, **pourquoi**, **sur quel site** et **selon quel texte**. Interdit : coder du droit en `if (ERP) if (IGH)` dans un moteur, ou un ruleset unique UE qui écrase le droit national. Source de vérité = textes officiels, jamais un dépôt GitHub d'inspiration.

**Statut :** phase 1 carto métier — domaines prioritaires en `draft` + mapping précom ERP  
**Objectif :** savoir *précisément* textes → domaines → applicabilité → preuves → types d’audit **avant** de toucher le moteur GRACE.

**Livrables :** [`audit-types/AUD.PRECOMMISSION.ERP.mapping.md`](./audit-types/AUD.PRECOMMISSION.ERP.mapping.md) · [`audit-types/AUD.PRECOMMISSION.IGH.mapping.md`](./audit-types/AUD.PRECOMMISSION.IGH.mapping.md) · [`audit-types/AUD.SITE.SURETE.mapping.md`](./audit-types/AUD.SITE.SURETE.mapping.md)

---

## Pourquoi cette étape

Sans cartographie, on fabrique un monstre incohérent :

- règles mélangées au risk engine  
- ERP/IGH/CNAPS collés en `if` TypeScript  
- faux « ruleset Europe » unique  
- checklists GitHub prises pour du droit

Avec cartographie, on sait **quoi** versionner dans les futurs RuleSets, et **comment** l’Applicability Engine filtre selon le contexte site.

---

## Chaîne de vérité

```
SOURCE OFFICIELLE (texte / norme)
        ↓
DOMAINE MÉTIER (sûreté, ERP, IGH…)
        ↓
CONDITIONS D’APPLICABILITÉ (pays, type site, catégorie…)
        ↓
CONTRÔLES / EXIGENCES (quoi vérifier — encore descriptif)
        ↓
PREUVES ATTENDUES (doc, photo, mesure, attestation…)
        ↓
TYPE D’AUDIT (pré-commission, site, entreprise…)
        ↓
LEVIERS GRACE (pack / survey / tag / step existant)
        ↓
( plus tard ) RULESET VERSIONNÉ + évaluation PASS/FAIL/…
```

Schéma des fiches : [`SCHEMA.md`](./SCHEMA.md)  
Index maître : [`INDEX.md`](./INDEX.md)

---

## Contenu du dossier

| Chemin | Rôle |
|--------|------|
| `sources/FR.md` | Inventaire sources France |
| `sources/EU.md` | Inventaire sources Europe |
| `sources/ISO.md` | ISO / méthodos pertinentes |
| `domains/*.md` | Une fiche par domaine métier |
| `audit-types/INDEX.md` | Types d’audit ↔ domaines |
| `audit-types/AUD.PRECOMMISSION.ERP.mapping.md` | **Familles → leviers Grace** (phase 1) |
| `CUSTOM-FIELDS-ERP-PRECOM.md` | Keys `customFieldSchema` pack (phase 5) |
| `SOURCES-STATUS-ERP-PRECOM.md` | Honnêteté : checklist P0 ≠ articles Légifrance |

---

## Règles de rédaction

1. **Pas de code** dans cette phase (sauf IDs stables type `FR.ERP.DG…`).  
2. Chaque exigence citée doit pointer une **source** (même approximative : « CCH · livre / article à préciser »).  
3. Séparer **obligation réglementaire** / **bonne pratique** / **méthode ingénierie** (ex. OpenFire).  
4. Marquer `TBD` plutôt qu’inventer un article.  
5. Europe = cadre ; France = droit applicable au site FR.

---

## Prochaines itérations (ordre)

1. Compléter domaines ERP + pré-commission + incendie (draft) — **fait**  
2. Mapping `AUD.PRECOMMISSION.ERP` — **fait**  
3. Phase 2 — seed pack `erp-precommission` (P0 modules)  
4. Mapping / pack IGH — **fait P0 2026-09-03** (`igh-precommission`)  
5. Sûreté / sécurité privée / vidéoprotection (draft approfondi)  
6. Refs Légifrance article-level → RuleSets  
7. Valider avec métier → schema Applicability
