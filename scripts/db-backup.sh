#!/bin/bash

# Database Backup Script for NextCRM
# This script creates timestamped PostgreSQL backups

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(cat "$PROJECT_DIR/.env" | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/nextcrm_backup_$TIMESTAMP.sql"
KEEP_DAYS=30  # Keep backups for 30 days

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}ERROR: DATABASE_URL not found in environment${NC}"
  exit 1
fi

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Starting database backup...${NC}"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Backup file: $BACKUP_FILE"
echo ""

# Create backup using pg_dump
PGPASSWORD=$DB_PASS pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --format=plain \
  --file="$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
  # Compress the backup
  gzip "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE}.gz"

  # Get file size
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

  echo -e "${GREEN}✓ Backup completed successfully!${NC}"
  echo "File: $BACKUP_FILE"
  echo "Size: $SIZE"
  echo ""

  # Clean up old backups
  echo -e "${YELLOW}Cleaning up backups older than $KEEP_DAYS days...${NC}"
  find "$BACKUP_DIR" -name "casehq_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete

  # List recent backups
  echo ""
  echo "Recent backups:"
  ls -lh "$BACKUP_DIR" | tail -n 5

else
  echo -e "${RED}✗ Backup failed!${NC}"
  exit 1
fi