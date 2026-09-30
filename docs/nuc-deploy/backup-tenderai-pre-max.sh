#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M)
DEST="/backups/tenderai-pre-max-${STAMP}"
mkdir -p "$DEST"
SRC=/opt/gsms/tenderai
echo "Backup -> $DEST"
# config + data + db + scripts (no venv/pycache)
rsync -a \
  --exclude 'venv/' \
  --exclude '.venv/' \
  --exclude '__pycache__/' \
  --exclude '*.pyc' \
  --exclude '.git/objects/' \
  --exclude 'node_modules/' \
  "$SRC/.env" "$DEST/" 2>/dev/null || true
rsync -a --exclude 'venv/' --exclude '__pycache__/' --exclude '*.pyc' \
  "$SRC/data/" "$DEST/data/" 2>/dev/null || mkdir -p "$DEST/data"
rsync -a "$SRC/db/" "$DEST/db/" 2>/dev/null || mkdir -p "$DEST/db"
# keep git metadata for commit pin
git -C "$SRC" rev-parse HEAD > "$DEST/OLD_COMMIT.txt"
git -C "$SRC" remote -v > "$DEST/OLD_REMOTE.txt"
git -C "$SRC" status --porcelain > "$DEST/OLD_STATUS.txt" || true
git -C "$SRC" diff > "$DEST/OLD_DIFF.patch" || true
cp -a /etc/systemd/system/gsms-tenderai.service "$DEST/" 2>/dev/null || true
cp -a "$SRC/requirements.txt" "$DEST/" 2>/dev/null || true
cp -a "$SRC/.env.example" "$DEST/" 2>/dev/null || true
# redacted env key names only for inventory
grep -E '^[A-Z_]+=' "$SRC/.env" | cut -d= -f1 > "$DEST/ENV_KEYS.txt" || true
du -sh "$DEST"
ls -la "$DEST"
echo "BACKUP_OK $DEST"
