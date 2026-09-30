# Comp AI — décorticage → Grace / QAtrial → (delete plus tard)

**Ops :** laptop → NUC → VPS si RAM/CPU.  
**CRM** (`apps/crm` + Eve) **reste**. **Ne pas supprimer** `apps/comp` sans GO.

## État 2026-09-06 (soir)

| Étape | Statut |
|-------|--------|
| Inventaire Trigger (54 tasks) | **Fait** → `circuit/controls/comp-trigger-inventory.json` + `COMP-AI-INVENTORY-DISPATCH.md` |
| Salvage JSON | **Fait** → `docs/circuit/controls/` |
| Dispatch JSON → Grace + QAtrial | **Fait** (copies runtime + API read-only) |
| UI checklist / policy gen / échéances | **À faire** |
| Suppression `apps/comp` | **Non** — interdit sans GO |

## API laptop (après démarrage apps)

- Grace : `GET /api/controls` · `GET /api/controls/ssp-surete` (auth)
- QAtrial : `GET /api/catalogs` · `GET /api/catalogs/policy-template-titles` (auth)
