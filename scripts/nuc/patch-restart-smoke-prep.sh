#!/usr/bin/env bash
set -euo pipefail
echo "=== status ==="
systemctl is-active gsms-tenderai-max gsms-tenderai
ss -lntp | grep -E ':8090|:8091' || true
echo "=== journal max ==="
journalctl -u gsms-tenderai-max -n 50 --no-pager
echo "=== apply GSMS patch ==="
bash /tmp/patch-tenderai-max-gsms.sh
systemctl restart gsms-tenderai-max
sleep 3
systemctl is-active gsms-tenderai-max
journalctl -u gsms-tenderai-max -n 30 --no-pager
ss -lntp | grep -E ':8090|:8091' || true
