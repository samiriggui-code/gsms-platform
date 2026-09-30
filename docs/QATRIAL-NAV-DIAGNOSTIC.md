# Diagnostic navigation QAtrial — confusion 3 couches

**Capture preuve :** [`qatrial-nav-confusion-3-layers.png`](./qatrial-nav-confusion-3-layers.png)  
(Samir, 2026-09-08 — écran Évaluation / Prédictif, dossier `test`)

---

## Ce que la capture montre (3 menus en même temps)

Samir a encerclé **trois bandes de navigation** qui se concurrencent :

| # | Zone (capture) | Rôle réel | Problème |
|---|----------------|-----------|----------|
| **1** | Bandeau haut : Dossiers · Tâches · KPI · Inventaire · Fournisseurs · Formation | Mélange workspace + outils org en **peers** | On croit que « Formation » = même niveau qu’un dossier |
| **2** | Onglets sous le titre : Vue d’ensemble · Conformité · ISO · Risque · Preuves · CAPA · Tendances · Anomalies · Prédictif | **Sous-vues d’une seule page** (`DashboardPage` / Évaluation) | Ressemble à un 3ᵉ palier de navigation app |
| **3** | Sidebar gauche : Exigences · Tests · Évaluation · Change control… | Vrai menu **du dossier ouvert** | Concurrent du bandeau 1 + confondu avec 2 |

Résultat ressenti : **confusion totale** — impossible de savoir « où je suis » (app / dossier / sous-vue).

```
AVANT (capture) — 3 chrome qui crient en même temps

┌─ 1 TOP : Dossiers | Tâches | KPI | Systèmes | … ─────────────┐
├─ 3 SIDEBAR dossier ─┬─ 2 onglets page Évaluation ────────────┤
│ Exigences           │ Vue | Conformité | … | Prédictif       │
│ Tests               │                                        │
│ Évaluation ●        │  contenu                               │
└─────────────────────┴────────────────────────────────────────┘
```

---

## Concept cible (patterns GitHub / Vercel / Linear)

**Deux paliers d’app seulement.** Les onglets Évaluation restent des **outils de page**, pas de la nav globale.

```
APRÈS

┌─ APP chrome : [QA]  Dossiers    Référentiels ▾     🔍  👤 ──┐
│   (toujours)                                                 │
├─ DOSSIER chrome (uniquement si dossier ouvert) ──────────────┤
│  ← Dossiers / [test ▾]                                       │
│  Exigences | Tests | Évaluation | Déviations | …             │
├──────────────────────────────────────────────────────────────┤
│  Page Évaluation                                             │
│  vues : Vue d’ensemble · … · Prédictif   ← style secondaire  │
│  (pas une 3ᵉ barre de nav app)                               │
└──────────────────────────────────────────────────────────────┘
```

| Couche | UI | Quand |
|--------|-----|--------|
| App | Top minimal + **Référentiels** (dropdown) | Toujours |
| Dossier | Context bar + onglets underline | Seulement dossier ouvert |
| Page | Chips / onglets légers (Évaluation) | Dans la page concernée |

---

## Règle produit (à ne plus casser)

1. **Jamais** mettre Tâches / KPI / Systèmes / Fournisseurs / Formation en peers de « Dossiers » sur une barre pleine largeur.  
2. **Jamais** afficher sidebar dossier + bandeau peers org en même temps.  
3. Les onglets Overview / Prédictif / etc. = **vues d’Évaluation**, libellés / style plus discrets que la nav dossier.

Voir aussi : [`QATRIAL-REFERENTIEL.md`](./QATRIAL-REFERENTIEL.md).
