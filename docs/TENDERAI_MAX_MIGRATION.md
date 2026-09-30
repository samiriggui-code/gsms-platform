# TenderAI MAX Migration — NUC

**Date :** 2026-09-03  
**Host :** `jarvis-nuc` / `192.168.1.37`  
**Mission :** `dbugom/tenderai-mcp-server` → `dbugom/tenderai-mcp-server-max`

---

## OLD

| Field | Value |
|-------|-------|
| Repo | `https://github.com/dbugom/tenderai-mcp-server` |
| Path (archived) | `/opt/gsms/tenderai-mcp-server-legacy` |
| Commit | `d84e2ea` — *Add get_proposal_details tool and enrich list output* |
| Runtime | Python 3.14 venv · systemd `gsms-tenderai` (avant bascule) |
| Port | `8090` |
| DB | SQLite `db/tenderai.db` + sqlite-vec |
| Local patch | `requirements.txt` pin `mcp[cli]<2` · scripts `smoke.sh` / `fix-mcp.sh` / `install-gsms.sh` |

### Local mods (pré-migration)

| Fichier | Modification | Nécessaire MAX ? |
|---------|--------------|------------------|
| `requirements.txt` | pin `mcp[cli]>=1.9.0,<2` | **Oui** — mcp 2.x casse FastMCP |
| `smoke.sh` / `fix-mcp.sh` / `install-gsms.sh` | scripts GSMS lab | Réutilisés / adaptés |

---

## MAX

| Field | Value |
|-------|-------|
| Repo | `https://github.com/dbugom/tenderai-mcp-server-max` |
| Path | `/opt/gsms/tenderai-mcp-server-max` |
| Symlink actif | `/opt/gsms/tenderai` → MAX |
| Commit upstream | `772335c` — *Update docs with OAuth 2.0 authentication details* |
| Runtime | venv dédié · systemd `gsms-tenderai` |
| Port | **8090** |
| DB | `./db/tenderai.db` (copiée depuis OLD — schema identique) |
| Transport | HTTP + Bearer `MCP_API_KEY` |

### Patches GSMS appliqués sur MAX

1. **`mcp[cli]<2`** (même pin que OLD)
2. **Optional LLM / data-tool mode** dans `app/server.py` — si `ANTHROPIC_API_KEY` vide → pas de second LLM (doctrine Eve / Agent Tender)
3. **`app/tools/indexing.py`** copié depuis OLD → tools `save_proposal_index` + `get_proposal_details` + mode data-tool indexing

---

## DIFFERENCE (code réel)

| Sujet | OLD (main) | MAX (stock) | Impact GSMS |
|-------|------------|-------------|-------------|
| Tools de base (18) | Oui | Oui | Compatible |
| `get_proposal_details` / `save_proposal_index` | Oui | **Non** (stock) | Regained via patch indexing OLD |
| Schema SQLite | Identique | Identique | Migration données OK |
| LLM gating | Optional si clé vide | **Toujours** `LLMService(...)` | Stock MAX contredit le README « No API key » |
| `ANTHROPIC_API_KEY` | Optionnelle | Requise pour tools génératifs (stock) | Patch GSMS = data-tool |
| Anthropic dans requirements | Oui | Oui | Conservé — non appelé si clé vide |
| OAuth / nginx setup | Présent | Présent | **Non utilisé** (pas Claude Desktop obligatoire) |
| Commit freshness | Plus récent | Plus ancien (fév. 2026) | MAX = édition marketing ; mainline OLD était en avance |

### Tools actifs après bascule (20)

```
parse_tender_rfp, generate_compliance_matrix, check_submission_deadline,
validate_document_completeness, write_technical_section, build_full_technical_proposal,
generate_architecture_description, write_compliance_narrative, ingest_vendor_quote,
build_bom, calculate_final_pricing, generate_financial_proposal, draft_partner_brief,
create_nda_checklist, track_partner_deliverable, index_past_proposal,
search_past_proposals, list_indexed_proposals, save_proposal_index, get_proposal_details
```

---

## LLM (point critique)

```
Doctrine GSMS :
  Eve / Agent Tender = raisonnement LLM
  TenderAI MAX      = outils MCP / données / parsing / DOCX

Stock MAX :
  - imports anthropic + app/services/llm.py
  - tools document/technical/financial/partners appellent llm.generate*
  - server.py instancie TOUJOURS LLMService

Patch GSMS :
  - ANTHROPIC_API_KEY laissée vide en lab
  - server log : « LLM service disabled — data-tool mode »
  - indexing en data-tool (Agent fournit l’analyse)
  - tools génératifs sans clé échoueront jusqu’à ce qu’Eve/Agent
    fournisse le contenu OU qu’on active une clé volontairement
```

**Conclusion :** dépendance Anthropic **présente** dans le code/deps ; **non utilisée** au runtime lab (clé vide). Pas de Claude Desktop obligatoire.

---

## DATA

| | |
|--|--|
| Backup | `/backups/tenderai-pre-max-20260903-1424/` |
| Old storage (legacy) | `/opt/gsms/tenderai-mcp-server-legacy/db` + `data` |
| New storage | `/opt/gsms/tenderai-mcp-server-max/db/tenderai.db` + `data` |
| Migration | Copie DB + rsync `data/` (schema diff vide) |
| Status | **OK — zéro perte** |

---

## GSMS CONNECTION

| | |
|--|--|
| Before | `gsms-tenderai` → `/opt/gsms/tenderai` (OLD) `:8090` |
| After | `gsms-tenderai` → `/opt/gsms/tenderai-mcp-server-max` `:8090` |
| Symlink | `/opt/gsms/tenderai` → MAX |
| Status | **ACTIVE** · MCP initialize + tools/list OK |

---

## ROLLBACK

```bash
systemctl stop gsms-tenderai
# restore unit WorkingDirectory + EnvironmentFile + ExecStart to legacy
# or: rm symlink ; mv legacy back to /opt/gsms/tenderai ; restore unit from backup
cp /backups/tenderai-pre-max-*/gsms-tenderai.service /etc/systemd/system/
# adjust paths to /opt/gsms/tenderai-mcp-server-legacy OR rename legacy → tenderai
systemctl daemon-reload
systemctl start gsms-tenderai
```

Rollback available: **YES** (legacy intact + backup `.env`/db)

---

## NUC impact

- OLD + MAX en parallèle testés sur `:8090` / `:8091` sans conflit
- Autres services (CRM, Xacta, RiskManager, QAtrial, tdai-hub) health OK après bascule
- RAM ~5 GiB used / ~9 GiB available — pas d’anomalie
