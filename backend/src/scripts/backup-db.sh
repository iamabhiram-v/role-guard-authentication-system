#!/usr/bin/env bash
# Daily Postgres backup with 14-day retention.
# Run via cron: 0 3 * * * /path/to/backup-db.sh >> /var/log/roleguard-backup.log 2>&1
set -euo pipefail

: "${DB_HOST:?Set DB_HOST}"
: "${DB_NAME:?Set DB_NAME}"
: "${DB_USER:?Set DB_USER}"
: "${DB_PASSWORD:?Set DB_PASSWORD}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/roleguard}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="roleguard_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of $DB_NAME to $BACKUP_DIR/$FILENAME"

PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  | gzip > "$BACKUP_DIR/$FILENAME"

echo "[$(date)] Backup complete: $(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)"

# Delete backups older than retention window
find "$BACKUP_DIR" -name "roleguard_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Pruned backups older than ${RETENTION_DAYS} days"

# --- Restore instructions (not run automatically) ---
# gunzip -c roleguard_YYYYMMDD_HHMMSS.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME