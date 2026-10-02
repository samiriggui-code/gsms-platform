# TenderAI MCP — déploiement VPS

**FQDN :** `mcp.global-it-ss.com` (A encore NUC).  
**Smoke :** `http://187.77.166.124:8090/mcp`

## Commandes

```bash
cd /opt/gsms/tenderai-mcp
# Copier .env depuis NUC /opt/gsms/tenderai-mcp-server-max/.env (clés Anthropic etc.)
docker compose -f deploy/vps/docker-compose.vps.yml up -d --build
```

## DNS (GO)

A `mcp` → `187.77.166.124` puis LE Traefik.
