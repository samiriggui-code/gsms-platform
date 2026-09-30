# Comp AI — inventaire automations + dispatch

**Date :** 2026-09-06  
**Règle :** inventaire + dispatch **sans supprimer** `apps/comp` (GO user requis pour delete).  
**Inventaire machine :** [`controls/comp-trigger-inventory.json`](./controls/comp-trigger-inventory.json) — **54** tasks Trigger (**14** cron, **40** on-demand).

---

## 1. Automatisations Trigger — familles

| Famille | # approx | Cron / rôle | Dispatch GSMS |
|---------|----------|-------------|---------------|
| **onboarding** | ~12 | generate policies, risks, vendors, init org | **Pattern** → QAtrial policy gen (Ollama), pas Trigger |
| **integration-platform** | ~6 | daily checks cloud, token refresh, device sync | **Hors métier** (SaaS SOC2) |
| **cloud-security** | ~6 | scan + remediate AWS/Azure… | **Hors métier** |
| **browser-automation** | ~7 | daily scrape preuves vendor UI | **Hors métier** V1 |
| **policies / task schedules** | ~5 | revue policies / tasks 12h, digests | **Pattern** → calendrier échéances QAtrial |
| **email** | ~3 | new policy, weekly digest | Plus tard notifications Eve/QAtrial |
| **device / fleet** | ~3 | stale devices daily | **Hors métier** |
| **vendor risk / trust scrape** | ~4 | monthly + deep scrape | Trust Center CRM = pattern UI only |
| **questionnaire** | ~3 | parse / auto-answer | Inspo AO / TenderAI later |
| **vector-store / KB** | ~5 | index docs | Optionnel Memory/Tencent |
| **evidence-export** | ~1 | ZIP preuves background | **Pattern** → MinIO export later |
| **background-checks** | ~1 | hourly reconcile | **Hors métier** |
| **auditor content** | ~1 | generate auditor text | Inspo rapports |

### Crons (14)

Voir JSON `scheduled: true`. Exemples : `integration-schedule` 05:00, `cloud-security-schedule` 05:00, `browserAutomationsSchedule` 05:00, `flag-stale-devices` 06:00, `policySchedule` / `taskSchedule` */12h, `weekly-task-reminder` lundi 09:00, `vendorRiskAssessmentMonthlySchedule` 1er du mois, `reconcileBackgroundChecksSchedule` hourly.

---

## 2. Données salvage (déjà extraites)

Canon : `docs/circuit/controls/`  
**Dispatch runtime :**

| App | Chemin | Contenu |
|-----|--------|---------|
| **Grace** | `apps/grace/server/data/controls/` | SSP, ISO, SOC2, prompts, edges |
| **QAtrial** | `apps/qatrial/src/data/controls/` | SSP, ISO, SOC2, policy titles, tasks, finding categories |

---

## 3. Dispatch code (fait laptop)

### Grace
- `server/src/modules/circuit/controls-catalog.ts`
- Routes : `GET /api/controls` · `GET /api/controls/:slug`
- Monté dans `server/src/index.ts` (préfixe `/controls`)

### QAtrial
- `server/lib/controls-catalog.ts`
- `server/routes/catalogs.ts`
- Routes : `GET /api/catalogs` · `GET /api/catalogs/:slug`
- Monté dans `server/app.ts`

### Pas encore (prochaines briques)
- Module cyber UI checklist complète Grace
- Deploy NUC après smoke local

### Fait ensuite (2026-09-06 soir)
- Grace findings → `control_ref` SSP quand tags/texte matchent
- QAtrial `GET /api/catalogs/echeances` + sélecteur SSP dans AuditSchedule
- Findings QAtrial lit `SSP-xx` depuis `area`
- **Policy gen** : `POST /api/ai/policy/generate` + UI Documents (brouillon only)

---

## 4. Ce qu’on ne copie **pas** (AGPL / hors métier)

Code Trigger, connecteurs cloud, device-agent, browser automation runners, billing, better-auth stack Comp.

---

## 5. Suppression Comp

**Interdite** tant que Samir n’a pas dit GO après validation du tour + smoke Grace/QAtrial.
