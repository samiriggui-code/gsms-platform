# QAtrial — schéma des vues (pattern MenuCard / gsms-school)

Canon d’élaboration. Pattern copié de `gsms-school` (`MenuCard` + Section → Module → Feuille), **fichiers locaux** QAtrial — aucun import croisé.

---

## Arbre

```
ACCUEIL  /app/accueil
├── Dossiers           → /app/projects                 (table instances)
├── Référentiels       → /app/referentiels             (hub cards org)
└── Pilotage           → /app/pilotage                 (hub cards inbox)

RÉFÉRENTIELS  /app/referentiels
├── Systèmes           → /app/systems
├── Fournisseurs       → /app/suppliers
└── Formation          → /app/training

PILOTAGE  /app/pilotage
├── Tâches             → /app/tasks
└── KPI                → /app/kpi

DOSSIER  /app/projects/:id          ← hub domaines (cards)
├── Qualité            → /app/projects/:id/domains/quality
├── Conformité         → /app/projects/:id/domains/compliance
├── Documents          → /app/projects/:id/domains/documents
├── Organisation       → /app/projects/:id/domains/organization
└── Rapports           → /app/projects/:id/domains/reports

DOMAINE (ex. Qualité)  /app/projects/:id/domains/quality
├── Exigences          → …/requirements
├── Tests              → …/tests
└── Évaluation         → …/dashboard   (vues page = chips, pas nav)

FEUILLE = page métier existante (datagrid / formulaires / dashboard).
```

---

## Mapping pages actuelles

| Feuille (slug) | Domaine | Scope |
|----------------|---------|--------|
| requirements, tests, dashboard | Qualité | projet |
| change-control, deviations, audit-records, impact | Conformité | projet |
| documents, forms | Documents | projet |
| complaints, workflows | Organisation | projet |
| reports, scheduled-reports | Rapports | projet |
| systems, suppliers, training | Référentiels | org |
| tasks, kpi | Pilotage | org |

---

## Règles UI

1. **Un seul chrome app** : logo + Accueil + recherche + user (pas de peers Tâches/KPI…).
2. **Navigation progressive** : Accueil → hub cards → (dossier) → domaine cards → feuille.
3. **Dans un dossier** : barre contexte (`← Dossiers / nom`) uniquement — pas de sidebar ni 12 onglets.
4. **Évaluation** : chips « Vues de cette page » restent locaux à la feuille.
5. Circuit métier (CRM → Eve → dossier) : hors scope UI ; les hubs restent valides quel que soit le circuit.

---

## Fichiers

| Rôle | Path |
|------|------|
| Schéma runtime | `apps/qatrial/src/navigation/hub-config.ts` |
| MenuCard | `apps/qatrial/src/components/hub/MenuCard.tsx` |
| Accueil | `…/pages/AccueilPage.tsx` |
| Référentiels / Pilotage | `…/pages/ReferentielsPage.tsx`, `PilotagePage.tsx` |
| Hub dossier / domaine | `…/pages/ProjectHubPage.tsx`, `DomainHubPage.tsx` |
