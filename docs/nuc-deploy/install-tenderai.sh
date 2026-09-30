#!/usr/bin/env bash
set -euo pipefail
cd /opt/gsms/tenderai
python3 -m venv venv
./venv/bin/pip install -q --upgrade pip
./venv/bin/pip install -q -r requirements.txt
mkdir -p data/rfp_documents data/past_proposals data/vendor_quotes data/generated_proposals db
if [ ! -f .env ]; then
  cp .env.example .env
fi
MCP_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
sed -i 's/^TRANSPORT=.*/TRANSPORT=http/' .env
sed -i 's/^HOST=.*/HOST=0.0.0.0/' .env
sed -i 's/^PORT=.*/PORT=8090/' .env
if grep -q 'change-me-to-a-secure-token' .env; then
  sed -i "s/change-me-to-a-secure-token/${MCP_KEY}/" .env
fi
cat > /etc/systemd/system/gsms-tenderai.service <<'EOF'
[Unit]
Description=GSMS TenderAI MCP Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/gsms/tenderai
EnvironmentFile=/opt/gsms/tenderai/.env
ExecStart=/opt/gsms/tenderai/venv/bin/python -m app.server
Restart=on-failure
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now gsms-tenderai
sleep 2
systemctl --no-pager status gsms-tenderai | head -20
journalctl -u gsms-tenderai -n 30 --no-pager
