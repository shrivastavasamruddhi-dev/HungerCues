#!/usr/bin/env bash
# =============================================================================
# Daily PostgreSQL backup script
# Dumps the database, compresses it, and uploads to Cloudflare R2.
#
# Setup (on VPS):
#   1. Copy this file to /opt/baby-tracker/scripts/backup-db.sh
#   2. chmod +x /opt/baby-tracker/scripts/backup-db.sh
#   3. Add to crontab: 0 2 * * * /opt/baby-tracker/scripts/backup-db.sh >> /var/log/baby-tracker-backup.log 2>&1
#
# Required env vars (sourced from .env or environment):
#   POSTGRES_PASSWORD, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
# =============================================================================
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
COMPOSE_FILE="/opt/baby-tracker/docker-compose.prod.yml"
DB_NAME="baby_tracker"
DB_USER="postgres"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H%M%S)
BACKUP_DIR="/tmp/bt-backups"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}_${TIME}.sql.gz"

# Load env vars if .env exists
if [ -f "/opt/baby-tracker/.env" ]; then
  # shellcheck disable=SC1091
  set -o allexport
  source /opt/baby-tracker/.env
  set +o allexport
fi

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup → $BACKUP_FILE"

# ── 1. Dump and compress ───────────────────────────────────────────────────────
docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Dump complete — size: $BACKUP_SIZE"

# ── 2. Upload to Cloudflare R2 ────────────────────────────────────────────────
# Using AWS CLI with R2-compatible endpoint
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3 cp "$BACKUP_FILE" \
  "s3://${R2_BUCKET_NAME}/backups/db/daily/${DATE}.sql.gz" \
  --endpoint-url "$R2_ENDPOINT" \
  --no-progress

echo "[$(date -Iseconds)] Uploaded to R2: backups/db/daily/${DATE}.sql.gz"

# ── 3. Weekly backup (every Monday) ──────────────────────────────────────────
if [ "$(date +%u)" = "1" ]; then
  WEEK=$(date +%Y-W%V)
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  aws s3 cp "$BACKUP_FILE" \
    "s3://${R2_BUCKET_NAME}/backups/db/weekly/${WEEK}.sql.gz" \
    --endpoint-url "$R2_ENDPOINT" \
    --no-progress
  echo "[$(date -Iseconds)] Weekly backup: backups/db/weekly/${WEEK}.sql.gz"
fi

# ── 4. Monthly backup (1st of month) ─────────────────────────────────────────
if [ "$(date +%d)" = "01" ]; then
  MONTH=$(date +%Y-%m)
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  aws s3 cp "$BACKUP_FILE" \
    "s3://${R2_BUCKET_NAME}/backups/db/monthly/${MONTH}.sql.gz" \
    --endpoint-url "$R2_ENDPOINT" \
    --no-progress
  echo "[$(date -Iseconds)] Monthly backup: backups/db/monthly/${MONTH}.sql.gz"
fi

# ── 5. Prune old daily backups (keep last 7) ──────────────────────────────────
echo "[$(date -Iseconds)] Pruning old daily backups (keeping 7 days)..."
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3 ls "s3://${R2_BUCKET_NAME}/backups/db/daily/" \
  --endpoint-url "$R2_ENDPOINT" \
  | sort \
  | head -n -7 \
  | awk '{print $4}' \
  | while read -r key; do
      AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
      AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
      aws s3 rm "s3://${R2_BUCKET_NAME}/backups/db/daily/${key}" \
        --endpoint-url "$R2_ENDPOINT"
      echo "[$(date -Iseconds)] Deleted old backup: $key"
    done

# ── 6. Cleanup local temp file ────────────────────────────────────────────────
rm -f "$BACKUP_FILE"
echo "[$(date -Iseconds)] Backup complete ✓"
