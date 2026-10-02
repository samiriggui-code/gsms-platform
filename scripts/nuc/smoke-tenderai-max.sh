#!/usr/bin/env bash
set -euo pipefail
# Smoke MAX on 8091 using MCP_API_KEY from MAX .env (same key as OLD typically)
KEY=$(grep '^MCP_API_KEY=' /opt/gsms/tenderai-mcp-server-max/.env | cut -d= -f2-)
PORT=${1:-8091}
BASE="http://127.0.0.1:${PORT}/mcp"
TMP=$(mktemp)
HDR=$(mktemp)

curl -sS -D "$HDR" -o "$TMP" \
  -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"gsms-max-smoke","version":"0.1"}}}' \
  "$BASE"
SID=$(grep -i 'mcp-session-id:' "$HDR" | awk '{print $2}' | tr -d '\r')
echo "PORT=$PORT session=$SID"
echo '--- initialize ---'
head -c 600 "$TMP"; echo

curl -sS \
  -H "Authorization: Bearer $KEY" \
  -H "Mcp-Session-Id: $SID" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  "$BASE" | tee /tmp/tender-max-tools.json | head -c 4000
echo

python3 - <<'PY'
import json,re
raw=open('/tmp/tender-max-tools.json').read()
m=re.search(r'\{.*\}', raw, re.S)
obj=json.loads(m.group(0) if m else raw)
tools=[t['name'] for t in obj.get('result',{}).get('tools',[])]
print('TOOL_COUNT', len(tools))
for n in sorted(tools):
    print('TOOL', n)
PY

echo '--- list_indexed_proposals ---'
curl -sS \
  -H "Authorization: Bearer $KEY" \
  -H "Mcp-Session-Id: $SID" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_indexed_proposals","arguments":{}}}' \
  "$BASE" | head -c 2000
echo
