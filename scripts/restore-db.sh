#!/bin/bash
# FusionOS Database Restore Script — Phase 23
#
# Restores a compressed PostgreSQL backup.
# Usage: ./scripts/restore-db.sh <backup-file.sql.gz>
#
# WARNING: This will OVERWRITE the target database.
# Always test restoration in an isolated environment first.

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║     ⚠️  FusionOS Database Restore — DANGEROUS  ⚠️        ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════╝${NC}"

# Check arguments
if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh "${BACKUP_DIR}"/fusionos_backup_*.sql.gz 2>/dev/null || echo "  No backups found"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}ERROR: Backup file not found: ${BACKUP_FILE}${NC}"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
  exit 1
fi

DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo -e "${YELLOW}Database: ${DB_NAME}${NC}"
echo -e "${YELLOW}Backup file: ${BACKUP_FILE}${NC}"
echo -e "${YELLOW}Backup size: ${BACKUP_SIZE}${NC}"
echo ""
echo -e "${RED}This will OVERWRITE the database '${DB_NAME}'.${NC}"
echo -e "${RED}Type 'yes' to proceed:${NC}"

read -r CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo -e "${GREEN}Restoring database...${NC}"
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL" --quiet 2>/dev/null

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Restore completed successfully${NC}"
  echo -e "${GREEN}  Database '${DB_NAME}' has been restored from:${NC}"
  echo -e "${GREEN}  ${BACKUP_FILE}${NC}"
else
  echo -e "${RED}✗ Restore failed${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Run 'npx prisma db push' to verify schema consistency.${NC}"
echo -e "${YELLOW}Run the full test suite to verify data integrity.${NC}"
