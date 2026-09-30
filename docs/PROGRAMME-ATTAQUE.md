# Programme d’attaque — Grace → GSMS Audit FR/UE

**Statut :** phase 0 i18n + dark UI largement avancée (2026-09-02) — **attente signal** « i18n OK — lance phase N »  
**Toi :** valider le parcours FR ou dire d’enchaîner  
**Agent ensuite :** phases 1→7 dans l’ordre — pas de saut  

Docs déjà posés : [`DOCTRINE.md`](./DOCTRINE.md) · [`cartography/`](./cartography/) · [`../audits/grace/LOCALISATION-FR-DANS-GRACE.md`](../audits/grace/LOCALISATION-FR-DANS-GRACE.md)

---

## Principe

| Couche | Action typique | Touche le wizard 7 steps ? |
|--------|----------------|----------------------------|
| UI strings | **Toi / agent** — i18n | Non |
| Contenu métier FR | **Ajouter** packs / surveys / tags | Non |
| Cartographie / refs | **Créer / enrichir** docs | Non |
| RuleSets / Applicability | **Créer** (plus tard) | Non |
| Risk engine / steps | **Ne pas modifier** sauf trou prouvé | — |

```
AJOUTER  = seeds, packs, surveys, tags, docs carto
CRÉER    = nouveaux fichiers additifs (pas fork destructif)
MODIFIER = shared ComplianceTag, i18n, éventuellement labels — pas risk-engine
ÉVITER   = réécrire les 7 steps, merger 15 apps, coder 5000 if(ERP)
```

---

## Phase 0 — i18n FR *(quasi fait — parenthèse UI sombre/i18n 2026-09-02)*

| | |
|--|--|
| **Quoi** | Traduire l’UI Grace (`client/src/i18n/locales/fr.ts` + clés manquantes) |
| **État** | Locales FR + NodeToolbox / légende / relations / défaut locale FR ; restes possibles hors parcours critique |
| **Done when** | Tu dis « i18n OK » (ou « i18n OK — lance phase 1 ») |

---

## Phase 1 — Cartographie métier (approfondir, pas 5k règles)

| | |
|--|--|
| **Quoi** | Passer domaines prioritaires de `skeleton` → `draft` / `scoped` |
| **Priorité** | 1) ERP + pré-commission 2) IGH 3) Incendie transverse 4) Sûreté / sécu privée |
| **État 2026-09-02** | **Done (draft)** — mapping `AUD.PRECOMMISSION.ERP` + domaines ERP/PRECOM/INCENDIE/IGH/SEC_PHYSIQUE |
| **Livrable** | [`cartography/audit-types/AUD.PRECOMMISSION.ERP.mapping.md`](./cartography/audit-types/AUD.PRECOMMISSION.ERP.mapping.md) |
| **Ne pas** | Coder des règles évaluables ; toucher Grace runtime |
| **Suite** | Phase 2 seed pack P0 selon §5 du mapping |

---

## Phase 2 — Premier pack FR additif *(contenu, pas moteur)*

| | |
|--|--|
| **Quoi** | Premier **TemplatePackage** GSMS, pattern banking |
| **État 2026-09-02** | **Done (P0)** — seed exécuté en local |
| **Créé** | `server/prisma/seed-erp-precommission.mjs` · `erp_precommission_seed.json` · `erp_precommission_countermeasures_seed.json` |
| **Package** | `slug: erp-precommission`, `regionScope: FR`, 8 modules P0, customFieldSchema assessment |
| **Branchement** | `maybe-seed.mjs` step 4 · `pnpm db:seed:erp-precom` |
| **Ne pas** | Éditer banking ; patcher `risk-engine.ts` |
| **Suite** | Phase 3 surveys FR checklist |

---

## Phase 3 — Surveys FR (checklists réglementaires)

| | |
|--|--|
| **Quoi** | Checklists précom / points de contrôle = **surveys**, pas nouvelles steps |
| **État 2026-09-02** | **Done (P0)** — templates + questions library attachées au pack |
| **Créé** | `seed-erp-precommission-surveys.mjs` · `erp_precommission_surveys_seed.json` |
| **Templates** | `Pré-commission ERP` (+ Dossier / Dégagements / SSI & essais / Registre) |
| **AAA** | 20 questions FR → liens asset/threat/CM du pack `erp-precommission` uniquement |
| **Branchement** | `maybe-seed.mjs` step 5 · `pnpm db:seed:erp-precom-surveys` |
| **Ne pas** | Toucher `AssetTypeSurveyDefault` Nordica ; patcher risk-engine |
| **Done when** | Un assessment peut lancer le survey « Pré-commission ERP » et lier la réponse |

Pack additif **sûreté** (2026-09-03) : `site-surete` · `pnpm db:seed:site-surete` + `db:seed:site-surete-surveys` · mapping `AUD.SITE.SURETE` · Physsec = inspiration, pas droit FR.

Pack additif **IGH** (2026-09-03) : `igh-precommission` · `pnpm db:seed:igh-precom` + `db:seed:igh-precom-surveys` · mapping `AUD.PRECOMMISSION.IGH` · CCH R146-3 = **50 m habitation / 28 m autres** · pas CO ERP.

Pack **CNAPS** (2026-09-03) : `sec-privee-cnaps` · `pnpm db:seed:sec-privee-cnaps` (+ surveys) · CSI livre VI · formation → School.

Pack **entreprise** (2026-09-03) : `entreprise-risques` · `pnpm db:seed:entreprise-risques` (+ surveys) · ISO principes · aval SimpleRisk · **pas** `site-global` dump.

---

## Phase 4 — Tags conformité FR *(léger)*

| | |
|--|--|
| **Quoi** | Traçabilité ERP / IGH / CNAPS dans UI/PDF |
| **État 2026-09-03** | **Done** — enum étendu (pas de migration DB : TEXT[]) |
| **Tags ajoutés** | `FR_ERP` · `FR_IGH` · `FR_CNAPS` · `FR_SSI` · `FR_COMMISSION` |
| **Modifier** | `shared/src/index.ts` · client `csmp-types` · zod API · report PDF constants |
| **Déjà en place** | `complianceRefs` string[] sur pack `erp-precommission` (phase 2) |
| **Règle** | Tags = labels ; **pas** le moteur de conformité |
| **Done when** | Threats / action plans taguables FR + visibles summary/PDF |

---

## Phase 5 — Custom fields contexte site FR

| | |
|--|--|
| **Quoi** | Keys d’applicabilité sur le pack (`erp_type`, `erp_category`, `commission_phase`…) |
| **État 2026-09-03** | **Done** — schéma pack affiné + capture Scope assessment |
| **Modifier** | `TemplatePackage.customFieldSchema` pack `erp-precommission` (+ `country`, `ssiap_required`, `building_features`) |
| **Créé** | `Assessment.metadata` · `GET /assessments/custom-field-schema` · UI Scope · [`CUSTOM-FIELDS-ERP-PRECOM.md`](./cartography/CUSTOM-FIELDS-ERP-PRECOM.md) |
| **Done when** | Scope assessment capture le contexte FR nécessaire aux surveys/packs |

---

## Phase 6 — RuleSets / Applicability *(conception puis code)*

| | |
|--|--|
| **Quoi** | Couche WHAT versionnée (hors risk-engine) |
| **État 2026-09-03** | **Done (P0 design + compose)** |
| **Créé** | `docs/rulesets/DESIGN.md` · `AUD.PRECOMMISSION.ERP.applicability.json` · `server/src/modules/rulesets/` |
| **API** | `GET /assessments/:id/applicability` |
| **UI** | Panneau Scope « Composition recommandée » |
| **Honnêteté** | `docs/cartography/SOURCES-STATUS-ERP-PRECOM.md` — checklist ≠ articles Légifrance |
| **Ne pas** | Remplacer IRV/TEAR ; un mega-`EU_FIRE` ; inventer des cotes JO |
| **Done when** | « Ouvrir audit précom ERP » compose pack+surveys sans hardcode wizard |

---

## Phase 7 — Circuit plateforme

| | |
|--|--|
| **Quoi** | Ponts conceptuels Xacta · Grace · SimpleRisk · QAtrial · School |
| **État 2026-09-03** | **Done (P0)** — doc + contrat + export lecture seule |
| **Créé** | `docs/circuit/CIRCUIT-PRECOM-ERP.md` · `contracts/precom-handoff.schema.json` · `RELECTURE-SOURCES.md` |
| **API** | `GET /assessments/:id/circuit-handoff` |
| **UI** | Bouton « Export circuit JSON » (Scope) |
| **Ne pas** | Fusion apps · sync DB · imports auto |
| **Suite** | Relecture sources ([`circuit/RELECTURE-SOURCES.md`](./circuit/RELECTURE-SOURCES.md)) |

---

## Ce qu’on ne fait **jamais** dans ce programme (sauf décision explicite)

- Ajouter des steps au wizard CSMP  
- Réécrire IRV / TEAR pour « coller » à l’ERP  
- Cloner 15 repos « au cas où »  
- Fusionner Grace dans `gsms-school` prod  
- Prendre Physsec/OpenFire comme droit français  

---

## Programme résumé (checklist)

```
[ ] 0  i18n FR (toi)
[ ] 1  Carto ERP+précom mapping → leviers Grace
[ ] 2  Seed pack erp-precommission (additif)
[x] 2b Seed pack site-surete (Physsec P0 2026-09-03)
[x] 2c Seed pack igh-precommission (P0 2026-09-03)
[x] 2d Seed pack sec-privee-cnaps (P0 2026-09-03)
[x] 2e Seed pack entreprise-risques (P0 2026-09-03)
[ ] 3  Survey templates FR branchés — **done P0 2026-09-02**
[ ] 4  ComplianceTag FR si besoin UI — **done 2026-09-03**
[ ] 5  customFieldSchema contexte site — **done 2026-09-03**
[ ] 6  RuleSets + Applicability (design puis code) — **done P0 2026-09-03**
[ ] 7  Ponts circuit Xacta/SimpleRisk/QAtrial/School — **done P0 2026-09-03**
```

**Prochaine étape programme :** relecture refs officielles — [`circuit/RELECTURE-SOURCES.md`](./circuit/RELECTURE-SOURCES.md)

---

## Signal de démarrage agent

Quand tu as fini l’i18n, envoie par ex. :

> **i18n OK — lance phase 1**

…ou directement **phase 2** si la carto te suffit en skeleton.

Sans ce signal : agent = docs / carto légère seulement, **pas** de seeds dans le repo Grace.
