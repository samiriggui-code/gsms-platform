# GSMS STACK STATUS — NUC jarvis-nuc

> **Canon plateforme :** [`GSMS-PLATFORM-CORE-V2.md`](../architecture/GSMS-PLATFORM-CORE-V2.md). Ce fichier = **état ops NUC** (peut différer du lab laptop).  
> **Split NUC/VPS :** [`GSMS_NUC_VPS_SPLIT.md`](./GSMS_NUC_VPS_SPLIT.md) — NUC = lab **IP locale** · VPS = prod **FQDN** · Tencent **reste NUC**.

**Date :** 2026-09-05 (split NUC/VPS + OOM Comp)  
**Host :** `nuc` / `192.168.1.37` (SSH `jarvis-nuc` / `jarvis-nuc-wan`)  
**OS :** Ubuntu (Linux 7.0.0-30-generic)  
**Docker :** 29.1.3 · Compose 2.40.3  

---

## 1. Architecture lab

```
  VPS 187.77.166.124 (FQDN prod, autre agent)
  NUC 192.168.1.37   (lab IP + Jarvis/Tencent)
         ┌──────────────────────────────────────┐
         │ Comp CRM/Eve (Caddy)                 │
         │ TenderAI MCP MAX (:8090)             │
         │ QAtrial (:3001) · GRACE (:3020)      │
         │ Comp AI (:3030/:3333) souvent STOP   │
         │ Tencent tdai-* — RESTE ICI (Jarvis)  │
         └──────────────────────────────────────┘

SimpleRisk / RiskManager : DÉINSTALLÉ 2026-09-03
Xacta : REMOVED 2026-09-04
```

**Workflow :** portable → deploy NUC (IP) → si galère → reimage app sur VPS → DNS FQDN.  
**Non fait (volontairement) :** agents Eve complets, n8n, Claude Desktop comme dépendance.

---

## 2–5. Apps / versions / paths

| App | Path | Notes |
|-----|------|-------|
| Comp CRM / Eve | `/root/crm` | Caddy |
| TencentDB AM | `/opt/jarvis/TencentDB-Agent-Memory` | `tdai-*` |
| Xacta | `/opt/xacta` | |
| RiskManager / SimpleRisk | — | **supprimé** 2026-09-03 |
| **TenderAI MCP MAX** | `/opt/gsms/tenderai-mcp-server-max` | symlink `/opt/gsms/tenderai` |
| TenderAI legacy (rollback) | `/opt/gsms/tenderai-mcp-server-legacy` | OLD `d84e2ea` |
| QAtrial | `/opt/gsms/qatrial` | |
| **GRACE** | `/opt/gsms/grace` | Docker `csmp-v2-*` · ports **3020** (web) / **3011** (API localhost) |

| Composant | Version |
|-----------|---------|
| TenderAI MCP MAX | `dbugom/tenderai-mcp-server-max` @ **`772335c`** + patches GSMS (optional LLM, indexing from OLD, `mcp[cli]<2`) · MCP **1.29.1** |
| TenderAI legacy | `dbugom/tenderai-mcp-server` @ `d84e2ea` |

Détail migration : [`docs/TENDERAI_MAX_MIGRATION.md`](./TENDERAI_MAX_MIGRATION.md)

---

## 6–7. Ports & URLs (lab = IP NUC)

| APP | Lab NUC (IP) | FQDN (prod → VPS quand GO) | STATUS |
|-----|--------------|----------------------------|--------|
| Comp CRM | Caddy / stack `/root/crm` | `crm.global-it-ss.com` | **UP** |
| **TenderAI MCP MAX** | http://192.168.1.37:8090/mcp | `mcp.global-it-ss.com` | **UP** |
| QAtrial | http://192.168.1.37:3001 | `qatrial.global-it-ss.com` | **UP** |
| **GRACE** | http://192.168.1.37:3020 | `grace.global-it-ss.com` | **UP** |
| **Comp AI** | http://192.168.1.37:3030 · `:3333` | `comp.global-it-ss.com` | **STOPPED** (OOM 2026-09-05) |
| Memory Hub | http://192.168.1.37:8125 | `hub.global-it-ss.com` | **UP** — **reste NUC** |
| Memory Proxy | http://192.168.1.37:8096 | `memory.global-it-ss.com` | **UP** — **reste NUC** |
| Xacta / RiskManager | — | — | **REMOVED** |

---

## 8. Services

### Systemd

- `gsms-tenderai.service` — **active** → MAX (`WorkingDirectory=/opt/gsms/tenderai-mcp-server-max`)
- `gsms-tenderai-max.service` — **disabled** (unité de test parallèle, conservée)

### Docker (extrait)

- CRM stack, Xacta, QAtrial, `tdai-*` — inchangés
- **GRACE** — `csmp-v2-web` `:3020` · `csmp-v2-api` `127.0.0.1:3011` · `csmp-v2-postgres` (interne)
- SimpleRisk / RiskManager — **purgé** (volumes + images ~4 GB)

---

## 9. Databases

| App | DB |
|-----|----|
| TenderAI MAX | SQLite `/opt/gsms/tenderai-mcp-server-max/db/tenderai.db` (+ sqlite-vec) |
| GRACE | Postgres Docker volume `csmp-v2-postgres-data` |
| Backup pré-MAX | `/backups/tenderai-pre-max-20260903-1424/` |

---

## 11–14. TenderAI MAX ops

```bash
ssh jarvis-nuc
systemctl start|stop|restart gsms-tenderai
journalctl -u gsms-tenderai -f
# smoke MCP
bash /tmp/smoke-tenderai-max.sh 8090
# ou scripts sous docs/nuc-deploy/
```

**Startup :** `systemctl start gsms-tenderai`  
**Shutdown :** `systemctl stop gsms-tenderai`  
**Logs :** `journalctl -u gsms-tenderai -f`  
**Healthcheck :** `POST /mcp` initialize + `tools/list` with Bearer  
**Transport :** HTTP Streamable · Bearer `MCP_API_KEY` (dans `.env`, ne pas logger)  
**LLM runtime lab :** data-tool mode (`ANTHROPIC_API_KEY` vide) — Eve/Agent = raisonnement  
**Resource usage :** ~80–120 MiB RSS typique · pas de container dédié

### Rollback

```bash
# Voir docs/TENDERAI_MAX_MIGRATION.md § ROLLBACK
# Legacy intact : /opt/gsms/tenderai-mcp-server-legacy
```

---

## 15. Smoke (post-bascule)

| Check | Résultat |
|-------|----------|
| TenderAI initialize `:8090` | **200** · `serverInfo.name=TenderAI` |
| tools/list | **20 tools** (18 stock MAX + `save_proposal_index` + `get_proposal_details`) |
| CRM / Xacta / QAtrial / tdai-hub | **UP** après bascule |
| SimpleRisk | **REMOVED** |

---

## 18. TODO

- [ ] Brancher Agent Tender / Eve sur MCP MAX (pas Claude Desktop)
- [ ] Décider si tools génératifs restent data-tool-only ou clé Anthropic optionnelle
- [ ] Stocker `MCP_API_KEY` dans coffre secrets
- [ ] Après stabilisation : purge éventuelle de `tenderai-mcp-server-legacy`
- [ ] Licence upstream TenderAI toujours absente
