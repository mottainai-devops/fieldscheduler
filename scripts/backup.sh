#!/bin/bash

##############################################################################
# Database Backup Script
# Automated daily backup with 30-day retention policy
# 
# Usage:
#   ./scripts/backup.sh              # Create backup
#   ./scripts/backup.sh verify       # Verify latest backup
#   ./scripts/backup.sh restore      # Restore from backup
#   ./scripts/backup.sh cleanup      # Remove old backups
#
# Setup cron job:
#   0 2 * * * /path/to/field-worker-scheduler/scripts/backup.sh >> /var/log/backup.log 2>&1
##############################################################################

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./.backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOG_FILE="${LOG_FILE:-./backup.log}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/database_$TIMESTAMP.sql.gz"
BACKUP_INFO="$BACKUP_DIR/database_$TIMESTAMP.info"

# Database configuration from environment
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-3306}"
DB_USER="${DATABASE_USER:-root}"
DB_PASSWORD="${DATABASE_PASSWORD}"
DB_NAME="${DATABASE_NAME:-field_worker_scheduler}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

##############################################################################
# Logging Functions
##############################################################################

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

##############################################################################
# Backup Functions
##############################################################################

create_backup() {
  log "Starting database backup..."
  
  # Create backup directory if it doesn't exist
  mkdir -p "$BACKUP_DIR"
  
  # Check if database credentials are provided
  if [ -z "$DB_PASSWORD" ]; then
    log_warning "DATABASE_PASSWORD not set, attempting connection without password"
    MYSQL_PASS=""
  else
    MYSQL_PASS="-p$DB_PASSWORD"
  fi
  
  # Create backup
  log "Backing up database: $DB_NAME"
  if mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $MYSQL_PASS "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
    
    # Create backup info file
    cat > "$BACKUP_INFO" << EOF
Backup Information
==================
Date: $(date)
Database: $DB_NAME
Host: $DB_HOST
Port: $DB_PORT
Size: $BACKUP_SIZE
File: $BACKUP_FILE
Status: Success
EOF
    
    return 0
  else
    log_error "Failed to create backup"
    return 1
  fi
}

##############################################################################
# Verification Functions
##############################################################################

verify_backup() {
  local backup_file="${1:-$BACKUP_FILE}"
  
  if [ ! -f "$backup_file" ]; then
    log_error "Backup file not found: $backup_file"
    return 1
  fi
  
  log "Verifying backup: $backup_file"
  
  # Check file size
  local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
  if [ "$file_size" -lt 1000 ]; then
    log_error "Backup file is too small: $file_size bytes"
    return 1
  fi
  
  # Check if file is valid gzip
  if ! gzip -t "$backup_file" 2>/dev/null; then
    log_error "Backup file is corrupted (invalid gzip)"
    return 1
  fi
  
  # Check if backup contains SQL data
  if ! zcat "$backup_file" | head -1 | grep -q "SQL"; then
    log_warning "Backup file may not contain valid SQL data"
  fi
  
  log_success "Backup verification passed"
  return 0
}

##############################################################################
# Restore Functions
##############################################################################

restore_backup() {
  local backup_file="${1}"
  
  if [ -z "$backup_file" ]; then
    # Use latest backup
    backup_file=$(ls -t "$BACKUP_DIR"/database_*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$backup_file" ]; then
      log_error "No backup files found in $BACKUP_DIR"
      return 1
    fi
  fi
  
  if [ ! -f "$backup_file" ]; then
    log_error "Backup file not found: $backup_file"
    return 1
  fi
  
  log "WARNING: This will overwrite the current database!"
  log "Restoring from: $backup_file"
  read -p "Are you sure? (yes/no): " -r
  
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Restore cancelled"
    return 1
  fi
  
  # Check if database credentials are provided
  if [ -z "$DB_PASSWORD" ]; then
    MYSQL_PASS=""
  else
    MYSQL_PASS="-p$DB_PASSWORD"
  fi
  
  log "Restoring database from backup..."
  if zcat "$backup_file" | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $MYSQL_PASS "$DB_NAME" 2>/dev/null; then
    log_success "Database restored successfully"
    return 0
  else
    log_error "Failed to restore database"
    return 1
  fi
}

##############################################################################
# Cleanup Functions
##############################################################################

cleanup_old_backups() {
  log "Cleaning up backups older than $RETENTION_DAYS days..."
  
  local deleted_count=0
  while IFS= read -r backup_file; do
    log "Removing old backup: $(basename "$backup_file")"
    rm -f "$backup_file"
    rm -f "${backup_file%.sql.gz}.info"
    ((deleted_count++))
  done < <(find "$BACKUP_DIR" -name "database_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" 2>/dev/null)
  
  if [ "$deleted_count" -gt 0 ]; then
    log_success "Deleted $deleted_count old backup(s)"
  else
    log "No old backups to delete"
  fi
}

##############################################################################
# Status Functions
##############################################################################

show_backup_status() {
  log "Backup Status Report"
  log "===================="
  
  if [ ! -d "$BACKUP_DIR" ]; then
    log_warning "Backup directory does not exist: $BACKUP_DIR"
    return 1
  fi
  
  local backup_count=$(ls -1 "$BACKUP_DIR"/database_*.sql.gz 2>/dev/null | wc -l)
  log "Total backups: $backup_count"
  
  if [ "$backup_count" -gt 0 ]; then
    log ""
    log "Recent backups:"
    ls -lh "$BACKUP_DIR"/database_*.sql.gz 2>/dev/null | tail -5 | awk '{print "  " $9 " (" $5 ")"}'
    
    log ""
    log "Oldest backup:"
    ls -lh "$BACKUP_DIR"/database_*.sql.gz 2>/dev/null | head -1 | awk '{print "  " $9 " (" $5 ")"}'
    
    log ""
    log "Total backup size:"
    du -sh "$BACKUP_DIR" | awk '{print "  " $1}'
  fi
}

##############################################################################
# Main Script
##############################################################################

main() {
  case "${1:-backup}" in
    backup)
      create_backup
      if [ $? -eq 0 ]; then
        verify_backup "$BACKUP_FILE"
        cleanup_old_backups
        show_backup_status
      fi
      ;;
    
    verify)
      if [ -z "$2" ]; then
        # Verify latest backup
        latest_backup=$(ls -t "$BACKUP_DIR"/database_*.sql.gz 2>/dev/null | head -1)
        verify_backup "$latest_backup"
      else
        verify_backup "$2"
      fi
      ;;
    
    restore)
      restore_backup "$2"
      ;;
    
    cleanup)
      cleanup_old_backups
      ;;
    
    status)
      show_backup_status
      ;;
    
    *)
      echo "Usage: $0 {backup|verify|restore|cleanup|status} [options]"
      echo ""
      echo "Commands:"
      echo "  backup              Create a new database backup"
      echo "  verify [file]       Verify backup integrity"
      echo "  restore [file]      Restore from backup (latest if not specified)"
      echo "  cleanup             Remove backups older than $RETENTION_DAYS days"
      echo "  status              Show backup status report"
      echo ""
      echo "Environment Variables:"
      echo "  BACKUP_DIR          Backup directory (default: ./.backups)"
      echo "  RETENTION_DAYS      Backup retention period (default: 30)"
      echo "  DATABASE_HOST       Database host (default: localhost)"
      echo "  DATABASE_PORT       Database port (default: 3306)"
      echo "  DATABASE_USER       Database user (default: root)"
      echo "  DATABASE_PASSWORD   Database password"
      echo "  DATABASE_NAME       Database name (default: field_worker_scheduler)"
      exit 1
      ;;
  esac
}

# Run main function
main "$@"

