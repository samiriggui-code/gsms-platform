# Mapping `AUD.SITE.SURETE` — familles → leviers Grace

**Date :** 2026-09-03  
**Maturité :** `draft`  
**Audit type :** `AUD.SITE.SURETE`  
**Pack :** `site-surete` (`regionScope: FR`)  
**Doctrine :** 7 steps = HOW · packs / surveys = WHAT. Physsec = **inspiration terrain**, pas du droit FR.

**Ne pas :** toucher `risk-engine.ts` · fusionner avec `erp-precommission` · importer Physsec dans Xacta/QAtrial.

---

## 1. Objectif

Walkthrough **malveillance / sûreté physique** (ACS, CCTV, portes, clés, alarme, réaction).  
Issues de secours / SSI / registre incendie restent dans `erp-precommission` (filtre CSV : Fire Indicator, Break Glass, shunt incendie, jeux de porte « fire standard »).

---

## 2. Contexte site → Grace

| Key | Obligatoire | Levier | Notes |
|-----|:-----------:|--------|-------|
| `country` | ● | customField | FR |
| `site_kind` | ● | customField | SITE / ERP / IGH / AUTRE (ERP = sûreté **en plus** du précom) |
| `has_acs` | ○ | customField | Charge focus ACS |
| `has_cctv` | ○ | customField | Croiser `SRC.FR.VIDEOPROTECTION` |
| `has_bms` | ○ | customField | GTB / SMS |
| `sensitive_zones` | ○ | customField | Texte |
| `adversary_sl_target` | ○ | customField | SL1–SL4 Physsec (profil, pas moteur) |
| `test_damage_ok` | ○ | customField | Autorise ou non les essais destructifs |

---

## 3. Modules pack `site-surete`

| Module | Famille carto | Physsec « Where found » | Survey |
|--------|---------------|-------------------------|--------|
| `mod-alarmes` | `DOM.SURETE.FAM.DETECTION` | Alarms and Monitoring | `survey-site-surete-alarmes` |
| `mod-sauvegarde` | `DOM.SURETE.FAM.PROCEDURES` | Backup and Redundancy | `survey-site-surete-sauvegarde` |
| `mod-bms` | `DOM.SURETE.FAM.DETECTION` | BMS/SMS | `survey-site-surete-bms` |
| `mod-conception` | `DOM.SURETE.FAM.ZONES` | Building design | `survey-site-surete-conception` |
| `mod-cctv` | `DOM.SEC_PHYSIQUE.FAM.CCTV` | CCTV | `survey-site-surete-cctv` |
| `mod-docs` | `DOM.SURETE.FAM.PROCEDURES` | Documentation | `survey-site-surete-docs` |
| `mod-portes` | `DOM.SEC_PHYSIQUE.FAM.PORTES` | Doors | `survey-site-surete-portes` |
| `mod-cles` | `DOM.SEC_PHYSIQUE.FAM.SERRURES_CLES` | Keys | `survey-site-surete-cles` |
| `mod-serrures` | `DOM.SEC_PHYSIQUE.FAM.SERRURES_CLES` | Locks | `survey-site-surete-serrures` |
| `mod-acs` | `DOM.SEC_PHYSIQUE.FAM.ACS` | RFID / PACS | `survey-site-surete-acs` |
| `mod-hygiene` | `DOM.SURETE.FAM.PERSONNEL` | Training / hygiene | `survey-site-surete-hygiene` |
| `mod-reponse` | `DOM.SURETE.FAM.REACTION` | Detection & response | `survey-site-surete-reponse` |

Agrégé démo : `survey-site-surete`.

---

## 4. Colonnes Physsec → Grace

| CSV | Grace |
|-----|-------|
| Where found | `TemplateModule` |
| Issue Name | `SurveyQuestion` (prompt FR encapsulant le constat) |
| Type of Issue | hint |
| Covert / Overt / Surreptitious | hint `preuve` |
| Damage during testing | hint + custom field `test_damage_ok` |
| SL1–SL4 | poids question + vocabulaire adversaire Step 2 (existant) |

`complianceRefs` pack : `CSI`, `VIDEOPROTECTION`, `AUD.SITE.SURETE`, `SRC.METH.PHYSSEC` (label inspiration, **pas** une loi).

---

## 5. Flux wizard (inchangé)

```
1 Scope     → custom fields site / ACS / CCTV / SL
  Assets    → templates du pack
2 Threats   → 1 scénario par module
3–5         → IRV existant
6 Vuln      → surveys Physsec + photos / logs
7 Treatment → CM + actions (aval QAtrial plus tard)
```

---

## 6. Hors scope

- Droit ERP / IGH / commission (autre pack)
- CNAPS organisation (pack `sec-privee-cnaps`)
- Calculs OpenFire
- Chemins d’attaque ISRA AND/OR (doc only)
- Ponts Xacta / SimpleRisk / QAtrial (Phase 7)

## 7. Done

- [x] Mapping familles → modules
- [x] Seed pack + surveys (`seed-site-surete*.mjs`)
