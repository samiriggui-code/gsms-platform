# Agent Memory — TencentDB (doctrine GSMS)

**Date :** 2026-09-03  
**Statut :** doctrine actée (lab NUC)  
**NUC :** `/opt/jarvis/TencentDB-Agent-Memory`  
**Conteneurs :** `tdai-memory-core` (:8420) · `tdai-memory-hub` (:8125 / :8424) · `tdai-proxy` (:8096) — healthy

---

## Place dans l’architecture

```
DATABASES MÉTIER (source de vérité)     AGENT MEMORY (horizontale)     AI / INTERFACE
═══════════════════════════════════     ══════════════════════════     ═══════════════
CRM Postgres                            TencentDB Agent Memory         Eve
Xacta DB                                (Hub + Proxy + Core)           Agents spécialisés
GRACE DB                                                               LLM via API
RiskManager DB                                                         Jarvis (UI / orchestre)
QAtrial DB
School DB
```

```
Jarvis
   │
Eve
   │
Agent Tender · Audit · Risk · CAPA · School
   │
   └──────────────┐
                  ▼
       TencentDB Agent Memory
```

Jarvis / Eve / agents **partagent** des souvenirs opérationnels.  
Ils **ne partagent pas** les bases métier — chaque moteur garde sa DB propre et isolée.

---

## Deux couches de réponse (exemple)

Question Jarvis : *« Qu’est-ce qui bloque chez Carrefour ? »*

| Couche | Source | Contenu |
|--------|--------|---------|
| **FACTS OFFICIELS** | Core / apps (Xacta, CAPA, CRM, Grace…) | 2 CAPA ouvertes · audit Xacta en cours · 1 formation planifiée |
| **CONTEXTE** | Tencent Memory | client relancé 2× · préfère appels le matin · dernière réunion : priorité accès arrière |

Les facts viennent toujours des DBs métier. Memory **complète**, ne **remplace** pas.

---

## Règle absolue — écriture

**TENCENT MEMORY NE PEUT JAMAIS modifier directement :**

- audit · finding · risk · CAPA · preuve  
- formation · mission · statut réglementaire  

Il peut **proposer** : *« Je pense que cette information est pertinente »*.  

**Seul le Core ou l’app spécialisée confirme avant écriture métier.**

Pas de shortcut agent → Memory → mutation métier.

---

## Types de mémoire autorisés

```
memory_type:
  - preference
  - context
  - observation
  - working_memory
  - prior_decision
  - workflow_pattern
```

### Ne jamais stocker comme vérité

- `official_status`
- `compliance_status`
- `risk_score` officiel
- `CAPA` closure
- `audit` result

Ces faits vivent dans les DBs métier. Si Memory les voit (lecture / observation), c’est un **cache contextuel**, pas une source de vérité.

---

## Bonus lab

Compression symbolique des sorties d’outils (réduction tokens) — utile pour Eve/Jarvis sur rapports et historiques longs. À mesurer en lab, pas une promesse produit.

---

## Ce que ce n’est pas

| Non | Oui |
|-----|-----|
| Second Postgres métier | Mémoire commune agents |
| Remplacement Grace / Xacta / CRM | Couche horizontale au-dessus |
| Autorité conformité / risque | Suggestions + contexte |
| « Truc inutile qui dort sur le NUC » | Socle partagé Jarvis ↔ Eve ↔ agents |

---

## Prochaines étapes (quand GO)

1. Namespaces / scopes Memory par agent (`jarvis`, `eve`, `audit`, …) + partage explicite.
2. Adapter Jarvis Core `memory_search` → Hub/Proxy (pas lecture SQL métier).
3. Gate d’écriture : Memory → proposal event → app métier valide.
4. Ne pas brancher Memory en écriture sur Xacta / Grace / QAtrial / School.

Réfs circuit : [`XACTA.md`](./XACTA.md) · [`CIRCUIT-PRECOM-ERP.md`](./CIRCUIT-PRECOM-ERP.md)
