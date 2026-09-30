# Écarts forks locaux vs `gsms-plateforme-complet.md`

**Date :** 2026-09-06  
**Méthode :** lecture seule des forks sous `apps/*` + contrats `docs/circuit/`.  
**Canon cible :** [`gsms-plateforme-complet.md`](./gsms-plateforme-complet.md)  
**Conflit Comp AI :** **tranché 2026-09-06** — consolidée §7 gagne. Voir [`COMP-AI-DECOMPOSITION.md`](./COMP-AI-DECOMPOSITION.md) ; `STACK-GSMS-FINALE` aligné. `apps/comp` encore sur disque jusqu’à fin d’intégration Grace/QAtrial.

Légende : **ALIGNED** (bon sens) · **DIVERGES** (fait mais pas la cible) · **MISSING** (à construire).

---

## Synthèse exécutive

| Zone | Verdict |
|------|---------|
| Circuit Finding (contrat + exporters Grace/QAtrial) | **ALIGNED** (travail local réel) mais **DIVERGES** sur cycle de vie `statut` et dates |
| GRACE stack / PWA lecture | **ALIGNED** |
| GRACE écriture offline / mobile terrain / WhatsApp / Matterport | **MISSING** |
| QAtrial CAPA / score / e-sign / audit-trail | **ALIGNED** |
| QAtrial policy gen / calendrier Finding / démo retirée | **MISSING** / **DIVERGES** |
| TenderAI schéma sécu + `control_ref` | **MISSING** (toujours telecom/OM) |
| mcp-tenders | **ALIGNED** avec §12.2 (proxy LexSocket, ne pas modifier) |
| Eve MCP audit / Trust Center / rôle client externe | **MISSING** |
| CRM `RecordSource` FORM/API + `externalId` | **ALIGNED** (déjà plus avancé que le diag amont) |
| InvoicePilot vitrine + wiring CRM | **ALIGNED** partiel |
| Espace client GSMS | **MISSING** |
| Comp AI (`apps/comp`) | **DIVERGES** — encore présent alors que §7 = retiré |
| Module cyber natif | **MISSING** |

---

## §2 Collecte

### GRACE — ALIGNED / MISSING

| Point | Statut | Preuve |
|-------|--------|--------|
| React/Vite + Fastify/Prisma, `csmp-v2-api` | ALIGNED | `apps/grace/client`, `apps/grace/server`, docker `csmp-v2-api` |
| Port lab `:3011` | ALIGNED en `.env` ; défaut code encore `:3001` | `server/.env` vs `server/src/index.ts` |
| Blocage mobile &lt;767px | ALIGNED | `MobileNotSupportedOverlay.tsx` |
| PWA + offline lecture | ALIGNED | `vite-plugin-pwa`, `OfflineBanner`, Workbox GET only |
| Pages Field/Mobile/Agent | MISSING | `client/src/pages/` desktop only |
| File d’attente écriture offline + id client | MISSING | — |
| WhatsApp / Telegram / Matterport | MISSING | — |

### Module cyber — MISSING

Aucun module checklist ISO27001/SOC2 natif. `apps/comp` est encore le substitut de fait (contredit §7).

---

## §3 Finding commun

| Point | Statut | Preuve |
|-------|--------|--------|
| `finding.schema.json` + exemples | ALIGNED | `docs/circuit/contracts/` |
| Exporters Grace + QAtrial | ALIGNED | `apps/grace/server/.../circuit/findings.ts`, `apps/qatrial/server/routes/findings.ts` |
| `category`, `referentiel`, `control_ref`, `source` | ALIGNED (contrat) | schéma + exporters |
| `date_collecte` / `date_expiration` | DIVERGES | contrat a `created_at` + `due_date` optionnel, pas les noms §3 |
| `statut` brouillon \| validé \| signé | **DIVERGES fort** | enum actuel : `conforme` \| `non_conforme` \| `en_cours` \| `non_applicable` \| `a_verifier` |
| `source` inclut encore `comp` | DIVERGES vs §7 | `finding.schema.json` enum `grace|qatrial|comp|tenderai` |
| Versionnement immuable Finding validé | MISSING | — |

**Décision requise :** soit faire évoluer le contrat vers le cycle de vie §3 (brouillon/validé/signé + dates), soit amender la consolidée pour coller à l’enum conformité actuel (qui reste utile métier).

---

## §4–§5 QAtrial + fiabilité

| Point | Statut | Preuve |
|-------|--------|--------|
| Score / CAPA / audit-trail / e-sign | ALIGNED | Prisma + routes + UI |
| Mode démo retiré | **DIVERGES** | encore `demoProjects.ts`, wizard `onLoadDemo` |
| Policy generation (Ollama → consignes) | MISSING | Ollama = provider settings seulement |
| Calendrier sur `date_expiration` Finding | MISSING | `AuditSchedule` / CAPA `dueDate` ≠ Finding |
| Composants mobile | DIVERGES | fichiers présents, **non routés** (morts) |
| PWA | DIVERGES vs diag amont | SW manuel `public/sw.js` (pas le pattern Grace `vite-plugin-pwa`) |
| Offline write | PARTIEL | SW queue IndexedDB ; hook `useOfflineQueue` **non branché** ; pas d’id client |

---

## §6–§7 Sorties / retraits

| Point | Statut |
|-------|--------|
| Trust Center CRM (`apps/crm/apps/app`) | MISSING |
| TenderAI consomme Findings via `control_ref` | MISSING |
| Comp AI retiré | **DIVERGES** — `apps/comp` présent ; NextAuth partiel + better-auth résiduel |
| Xacta | ALIGNED (hors stack locale apps) |

---

## §12 TenderAI / mcp-tenders

| Point | Statut | Preuve |
|-------|--------|--------|
| Defaults telecom / OM / OMR | DIVERGES | `schema.sql`, `models.py`, `config.py` |
| Tables rfp/proposal/vendor/bom | DIVERGES (inchangé) | `app/db/schema.sql` |
| `control_ref` / `referentiel` / finding | MISSING | 0 match |
| sqlite-vec + VoyageAI | DIVERGES (encore là) | `requirements.txt`, `embeddings.py` |
| mcp-tenders proxy LexSocket | ALIGNED §12.2 | `index.js` → `mcp.lexsocket.ai/ted` |

---

## §13 CRM / Eve

| Point | Statut | Preuve |
|-------|--------|--------|
| Tools Eve 100 % vente | ALIGNED avec diag ; DIVERGES vs besoin audit | `apps/agent/agent/tools/*` |
| Client MCP `query_findings` / `trigger_audit` | MISSING | — |
| Mono-tenant `WORKSPACE_ID` | ALIGNED (limite connue) | `packages/db/src/workspace.ts` |
| Rôle client externe | MISSING | `owner|admin|member` only |
| `RecordSource` FORM/API + `externalId`/`sourceSystem` | **ALIGNED** (déjà fait localement) | Prisma + `public-intake.service.ts` |

---

## §14–§15 InvoicePilot

| Point | Statut | Preuve |
|-------|--------|--------|
| Split `_marketing` / `_app` | ALIGNED | routes |
| Wiring `GSMS_PUBLIC_API_*` / CRM | ALIGNED code ; `.env` local présent | `src/server/crm/public-client.ts` |
| Counterparty ≠ espace client | DIVERGES (encore facturation dans `_app`) | Prisma + `/clients` |
| Espace client authentifié type portal | MISSING | — |
| `cleanup-vps.sh` dangereux | DIVERGES (toujours `--volumes` + wipe) | `deploy/cleanup-vps.sh` |
| `ai-agent.ts` ≠ Eve | ALIGNED | KB facture locale |

---

## Checklist §16 — état local

### 16.1 À supprimer
- [ ] Comp AI encore dans `apps/comp` → **pas fait**
- [ ] Ne plus utiliser `cleanup-vps.sh` comme restart → **à confirmer en prod** (script encore dangereux)
- [x] Ne pas confondre Counterparty / espace client → **documenté**, code pas encore séparé

### 16.2 À développer de zéro
- [ ] Module cyber
- [ ] Écriture offline partagée (Grace manquante ; QAtrial partielle non branchée)
- [ ] Client MCP Eve
- [ ] Trust Center
- [ ] Espace client InvoicePilot
- [ ] WhatsApp/Telegram → GRACE

### 16.3 À compléter
- [ ] QAtrial policy + calendrier Finding
- [ ] GRACE responsive pages terrain
- [ ] TenderAI `control_ref`
- [ ] Finding `source_externe`
- [ ] Matterport

### 16.4 À adapter
- [ ] TenderAI schéma CNAPS / sécu privée
- [ ] Espace client à côté de Counterparty (pas dedans)

### 16.5 À relier
- [x] Finding exporters Grace ↔ QAtrial (contrat)
- [ ] QAtrial → TenderAI
- [ ] QAtrial → Trust Center CRM
- [x] InvoicePilot → CRM intake (câblé)
- [ ] Eve → outils internes MCP

### 16.7 Vérifs demandées par la consolidée
| Question | Réponse locale |
|----------|----------------|
| Comp AI NextAuth | Partiel ; better-auth encore là ; **mais §7 dit retirer** — fork encore d’actualité seulement comme archive / patron portal |
| QAtrial démo retirée | **Non** — démo encore présente |
| Finding local | **Oui** — contrat + exporters ; **diverge** sur `statut` / dates |
| Restart InvoicePilot = cleanup ? | Script dangereux encore présent ; commande prod réelle **non confirmée ici** |
| Rôle client externe CRM | **Absent** |

---

## Ordre de build recommandé (cible §8) × réalité locale

1. **Fiabilité GRACE offline write** — toujours priorité #1, inchangée  
2. Harmoniser **contrat Finding** (décision statut/dates) avant Trust Center / TenderAI  
3. QAtrial : brancher offline queue existante + retirer démo + calendrier/policy  
4. Eve MCP + Trust Center  
5. Module cyber **ou** archivage propre de `apps/comp` (trancher avec STACK-GSMS-FINALE)  
6. WhatsApp / Matterport plus tard  

---

## Questions pour Claude / Samir

1. **Canon doc :** consolidée §7 (Comp retiré) gagne-t-elle sur `STACK-GSMS-FINALE` (Comp gardé cyber) ?  
2. **Finding `status` :** garder conformité (`conforme`…) ou passer au cycle de vie (`brouillon`…) — ou les deux champs ?  
3. **`apps/comp` :** archiver hors monorepo, ou garder en lecture seule jusqu’au module cyber ?
