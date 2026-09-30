# Routage d’extraction — Grace vs circuit

**Date :** 2026-09-03  
**Doctrine :** [`DOCTRINE.md`](./DOCTRINE.md) · [`INSPIRATION-SOURCES.md`](./INSPIRATION-SOURCES.md)

Règle : checklist terrain = **Grace**. Mission = **Xacta**. CAPA = **QAtrial**. Registre = **SimpleRisk**. Formation = **School**. Si deux cases matchent, Grace gagne tant que c’est du walkthrough.

## Méthodos → apps

| Source | Grace | Pas Grace |
|--------|--------|-----------|
| Physsec CSV | Pack `site-surete` (surveys) | Xacta checklists, SimpleRisk, QAtrial |
| Thales ISRA | Idées HOW (doc) — pas de pack | App Electron |
| OpenFire | Calculateur FSE **plus tard** | Pack ERP/IGH |
| JRC FSE | Doctrine + champ `design_approach` | Mega-pack `EU_FIRE` |
| Droit FR | Packs ERP / IGH / CNAPS | GitHub d’inspiration |

## Circuit (Phase 7 — pas maintenant)

```
Xacta (mission) → Grace (terrain) → SimpleRisk (risque) → QAtrial (CAPA) → School (former)
```

Clones : `apps/xacta` · `apps/simplerisk` · `apps/qatrial` — **pas installés**, **pas de pont API** tant qu’un finding Grace n’existe pas.

## Packs Grace

| Pack | Statut | Source de vérité |
|------|--------|------------------|
| `erp-precommission` | seedé | Légifrance ERP / CCH |
| `site-surete` | seedé P0 | CSI / vidéoprotection + Physsec (inspiration) |
| `igh-precommission` | seedé P0 | CCH R146 + arrêté IGH 30/12/2011 (checklist, pas article-atomique) |
| `sec-privee-cnaps` | seedé P0 | CSI livre VI / CNAPS (checklist, pas article-atomique) |
| `entreprise-risques` | seedé P0 | ISO 31000/22301 principes · CT · aval SimpleRisk |
| `site-global` | — | orchestrateur (compose packs), **pas** un dump |
