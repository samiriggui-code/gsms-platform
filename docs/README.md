# GSMS Platform — Laboratoire des applications

**Créé :** 2026-09-02 · **MAJ stack :** 2026-09-04  
**Chemin :** `C:\laragon\www\gsms-platform`

Laboratoire plateforme GSMS : **laptop** → smoke → **NUC** (lab) → **VPS** seulement si RAM/CPU insuffisants. Pas de fusion des apps, pas de DB partagée.

---

## Source de vérité

| Doc | Rôle |
|-----|------|
| **[`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md)** | **Canonique** — rôles, principes, chantiers |
| [`EVE-CRM-CAPABILITES-ET-CHANTIERS.md`](./EVE-CRM-CAPABILITES-ET-CHANTIERS.md) | Eve vs OpenClaw, architecture agent, pages agentic, DealFact |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Résumé aligné (renvoie au stack finale) |
| [`DOCTRINE.md`](./DOCTRINE.md) | Interdits HOW/WHAT, gate GRACE |
| [`GSMS_STACK_STATUS.md`](./GSMS_STACK_STATUS.md) | État ops NUC (peut différer du lab laptop) |
| [`HANDOFF-CURSOR.md`](./HANDOFF-CURSOR.md) / [`HANDOFF-CLAUDE.md`](./HANDOFF-CLAUDE.md) | Relais agents |
| [`JARVIS_SURFACE_ENGINE_RESEARCH.md`](./JARVIS_SURFACE_ENGINE_RESEARCH.md) | Jarvis grand écran — scene/layout engine (pas Generative UI) |

---

## Règles (agent & humain)

| Autorisé | Interdit |
|----------|----------|
| Observer, adapter **une** app, documenter | Fusionner les apps / DB partagée |
| Brancher via API / MCP selon stack finale | Monter toute la stack en local |
| Déployer NUC puis VPS si ressources | Recréer Eve / second agent concurrent |
| | Modifier le GSMS de production sans GO |

---

## Structure apps (cible)

```
gsms-platform/apps/
├── InvoicePilot-AI/   # vitrine + portail (_app) + legacy e-facture
├── crm/               # CRM + Eve = Core / cockpit (à garder)
├── grace/             # audit physique + futur module cyber
├── qatrial/           # CAPA / policy / échéances
├── tenderai-mcp-server-max/  # AO — répondre (MCP)
└── mcp-tenders/       # proxy LexSocket (veille)
```

**Comp AI GRC** (`apps/comp`) : **supprimé** laptop 2026-09-06 — salvage dans `docs/circuit/controls/`. Voir `COMP-AI-DECOMPOSITION.md`.

---

## Rôles métier (2026-09-04)

| App | Rôle |
|-----|------|
| **InvoicePilot** | Marketing + portail missions (pas un CRM) |
| **Comp CRM** | CRM réel + Eve |
| **GRACE** | Audit terrain / sécurité physique |
| **TenderAI MCP** | Traiter un AO trouvé |
| **LexSocket** | Trouver / veiller les AO |
| **QAtrial** | CAPA |
| **Comp AI** | Cyber GRC si besoin client |
| **SimpleRisk / School audit auto** | Hors circuit |

---

## Circuit (simplifié)

```
CLIENT → InvoicePilot (vitrine)
      → Comp CRM + Eve
           ├─ LexSocket → (AO trouvé) → TenderAI
           └─ GRACE → QAtrial
```

Détail : [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md).

---

## Cartographie / RuleSets

Toujours utiles pour le métier FR (ERP, IGH, commissions) : [`cartography/`](./cartography/) · [`rulesets/`](./rulesets/).

Inspiration (pas apps) : [`INSPIRATION-SOURCES.md`](./INSPIRATION-SOURCES.md).
