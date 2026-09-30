# Mapping `AUD.ENTREPRISE.RISQUES` — familles → leviers Grace

**Date :** 2026-09-03  
**Maturité :** `draft` (pack P0 seedé)  
**Pack :** `entreprise-risques` (`regionScope: FR`)

Honnêteté : [`../SOURCES-STATUS-ENTREPRISE-RISQUES.md`](../SOURCES-STATUS-ENTREPRISE-RISQUES.md)

---

## Objectif

Checklist **gouvernance** risque / continuité / prévention employeur.

- Registre de risques → **SimpleRisk** (pas Grace)  
- Formations → **GSMS School**  
- Terrain portes/CCTV/ERP/IGH → packs dédiés  

ISO 31000 / 22301 = **principes**, pas certification.

---

## Contexte

| Key | Obligatoire | Notes |
|-----|:-----------:|-------|
| `country` | ● | FR |
| `org_size` | ○ | TPE…GE |
| `has_security_provider` | ○ | croise CNAPS |
| `has_pca` | ○ | |
| `cer_nis2_status` | ○ | flag seulement |
| `simplerisk_linked` | ○ | |

---

## Modules

| Module | Famille | Survey |
|--------|---------|--------|
| `mod-ent-gouv-risque` | `DOM.AUDIT_ENTREPRISE.FAM.GOUV_RISQUE` | gouv |
| `mod-ent-documentaire` | `…DOCUMENTAIRE` | docs |
| `mod-ent-formation` | `…FORMATION` | formation |
| `mod-ent-continuite` | `…CONTINUITE` | continuité |
| `mod-ent-prevention` | CT / DUERP | prévention |
| `mod-ent-sous-traitance` | `…SOUS_TRAITANCE` | prestataires |

Agrégé : `survey-entreprise-risques` (12 Q).

---

## Hors scope

Mega RuleSet CER/NIS2 · dump ISO · fusion avec SimpleRisk DB · site-global dump
