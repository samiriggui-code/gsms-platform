# RuleSets / Applicability — design (phase 6)

**Statut :** design + composeur P0  
**Hors scope absolu :** `risk-engine.ts` (IRV / TEAR)  
**Doctrine :** 7 steps = HOW · packs / surveys / tags / **rulesets** = WHAT  

---

## 1. Problème

Aujourd’hui l’opérateur doit savoir **quel pack** et **quels surveys** lancer pour un audit précom ERP.  
Phase 6 = composer automatiquement une **recommandation** à partir du **SiteContext** (custom fields assessment) + **AuditType**.

Ce n’est **pas** un moteur qui juge « conforme / non conforme » article Légifrance.

---

## 2. Couches

```
SiteContext (Assessment.metadata.customFields)
    +
AuditType (ex. AUD.PRECOMMISSION.ERP)
    ↓
ApplicabilityEngine (pur, versionné, hors risk-engine)
    ↓
Composition {
  packageSlug,
  moduleSlugs[],
  surveyKeys[],
  familyIds[],
  notes[],
  maturity: 'operational_checklist' | 'scoped' | 'detailed'
}
```

| Couche | Rôle | Maturité actuelle |
|--------|------|-------------------|
| Cartographie | Familles / sources | `draft` / `listed` |
| Pack + surveys | Contenu Grace P0 | `operational_checklist` |
| RuleSets | WHEN charger WHAT | P0 = tables JSON |
| Risk engine | HOW scorER | **inchangé** |

---

## 3. Emplacement code

```
docs/rulesets/                          ← design + JSON déclaratif
apps/grace/server/src/modules/rulesets/ ← API pure (compose)
```

Pas de Prisma RuleSet en P0 (évite schéma) — JSON versionné dans le repo.  
Pas d’import depuis `risk-engine.ts`.

---

## 4. SiteContext (entrée)

Lu depuis `Assessment.metadata.customFields['erp-precommission']`  
Keys : voir [`../cartography/CUSTOM-FIELDS-ERP-PRECOM.md`](../cartography/CUSTOM-FIELDS-ERP-PRECOM.md)

Gate minimale pour `AUD.PRECOMMISSION.ERP` :

- `country === 'FR'`
- `site_kind === 'ERP'`
- `erp_type`, `erp_category`, `commission_phase` renseignés

Sinon → composition `status: 'incomplete_context'` + liste des keys manquantes.

---

## 5. Règles P0 (déclaratives)

Fichier : `AUD.PRECOMMISSION.ERP.applicability.json`

- Toujours : modules P0 du pack + survey agrégé `survey-erp-precom`
- Si `has_ssi === true` → renforcer `mod-ssi`, `mod-essais`, survey `survey-erp-precom-ssi-essais`
- Si `commission_phase === 'pre_commission'|'ouverture'` → survey dossier prioritaire
- Si `erp_type === 'R'` → `mod-dp-r` + `survey-erp-precom-dp-r` (chapitre R)
- Si `erp_type === 'N'` → `mod-dp-n` + `survey-erp-precom-dp-n` (chapitre N)
- Si `erp_type` autre → note `listed` (Titre II à ouvrir)
- Si `ssiap_required === true` → `mod-ssiap` + `survey-erp-precom-ssiap` (MS 45–52 · arrêté 2/05/2005)

Chaque règle porte :

```json
{
  "id": "RULE.PRECOM.ALWAYS.P0",
  "maturity": "operational_checklist",
  "sourceHints": ["SRC.FR.ERP.RS", "SRC.FR.COMMISSION"],
  "officialArticleRefs": [],
  "disclaimer": "Checklist opérationnelle — pas d’article Légifrance atomique."
}
```

---

## 6. API

`GET /api/assessments/:id/applicability?auditType=AUD.PRECOMMISSION.ERP`

Réponse : composition + disclaimers.  
UI Scope : panneau « Composition recommandée » (lecture seule P0).

---

## 7. Done when (phase 6)

- [x] Design documenté  
- [x] JSON applicability versionné  
- [x] Endpoint compose sans hardcode wizard  
- [x] Disclaimer sources explicite  
- [ ] (plus tard) UI « Appliquer » = pré-sélection surveys / modules  
- [ ] (plus tard) RuleSets `detailed` avec cotes Légifrance  

---

## 8. Ce qu’on ne fait pas

- Mega-ruleSet `EU_FIRE`  
- Patch IRV/TEAR  
- Affirmer une conformité réglementaire opposable  
- Articles inventés pour « faire sérieux »
