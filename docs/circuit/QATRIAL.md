# QAtrial — fiche potentiel (lecture, pas docker)

**Date :** 2026-09-03  
**Clone :** `apps/qatrial` ← https://github.com/MeyerThorsten/QAtrial.git  
**Licence :** AGPL-3.0  
**Installé :** non · **Docker :** non lancé (`docker-compose.yml` → http://localhost:3001)

---

## Rôle GSMS

**CAPA / anomalies / efficacité** après le terrain Grace.

Pas le LMS (School) ni le walkthrough (Grace).

---

## Stack

React 19 + Hono + Prisma + PostgreSQL 16. Dual mode : localStorage démo ou serveur.

Objet cœur (schema) : `CAPA` — `open` → rootCause / containment / corrective / preventive / `effectivenessCheck`. Aussi `Deviation`, `Evidence`, `Approval`, signatures, audit trail.

---

## Overlap / couper

Garder : CAPA, déviations, e-sig, audit trail, preuves.

**Couper :** verticals GxP (pharma, UDI, eTMF, batch records, LIMS), module **Training** (doublon School), ISO 27001 pack comme cœur sûreté/incendie.

---

## 5 objets à pontifier

| Handoff Grace | QAtrial |
|---------------|---------|
| `capas[]` (`action_plan` / `gap`) | `CAPA` |
| `ActionPlan.actionRequired` | `correctiveAction` |
| owner / due | champs CAPA |
| evidence refs | `Evidence` (lien, pas blob sync) |
| `trainingHints[]` | **pas** le module training QAtrial → School |

Boucle : QAtrial efficacité → contre-visite Grace (survey retest).

---

## Verdict

Meilleur candidat **premier docker circuit** quand un finding Grace existe (CAPA visible). Pas cette vague. Pas de Physsec dedans.
