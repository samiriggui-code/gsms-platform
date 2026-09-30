#!/usr/bin/env bash
set -euo pipefail
ROOT=/opt/gsms/tenderai
echo "=== LLM / ANTHROPIC / OPENAI refs ==="
grep -RInE 'anthropic|openai|ANTHROPIC|OPENAI|Claude|gpt-|ChatCompletion|litellm' \
  "$ROOT/app" "$ROOT"/*.py "$ROOT"/requirements.txt 2>/dev/null | head -80 || true
echo "=== TOOL MODULES ==="
ls -la "$ROOT/app/tools" 2>/dev/null || true
echo "=== TOOL DEFS ==="
grep -RInE '@mcp\.tool|def |FastMCP|register' "$ROOT/app" --include='*.py' 2>/dev/null | head -120 || true
echo "=== ENTRYPOINT ==="
head -80 "$ROOT/app/server.py" 2>/dev/null || head -80 "$ROOT/app/__main__.py" 2>/dev/null || true
ls "$ROOT/app"/*.py
