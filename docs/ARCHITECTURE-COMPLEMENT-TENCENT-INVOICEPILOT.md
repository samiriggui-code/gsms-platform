# COMPLÉMENT ARCHITECTURE — Tencent + AIInvoicePilot

> **2026-09-04 :** complément historique. Canon = [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md).  
> InvoicePilot = vitrine/portail · Comp CRM = Core · LexSocket trouve / TenderAI répond.

**Statut :** complément — 2026-09-03 (ne remplace pas le stack finale)  
**Parent :** [`ARCHITECTURE.md`](./ARCHITECTURE.md) / [`STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md)  

---

## 1. Architecture cible mise à jour

```text
                         INTERNET
                            │
                            ▼
                ┌──────────────────────┐
                │  AIINVOICEPILOT      │
                │  REFONDU             │
                │  = GSMS PUBLIC       │
                │  vitrine · leads     │
                │  demandes · login    │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  COMP AI CRM         │
                │  = GSMS CORE         │
                │  cockpit consolidé   │
                └──────────┬───────────┘
                           │
                           ▼
                         EVE
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
         Agent CRM    Agent Tender   Agent Audit
             │             │             │
             │             ▼             ├── XACTA ↕ GRACE
             │        TENDER MCP         └── QATRIAL
             │
             └─────────────┬─────────────┘
                           ↕
              ┌────────────────────────┐
              │ TENCENTDB AGENT MEMORY │
              │ MÉMOIRE HORIZONTALE    │
              └────────────────────────┘
```

---

## 2. Tencent — position exacte

- **Déjà installé NUC** (`tdai-*` healthy). Ne pas réinstaller.
- **Mémoire cognitive** Eve/agents — **pas** business DB.
- Horizontal sous Eve (↕), **pas** une étape du circuit Xacta→Grace.
- Doctrine : `LLM pense → Agent propose → Tencent mémorise → App valide → Business DB → CRM centralise`.
- Détail : [`circuit/AGENT-MEMORY-TENCENT.md`](./circuit/AGENT-MEMORY-TENCENT.md) · [`GSMS_TENCENT_MEMORY_MAP.md`](./GSMS_TENCENT_MEMORY_MAP.md)

---

## 3. AIInvoicePilot — nouvelle mission

| Avant | Après (cible fonctionnelle) |
|-------|------------------------------|
| Produit autonome e-facture 2026 | **Façade publique GSMS Platform** |
| Back-office facturation | **Comp CRM = back-office** (ne pas recopier) |

Cible publique : site vitrine, services, contact, leads, demande audit/AO, dépôt docs, login plateforme.

**Frontière technique InvoicePilot ↔ CRM : NON FIGÉE** — voir audit + [`AIINVOICEPILOT_CRM_INTEGRATION_DECISION.md`](./AIINVOICEPILOT_CRM_INTEGRATION_DECISION.md).

---

## 4. Règles absolues (rappel)

- Pas de second CRM / sync Lead↔Lead.
- Pas `InvoicePilot → Tencent → CRM` (Tencent ≠ bus d’intégration).
- Pas n8n pour relances (Eve `schedule_recheck`).
- Pas de modification structurelle avant validation des livrables discovery.
