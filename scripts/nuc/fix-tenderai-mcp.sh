#!/usr/bin/env bash
set -euo pipefail
systemctl stop gsms-tenderai || true
cd /opt/gsms/tenderai
# Pin MCP 1.x — repo uses FastMCP API
sed -i 's/^mcp\[cli\].*/mcp[cli]>=1.9.0,<2/' requirements.txt
./venv/bin/pip install -q 'mcp[cli]>=1.9.0,<2'
./venv/bin/python -c 'from mcp.server.fastmcp import FastMCP; print("FastMCP OK")'
systemctl reset-failed gsms-tenderai || true
systemctl start gsms-tenderai
sleep 4
systemctl is-active gsms-tenderai
journalctl -u gsms-tenderai -n 25 --no-pager
ss -tlnp | grep 8090 || true
curl -sS -o /dev/null -w 'tender:%{http_code}\n' http://127.0.0.1:8090/ || true
curl -sS -o /dev/null -w 'mcp:%{http_code}\n' http://127.0.0.1:8090/mcp || true
