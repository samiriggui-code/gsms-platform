#!/usr/bin/env bash
set -euo pipefail

OLD=/opt/gsms/tenderai
MAX=/opt/gsms/tenderai-mcp-server-max
LEGACY=/opt/gsms/tenderai-mcp-server-legacy

echo "=== STOP both ==="
systemctl stop gsms-tenderai-max || true
systemctl stop gsms-tenderai || true
sleep 1

echo "=== MIGRATE DATA OLD -> MAX (compatible schema) ==="
# Prefer OLD sqlite as source of truth (lab data)
mkdir -p "$MAX/db" "$MAX/data"
if [ -f "$OLD/db/tenderai.db" ]; then
  cp -a "$OLD/db/tenderai.db" "$MAX/db/tenderai.db"
  # clear WAL leftovers from OLD if any
  rm -f "$MAX/db/tenderai.db-shm" "$MAX/db/tenderai.db-wal" || true
fi
rsync -a "$OLD/data/" "$MAX/data/"

echo "=== MAX .env -> port 8090 + shared DB name ==="
python3 - <<'PY'
from pathlib import Path
p = Path('/opt/gsms/tenderai-mcp-server-max/.env')
lines = []
for line in p.read_text().splitlines():
    if line.startswith('PORT='):
        lines.append('PORT=8090')
    elif line.startswith('DATABASE_PATH='):
        lines.append('DATABASE_PATH=./db/tenderai.db')
    else:
        lines.append(line)
p.write_text('\n'.join(lines) + '\n')
print('ENV_UPDATED PORT=8090 DATABASE=./db/tenderai.db')
PY
chmod 600 "$MAX/.env"

echo "=== REPOINT gsms-tenderai.service -> MAX ==="
cat > /etc/systemd/system/gsms-tenderai.service <<'EOF'
[Unit]
Description=GSMS TenderAI MCP MAX Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/gsms/tenderai-mcp-server-max
EnvironmentFile=/opt/gsms/tenderai-mcp-server-max/.env
ExecStart=/opt/gsms/tenderai-mcp-server-max/venv/bin/python -m app.server
Restart=on-failure
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

# Disable parallel test unit (keep file for rollback)
systemctl disable gsms-tenderai-max || true
systemctl daemon-reload

echo "=== ARCHIVE OLD (no delete) ==="
if [ -d "$LEGACY" ]; then
  echo "LEGACY already exists — leave OLD as-is at $OLD"
else
  mv "$OLD" "$LEGACY"
  echo "MOVED $OLD -> $LEGACY"
fi

# Convenience symlink for docs that still say /opt/gsms/tenderai
ln -sfn "$MAX" /opt/gsms/tenderai
echo "SYMLINK /opt/gsms/tenderai -> $MAX"

echo "=== START MAX as gsms-tenderai ==="
systemctl enable --now gsms-tenderai
sleep 3
systemctl is-active gsms-tenderai
ss -lntp | grep -E ':8090|:8091' || true
journalctl -u gsms-tenderai -n 25 --no-pager

echo "=== SMOKE 8090 ==="
# smoke.sh may still be under legacy; use max smoke with port 8090
if [ -x /tmp/smoke-tenderai-max.sh ]; then
  bash /tmp/smoke-tenderai-max.sh 8090 | grep -E '^(PORT|TOOL|session|--- list)' || true
  # also print tool count from file
  python3 - <<'PY'
import json,re
raw=open('/tmp/tender-max-tools.json').read()
m=re.search(r'\{.*\}', raw, re.S)
obj=json.loads(m.group(0) if m else raw)
tools=sorted(t['name'] for t in obj.get('result',{}).get('tools',[]))
print('ACTIVE_TOOL_COUNT', len(tools))
print('HAS_get_proposal_details', 'get_proposal_details' in tools)
print('HAS_save_proposal_index', 'save_proposal_index' in tools)
PY
fi

echo "=== HEALTH OTHER ==="
curl -s -o /dev/null -w 'crm:%{http_code} ' http://127.0.0.1/
curl -s -o /dev/null -w 'xacta:%{http_code} ' http://127.0.0.1:3000/login
curl -s -o /dev/null -w 'risk:%{http_code} ' http://127.0.0.1:8081/
curl -s -o /dev/null -w 'qatrial:%{http_code} ' http://127.0.0.1:3001/
curl -s -o /dev/null -w 'tdai-hub:%{http_code} ' http://127.0.0.1:8125/
echo
free -h | head -2
echo "BASCULE_DONE"
