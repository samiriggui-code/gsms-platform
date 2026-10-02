#!/usr/bin/env bash
set -euo pipefail
cd /opt/gsms/tenderai
echo "=== REMOTE ==="
git remote -v
echo "=== BRANCH/COMMIT ==="
git branch -v
git log -1 --oneline
git rev-parse HEAD
echo "=== STATUS ==="
git status -sb
echo "=== DIFFSTAT ==="
git diff --stat || true
echo "=== TREE ==="
ls -la
echo "=== ENV KEY NAMES ==="
grep -E '^[A-Z_]+=' .env 2>/dev/null | cut -d= -f1 || true
echo "=== DATA ==="
du -sh data db 2>/dev/null || true
find data db -type f 2>/dev/null | head -50 || true
echo "=== SYSTEMD ==="
systemctl cat gsms-tenderai --no-pager
echo "=== REQUIREMENTS ==="
head -100 requirements.txt 2>/dev/null || true
ls -la pyproject.toml setup.sh README* .env.example 2>/dev/null || true
echo "=== PYTHON ==="
./venv/bin/python -V
./venv/bin/pip show mcp anthropic openai 2>/dev/null | grep -E '^(Name|Version)' || true
echo "=== LOCAL PATCHES (files changed vs HEAD) ==="
git status --porcelain || true
