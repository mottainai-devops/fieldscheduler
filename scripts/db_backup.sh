#!/bin/bash
# ============================================================
# Field Scheduler - Automated MySQL Database Backup Script
# Runs daily via cron: 0 2 * * * /home/ubuntu/field-worker-scheduler/scripts/db_backup.sh
# Retention: 7 days (older backups are automatically deleted)
# ============================================================

set -euo pipefail

# Configuration
DB_USER="fieldworker"
DB_PASS="FieldWorker2024Secure"
DB_NAME="fieldworker_db"
BACKUP_DIR="/home/ubuntu/db_backups"
RETENTION_DAYS=7
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"
LOG_FILE="/var/log/fieldscheduler-backups.log"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "=== Starting database backup ==="
log "Database: ${DB_NAME}"
log "Backup file: ${BACKUP_FILE}"

# Run mysqldump and compress
if mysqldump \
  --user="${DB_USER}" \
  --password="${DB_PASS}" \
  --host=localhost \
  --single-transaction \
  --routines \
  --triggers \
  --add-drop-table \
  --complete-insert \
  "${DB_NAME}" | gzip > "${BACKUP_FILE}"; then
  
  BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
  log "✅ Backup completed successfully. Size: ${BACKUP_SIZE}"
else
  log "❌ Backup FAILED!"
  exit 1
fi

# Delete backups older than RETENTION_DAYS
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -print -delete | wc -l)
log "Deleted ${DELETED} old backup(s)"

# List current backups
log "Current backups:"
ls -lh "${BACKUP_DIR}"/${DB_NAME}_*.sql.gz 2>/dev/null | awk '{print $5, $9}' | while read size file; do
  log "  ${size}  $(basename ${file})"
done

log "=== Backup job complete ==="
