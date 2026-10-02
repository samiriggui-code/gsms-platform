#!/usr/bin/env bash
set -euo pipefail

MAX_DIR=/opt/gsms/tenderai-mcp-server-max
OLD_DIR=/opt/gsms/tenderai
TEST_PORT=8091

echo "=== CLONE MAX (parallel, leave OLD intact) ==="
if [ -d "$MAX_DIR/.git" ]; then
  echo "Already cloned — fetch"
  git -C "$MAX_DIR" fetch --all
  git -C "$MAX_DIR" status -sb
else
  git clone https://github.com/dbugom/tenderai-mcp-server-max.git "$MAX_DIR"
fi

cd "$MAX_DIR"
echo "=== MAX COMMIT ==="
git remote -v
git log -1 --oneline
git rev-parse HEAD

echo "=== MAX TREE ==="
ls -la
echo "=== MAX requirements ==="
cat requirements.txt
echo "=== MAX .env.example ==="
cat .env.example

echo "=== MAX LLM refs ==="
grep -RInE 'anthropic|ANTHROPIC|openai|OPENAI|llm|data-tool|Claude does' app requirements.txt 2>/dev/null | head -80 || true

echo "=== MAX tool files ==="
ls -la app/tools/
echo "=== MAX @mcp.tool names ==="
grep -RhnE '@mcp\.tool|async def [a-z_]+\(' app/tools --include='*.py' | head -100 || true

echo "=== DIFF schema OLD vs MAX ==="
diff -u "$OLD_DIR/app/db/schema.sql" "$MAX_DIR/app/db/schema.sql" | head -120 || true

echo "=== DIFF requirements ==="
diff -u "$OLD_DIR/requirements.txt" "$MAX_DIR/requirements.txt" || true

echo "=== tool name extract OLD ==="
grep -RhoE 'async def (parse_|generate_|check_|validate_|write_|build_|calculate_|ingest_|draft_|create_|track_|index_|search_|list_|get_|save_)[a-z_]+' "$OLD_DIR/app/tools" | sort -u
echo "=== tool name extract MAX ==="
grep -RhoE 'async def (parse_|generate_|check_|validate_|write_|build_|calculate_|ingest_|draft_|create_|track_|index_|search_|list_|get_|save_)[a-z_]+' "$MAX_DIR/app/tools" | sort -u
