#!/usr/bin/env bash
set -euo pipefail

MAX_DIR=/opt/gsms/tenderai-mcp-server-max
OLD_DIR=/opt/gsms/tenderai
TEST_PORT=8091

cd "$MAX_DIR"

echo "=== VENV + DEPS ==="
python3 -m venv venv
./venv/bin/pip install -q --upgrade pip
# Pin mcp<2 like OLD (known FastMCP break on 2.x)
if grep -q 'mcp\[cli\]' requirements.txt; then
  sed -i 's/mcp\[cli\]>=1.9.0$/mcp[cli]>=1.9.0,<2/' requirements.txt || true
  # if already has upper bound leave it
fi
./venv/bin/pip install -q -r requirements.txt
# ensure pin even if requirements didn't match
./venv/bin/pip install -q 'mcp[cli]>=1.9.0,<2'

mkdir -p data/rfp_documents data/past_proposals data/vendor_quotes data/generated_proposals \
  data/knowledge_base/company_profile data/knowledge_base/templates data/knowledge_base/standards db

echo "=== BUILD .env FROM OLD (selective) ==="
# Start from MAX example, overlay selected OLD values without printing secrets
cp -a .env.example .env

# Copy non-secret structural settings + keys without echoing values
python3 - <<'PY'
from pathlib import Path
old = Path('/opt/gsms/tenderai/.env').read_text(encoding='utf-8', errors='replace')
maxp = Path('/opt/gsms/tenderai-mcp-server-max/.env')
cur = maxp.read_text(encoding='utf-8', errors='replace')

def get(env_text, key, default=''):
    for line in env_text.splitlines():
        if line.startswith(key + '='):
            return line.split('=', 1)[1]
    return default

# Preserve MCP key so smoke can share auth pattern; use separate DB/data for isolation
mcp_key = get(old, 'MCP_API_KEY')
anth = get(old, 'ANTHROPIC_API_KEY')
voyage = get(old, 'VOYAGE_API_KEY')
company = get(old, 'COMPANY_NAME', 'GSMS')
currency = get(old, 'DEFAULT_CURRENCY', 'EUR')
margin = get(old, 'DEFAULT_MARGIN_PCT', '15')
llm_model = get(old, 'LLM_MODEL', 'claude-sonnet-4-5-20241022')
llm_tokens = get(old, 'LLM_MAX_TOKENS', '4096')
embed_model = get(old, 'EMBEDDING_MODEL', 'voyage-3-lite')
embed_dim = get(old, 'EMBEDDING_DIMENSIONS', '512')

# GSMS doctrine: prefer data-tool mode (no second LLM). Leave Anthropic empty for MAX test
# unless user later decides otherwise. Keep key available as commented? We store empty.
use_anthropic = ''  # explicit: data-tool mode for MAX validation

lines = {
    'TRANSPORT': 'http',
    'HOST': '0.0.0.0',
    'PORT': '8091',
    'MCP_API_KEY': mcp_key,
    'OAUTH_ISSUER_URL': '',
    'ANTHROPIC_API_KEY': use_anthropic,
    'LLM_MODEL': llm_model,
    'LLM_MAX_TOKENS': llm_tokens,
    'VOYAGE_API_KEY': voyage,
    'EMBEDDING_MODEL': embed_model,
    'EMBEDDING_DIMENSIONS': embed_dim,
    'DATABASE_PATH': './db/tenderai-max.db',
    'DATA_DIR': './data',
    'COMPANY_NAME': company,
    'DEFAULT_CURRENCY': currency,
    'DEFAULT_MARGIN_PCT': margin,
    'LOG_LEVEL': 'INFO',
}

# Rewrite .env from known keys (keep comments from example as header)
out = ['# TenderAI MAX — GSMS lab (port 8091, isolated DB)', '']
for k, v in lines.items():
    out.append(f'{k}={v}')
maxp.write_text('\n'.join(out) + '\n', encoding='utf-8')
print('ENV_WRITTEN keys=', ','.join(lines.keys()))
print('ANTHROPIC_SET=', 'yes' if use_anthropic else 'no (data-tool mode)')
print('MCP_KEY_SET=', 'yes' if mcp_key else 'no')
print('PORT=8091 DATABASE=./db/tenderai-max.db')
PY

chmod 600 .env

echo "=== SYSTEMD UNIT (MAX test, not enabled as default) ==="
cat > /etc/systemd/system/gsms-tenderai-max.service <<'EOF'
[Unit]
Description=GSMS TenderAI MCP MAX (parallel test :8091)
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

systemctl daemon-reload
systemctl enable --now gsms-tenderai-max
sleep 3
systemctl --no-pager --no-legend status gsms-tenderai-max | head -20
journalctl -u gsms-tenderai-max -n 40 --no-pager

echo "=== OLD still active? ==="
systemctl is-active gsms-tenderai
ss -lntp | grep -E ':8090|:8091' || true
