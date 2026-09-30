#!/usr/bin/env bash
# GSMS patch for TenderAI MAX — optional LLM (data-tool mode) like newer mainline.
# Does NOT remove anthropic dependency; only gates construction when key empty.
set -euo pipefail
MAX=/opt/gsms/tenderai-mcp-server-max
FILE="$MAX/app/server.py"

python3 - <<'PY'
from pathlib import Path
p = Path('/opt/gsms/tenderai-mcp-server-max/app/server.py')
text = p.read_text(encoding='utf-8')
old = '''    # --- Services ---
    llm = LLMService(
        api_key=settings.anthropic_api_key,
        model=settings.llm_model,
        max_tokens=settings.llm_max_tokens,
    )
'''
new = '''    # --- Services ---
    # GSMS patch: optional LLM — empty ANTHROPIC_API_KEY => data-tool mode
    # (Eve / Agent Tender owns reasoning; TenderAI owns tools/data).
    llm = None
    if settings.anthropic_api_key:
        llm = LLMService(
            api_key=settings.anthropic_api_key,
            model=settings.llm_model,
            max_tokens=settings.llm_max_tokens,
        )
        logger.info("LLM service enabled (ANTHROPIC_API_KEY set)")
    else:
        logger.info("LLM service disabled — data-tool mode (Agent/Eve does reasoning)")
'''
if old not in text:
    if 'LLM service disabled' in text:
        print('PATCH_ALREADY_APPLIED')
    else:
        raise SystemExit('PATCH_TARGET_NOT_FOUND')
else:
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print('PATCH_APPLIED_OPTIONAL_LLM')
PY

# Bring forward indexing tools from OLD (get_proposal_details, save_proposal_index, data-tool)
cp -a /opt/gsms/tenderai/app/tools/indexing.py "$MAX/app/tools/indexing.py"
echo "COPIED_INDEXING_FROM_OLD"

# Ensure register signature compatibility — check OLD vs MAX register_indexing_tools signature
python3 - <<'PY'
import ast, pathlib
src = pathlib.Path('/opt/gsms/tenderai-mcp-server-max/app/server.py').read_text()
print('register_indexing_tools call present:', 'register_indexing_tools' in src)
# show the call line
for i,l in enumerate(src.splitlines(),1):
    if 'register_indexing' in l or 'register_document' in l:
        print(f'{i}:{l}')
PY
