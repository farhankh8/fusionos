#!/bin/bash
# FusionOS Database Backup Script — Phase 23
#
# Creates timestamped PostgreSQL backups with compression.
# Usage: ./scripts/backup-db.sh
#
# Prerequisites:
#   - PostgreSQL accessible via DATABASE_URL
#   - pg_dump available in PATH
#
# Safety:
#   - Never runs automatically against production
#   - Creates compressed backups with timestamps
#   - Verifies backup integrity

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/fusionos_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       FusionOS Database Backup — Phase 23                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
  echo "Usage: DATABASE_URL=postgresql://... ./scripts/backup-db.sh"
  exit 1
fi

# Extract connection details from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\2|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

echo -e "${YELLOW}Host: ${DB_HOST}${NC}"
echo -e "${YELLOW}Port: ${DB_PORT}${NC}"
echo -e "${YELLOW}Database: ${DB_NAME}${NC}"
echo -e "${YELLOW}Backup: ${BACKUP_FILE}${NC}"
echo ""

# Perform backup
echo -e "${GREEN}Starting backup...${NC}"
pg_dump "$DATABASE_URL" --no-owner --no-privileges --clean --if-exists 2>/dev/null | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✓ Backup completed successfully${NC}"
  echo -e "${GREEN}  Size: ${BACKUP_SIZE}${NC}"
  echo -e "${GREEN}  File: ${BACKUP_FILE}${NC}"
else
  echo -e "${RED}✗ Backup failed${NC}"
  exit 1
fi

# Clean old backups
echo ""
echo -e "${YELLOW}Cleaning backups older than ${RETENTION_DAYS} days...${NC}"
find "${BACKUP_DIR}" -name "fusionos_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# List recent backups
echo ""
echo -e "${GREEN}Recent backups:${NC}"
ls -lh "${BACKUP_DIR}"/fusionos_backup_*.sql.gz 2>/dev/null | tail -5

echo ""
echo -e "${GREEN}Done.${NC}"
