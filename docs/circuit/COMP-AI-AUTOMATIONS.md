# Comp AI — automatisations (inventaire honnête)

**Date :** 2026-09-06  
**Contexte :** après suppression laptop de `apps/comp`.  
**Honnêteté :** on a regardé les **grosses familles** (Trigger.dev, integrations cloud, policy regen, export preuves). **Pas** un listing fichier-par-fichier de chaque task avant delete.

## Ce que Comp automatisait (familles)

| Famille | Quoi | Utile GSMS ? |
|---------|------|----------------|
| **Evidence automation** (Trigger + API `/tasks/.../automations`) | Collecte récurrente de preuves depuis systèmes connectés | **Non en V1** — GSMS = preuves terrain / upload manuel, pas SaaS SOC2 startup |
| **Cloud checks** (AWS / Azure / GCP / GitHub) | Checks conformité auto → tâche cochée | **Non** — hors métier sécu privée / ERP ; connecteurs cloud = discard |
| **Schedules quotidiens** | `run-task-integration-checks`, sync employés | **Non** — lié au SaaS multi-tenant Comp |
| **Policy regenerate** (Trigger + LLM) | Régénère politiques depuis templates | **Oui comme idée** → QAtrial policy gen **locale** (Ollama), pas Trigger.dev |
| **Bulk evidence export** (ZIP/PDF S3) | Export auditeur en job background | **Oui comme idée** → plus tard MinIO + job simple (Eve / queue Grace), pas Trigger SaaS |
| **Agents MCP / browser** (story Trigger) | Agents qui scrapent des APIs pour preuves | **Non** — hors scope prestations GSMS |
| **Notifications** (Novu etc.) | Alertes compliance | **Partiel** → calendrier échéances QAtrial / Eve, pas la stack Novu |

## Ce qui a été récupéré concrètement

- **Données** catalogues / titres (controls, policies, tasks) → `docs/circuit/controls/`
- **Patterns** checklist + upload + policy brouillon + Trust Center → `docs/circuit/PATTERNS-FROM-COMP-AI.md`
- **Pas** le code Trigger, **pas** les connecteurs, **pas** les crons Comp

## Décision

Pour GSMS, les « automatisations » Comp utiles se réduisent à :

1. **Générer un brouillon de consigne/policy** à partir de Findings (QAtrial)  
2. **Alerter avant échéance** d’un contrôle / habilitation (QAtrial calendrier)  
3. **Plus tard** : export dossier de preuves (MinIO)  

Le reste (cloud auto-evidence, Trigger.dev, sync employés, MCP scrape) = **jetable** pour ton métier.

## Si tu veux creuser plus tard

Repo upstream encore public : `https://github.com/trycompai/comp` — dossiers typiques `apps/api/src/trigger/`, `packages/integration-platform`.  
On peut recloner **en lecture seule** pour lister les noms de tasks exacts, sans remettre Comp dans la stack.
