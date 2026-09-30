# Référentiel QAtrial — à quoi sert quoi

Document de lecture pour Samir / Cursor / Claude.  
Canon IA : **2 paliers seulement**. Source : code `apps/qatrial` (routes + schéma données), 2026-09-08.

---

## 1. QAtrial en une phrase

**QAtrial = outil interne GSMS pour piloter la qualité / conformité d’un dossier**  
(exigences → tests → preuves → écarts → CAPA → rapports),  
pas une vitrine client, pas le CRM, pas Grace (audits terrain).

Dans la stack GSMS : **CAPA / audit-trail / findings** en bout de circuit (`STACK-GSMS-FINALE.md`).

Un **dossier** (= `Project`) = un chantier qualité (ex. un logiciel, un site, une mission).  
Tout le métier « dans le dossier » est filtré par `projectId`.  
Certaines pages sont **transverses** à l’org (`orgId`) : fournisseurs, systèmes informatisés, formation, inbox de tâches.

---

## 2. Les 2 paliers (règle d’or)

**Preuve de la confusion (3 chrome) :** [`QATRIAL-NAV-DIAGNOSTIC.md`](./QATRIAL-NAV-DIAGNOSTIC.md) + capture `qatrial-nav-confusion-3-layers.png`.

```
┌─ APP : [QA]  Dossiers   Référentiels ▾      🔍  👤 ─────────────┐
├─ DOSSIER (si ouvert) : ← Dossiers / [nom ▾]                     │
│   onglets : Exigences | Tests | Évaluation | …                  │
├─ PAGE (ex. Évaluation) : chips « Vues de cette page »           │
│   ≠ 3ᵉ palier nav                                               │
└─────────────────────────────────────────────────────────────────┘
```

| Couche | UI | Quand |
|--------|-----|--------|
| App | Top minimal + dropdown Référentiels | Toujours |
| Dossier | `ProjectChrome` (retour + onglets) | Dossier ouvert seulement |
| Page | Chips secondaires (Évaluation) | Dans la page |

**Interdit :** peers horizontaux Tâches/KPI/Systèmes à côté de Dossiers · sidebar + bandeau peers en même temps.

---

## 3. Arborescence actuelle (après triage 2026-09-08)

### Palier 1 — Workspace

| URL | Écran | Rôle |
|-----|--------|------|
| `/app/projects` | **Dossiers** | Table / cartes de tous les projets : état, couverture tests/exigences, lien vers le dossier |

### Outils transverses (org — hors d’un dossier)

| URL | Écran | Rôle | Analogie métier |
|-----|--------|------|-----------------|
| `/app/tasks` | Tâches | Inbox des tâches assignées **tous dossiers** | « Ma todo du jour » |
| `/app/kpi` | KPI | Tableaux de bord configurables **org** | Pilotage transverse |
| `/app/systems` | Systèmes | Inventaire systèmes informatisés (GAMP) | Catalogue SI |
| `/app/suppliers` | Fournisseurs | Référentiel fournisseurs | Achats / qualif. |
| `/app/training` | Formation | Cours / matrice de compétences | RH / habilitations |

### Palier 2 — Dans un dossier `/app/projects/:id/…`

#### Qualité opérationnelle (cœur QAtrial)

| Slug | Écran | Rôle |
|------|--------|------|
| `requirements` | **Exigences** | Ce qu’il faut prouver / respecter (liste, statut, traçabilité) |
| `tests` | **Tests** | Protocoles / exécutions qui couvrent les exigences |
| `dashboard` | **Évaluation** | Vue d’ensemble **de ce dossier** (couverture, gaps, risque, CAPA, tendances…) |

#### Conformité réglementaire

| Slug | Écran | Rôle |
|------|--------|------|
| `change-control` | Maîtrise des changements | Demandes de changement liées au dossier |
| `deviations` | Déviations | Écarts / non-conformités |
| `audit-records` | Audits | Enregistrements d’audit du dossier |
| `impact` | Analyse d’impact | Graphe d’impact entre entités du dossier |

#### Documents & preuves

| Slug | Écran | Rôle |
|------|--------|------|
| `documents` | Documents | Preuves / docs rattachés au dossier |
| `forms` | Formulaires | Remplir / soumettre (templates souvent org — écran encore MIXTE) |

#### Organisation (nom trompeur — données souvent projet)

| Slug | Écran | Rôle |
|------|--------|------|
| `complaints` | Réclamations | Plaintes liées au dossier |
| `workflows` | Flux de travail | Exécutions / templates (MIXTE org + projet) |

#### Rapports

| Slug | Écran | Rôle |
|------|--------|------|
| `reports` | Rapports | Générer VSR / traçabilité / etc. **pour ce dossier** |
| `scheduled-reports` | Rapports planifiés | Planifications (liste plutôt org — MIXTE) |

### Settings `/app/settings/…`

Config **tenant / user** (thème, IA, webhooks, SSO, équipe).  
⚠ Import-export et piste d’audit sont encore là alors qu’ils portent sur le **projet actif** → à déplacer plus tard.

### Hors app (liens token)

| URL | Rôle |
|-----|------|
| `/audit/:token` | Mode auditeur (lecture d’un dossier via lien) |
| `/supplier/:token` | Portail fournisseur |

---

## 4. Parcours type (comment on travaille)

1. Ouvrir **Dossiers** → voir l’état de tous les chantiers.  
2. Cliquer une ligne → on entre dans le dossier.  
3. **Exigences** → définir / importer ce qui doit être couvert.  
4. **Tests** → lier et exécuter.  
5. **Évaluation** → voir couverture / gaps / risque.  
6. Si écart → **Déviations** / CAPA (via évaluation) / **Change control**.  
7. **Documents** → preuves.  
8. **Rapports** → sortir la doc pour audit.

Les outils transverses (fournisseurs, formation, systèmes) se consultent **sans** ouvrir un dossier : ce sont des catalogues partagés.

---

## 5. Ce que QAtrial n’est pas

| App | Rôle |
|-----|------|
| **CRM + Eve** | Devis, contacts, pipeline commercial → peut **amorcer** un dossier QAtrial |
| **Grace** | Audits / assessments terrain (pattern liste → détail, look UI copié) |
| **InvoicePilot** | Vitrine marketing GSMS (à retirer plus tard) |
| **gsms-school** | Formation publique / organisme |

---

## 6. Dette IA connue (pas encore corrigée)

| Sujet | Problème | Cible |
|-------|----------|--------|
| Forms / Workflows / Scheduled reports | ~~sous dossier~~ | **Tranché 2026-09-08 → menu principal** (`/app/forms`, `/app/workflows`, `/app/scheduled-reports`) — pages encore MIXTE data |
| Settings import / audit trail | Sous settings mais data projet | Sous le dossier |
| Dashboard Prédictif | Mélange analytics projet + org | Scinder |
| Portfolio UI | Cartes ; Samir attend une **table** claire | Table avancement + lien |

---

## 7. Glossaire rapide

| Terme UI | Sens |
|----------|------|
| Dossier / Project | Unité de travail qualité |
| Exigence | Obligation / critère à couvrir |
| Test | Preuve d’exécution / protocole |
| Couverture | ≈ tests / exigences (proxy actuel) |
| Déviation | Écart constaté |
| CAPA | Corrective / Preventive Action |
| Évaluation | Dashboard **d’un** dossier |
| Workspace | **Uniquement** la vue `/app/projects` |

---

*Mettre à jour ce fichier à chaque changement de nav ou de scope (GLOBAL vs PROJET).*
