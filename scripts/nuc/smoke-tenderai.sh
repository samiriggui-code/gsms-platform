#!/usr/bin/env bash
set -euo pipefail
KEY=$(grep '^MCP_API_KEY=' /opt/gsms/tenderai/.env | cut -d= -f2-)
TMP=$(mktemp)
HDR=$(mktemp)
curl -sS -D "$HDR" -o "$TMP" \
  -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"gsms-smoke","version":"0.1"}}}' \
  http://127.0.0.1:8090/mcp
SID=$(grep -i 'mcp-session-id:' "$HDR" | awk '{print $2}' | tr -d '\r')
echo "session=$SID"
echo '--- initialize body ---'
head -c 800 "$TMP"; echo
echo '--- tools/list ---'
curl -sS \
  -H "Authorization: Bearer $KEY" \
  -H "Mcp-Session-Id: $SID" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  http://127.0.0.1:8090/mcp | tee /tmp/tender-tools.json | head -c 8000
echo
python3 - <<'PY'
import json,re
raw=open('/tmp/tender-tools.json').read()
# SSE may wrap as data: {...}
m=re.search(r'\{.*\}', raw, re.S)
obj=json.loads(m.group(0) if m else raw)
tools=[t['name'] for t in obj.get('result',{}).get('tools',[])]
print('TOOL_COUNT', len(tools))
for n in tools:
    print('TOOL', n)
need=['parse_tender_rfp','generate_compliance_matrix','check_submission_deadline','validate_document_completeness','write_technical_section','build_full_technical_proposal','generate_architecture_description','write_compliance_narrative','ingest_vendor_quote','build_bom','calculate_final_pricing','generate_financial_proposal','draft_partner_brief','create_nda_checklist','track_partner_deliverable','index_past_proposal','search_past_proposals','list_indexed_proposals']
missing=[x for x in need if x not in tools]
print('MISSING', missing)
PY
echo '--- list_indexed_proposals ---'
curl -sS \
  -H "Authorization: Bearer $KEY" \
  -H "Mcp-Session-Id: $SID" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_indexed_proposals","arguments":{}}}' \
  http://127.0.0.1:8090/mcp | head -c 1500
echo
