# GSMS — NUC (lab IP) vs VPS (prod FQDN)

**Date :** 2026-09-05 (MAJ)  
**Décision user :** **toute l’infra GSMS sur VPS** avec FQDN ; NUC garde des **copies lab** joignables en IP locale pour le dev.

## Règle d’accès

| Accès | Comment | Usage |
|-------|---------|--------|
| **VPS** | FQDN `*.global-it-ss.com` | prod / smoke public |
| **NUC** | IP locale `http://192.168.1.37:<port>` | lab, itération portable → NUC |

Ne pas mélanger : après bascule DNS d’une app, le FQDN = VPS uniquement. Le NUC reste joignable en LAN.

## Workflow (par app)

1. Modifier sur le **PC portable** (repo `gsms-platform`).
2. Tester sur le **NUC** via **IP locale** si besoin.
3. Déployer / smoke sur le **VPS** (`187.77.166.124:<port>`).
4. GO → A record FQDN → VPS.
5. Garder la copie NUC pour le lab (ne pas dépendre du FQDN).

## Inventaire dual

| App | NUC (lab IP) | FQDN (VPS) | État |
|-----|--------------|------------|------|
| Comp AI | `:3030` / API `:3333` | `comp.global-it-ss.com` | VPS + DNS |
| Comp CRM / Eve | Caddy / ports | `crm.global-it-ss.com` | VPS + DNS |
| TenderAI MCP | `:8090` | `mcp.global-it-ss.com` | VPS + DNS |
| QAtrial | `:3001` | `qatrial.global-it-ss.com` | VPS + DNS |
| GRACE | `:3020` | `grace.global-it-ss.com` | VPS + DNS |
| MinIO console | `:9001` | `minio.global-it-ss.com` | à brancher Traefik VPS |
| Memory Hub | `:8125` | `hub.global-it-ss.com` | **VPS + DNS** (copie ; NUC lab LAN) |
| Memory Proxy | `:8096` | `memory.global-it-ss.com` | **VPS + DNS** (copie ; NUC lab LAN) |
| Admin sondes | Caddy | `admin.global-it-ss.com` | à revoir post-bascule |

**VPS :** `187.77.166.124` · KVM 8 · 32 Go · Ubuntu 24.04 · Traefik host network.

## Hub / Memory (doctrine MAJ)

- **Prod FQDN** = copie VPS `/opt/gsms/tencent-memory/global-images` (`tdai-*`).
- **NUC** = copie lab via `192.168.1.37` (IO local, Jarvis / itération) — **ne pas arrêter** sans GO.
- SSH NUC depuis portable : **`ssh jarvis-nuc`** (clé `~/.ssh/jarvis_nuc_ed25519`), pas Freebox `:22`.
- Clés Tencent (`.admin-key`, etc.) : **ne pas révoquer** ; copiées sur VPS, NUC intact.

## DNS

- Bascule **app par app** après smoke IP.
- Apex / vitrine déjà VPS.
- Rollback snapshots DNS Hostinger : `178317451` (comp) ; plus récents après updates zone.
