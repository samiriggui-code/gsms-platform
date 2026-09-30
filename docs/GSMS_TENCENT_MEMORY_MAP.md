# GSMS Tencent Memory Map

**Date :** 2026-09-03  
**Infra NUC :** `/opt/jarvis/TencentDB-Agent-Memory` · `tdai-memory-core` :8420 · hub :8125/:8424 · proxy :8096  
**Doctrine parent :** [`circuit/AGENT-MEMORY-TENCENT.md`](./circuit/AGENT-MEMORY-TENCENT.md)

---

## WHAT TO REMEMBER

| Type | Exemples |
|------|----------|
| preference | client préfère rapports courts ; appels le matin |
| context | mission AUD-042 ; ambiguïté contrôle C-17 |
| observation | agent a noté une preuve manquante |
| working_memory | points à reprendre à la prochaine session |
| prior_decision | « on a proposé de demander un complément » (non officiel) |
| workflow_pattern | conventions internes GSMS |

## WHAT NOT TO REMEMBER (as truth)

| Interdit | Valeur officielle vit dans |
|----------|----------------------------|
| statut audit / conformité | Xacta |
| risk score / risk scenario | Xacta |
| CAPA closure | QAtrial |
| finding / evidence | Xacta / Grace |
| Lead / Deal / Company | Comp CRM |
| facture / PA | (hors) |

Souvenir ≠ preuve. Observation ≠ finding. Conclusion LLM ≠ risque.

## SCOPES (conceptuel — à brancher après audit API Tencent)

```text
user · client · project · mission · agent · workflow
```

Pas de mémoire globale incontrôlée « tous agents voient tout ».

## RETENTION / ACCESS

- À définir avec Hub/Proxy existants (pas de 2e système).
- Lecture agents via adapter Eve → Hub (pas SQL métier).
- Écriture Memory → **proposal** ; mutation métier = app uniquement.

## AGENT OWNERSHIP

| Agent | Memory role |
|-------|-------------|
| Agent CRM | prefs client, historique relances (contexte) |
| Agent Tender | contexte AO, décisions de drafting |
| Agent Audit | contexte mission, handoff notes |

## BUSINESS DB BOUNDARIES

```text
Tencent ≠ Business Truth
Tencent ≠ API gateway
Tencent ≠ CRM sync bus
```

Flux interdit : `AIInvoicePilot → Tencent → CRM`.
