#!/bin/bash

# DC6.cz Database Backup Script
# Creates timestamped PostgreSQL backups in the db_backups folder

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/db_backups"

# Load environment variables from .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -E '^DATABASE_URL=' "$PROJECT_ROOT/.env" | xargs)
elif [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(grep -E '^DATABASE_URL=' "$PROJECT_ROOT/.env.local" | xargs)
else
    echo -e "${RED}Error: No .env or .env.local file found${NC}"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in environment${NC}"
    exit 1
fi

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/database?schema=public
PARSED_URL="${DATABASE_URL#postgresql://}"
USER_PASS="${PARSED_URL%%@*}"
HOST_DB="${PARSED_URL#*@}"
DB_USER="${USER_PASS%%:*}"
DB_PASS="${USER_PASS#*:}"
HOST_PORT="${HOST_DB%%/*}"
DB_HOST="${HOST_PORT%%:*}"
DB_PORT="${HOST_PORT#*:}"
DB_NAME="${HOST_DB#*/}"
DB_NAME="${DB_NAME%%\?*}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/dc6_backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="$BACKUP_FILE.gz"

echo -e "${YELLOW}DC6.cz Database Backup${NC}"
echo "================================"
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE_GZ"
echo ""

# Create backup using pg_dump
echo -e "${YELLOW}Creating backup...${NC}"
PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    2>&1 | tee "$BACKUP_FILE"

# Check if backup was created successfully
if [ -s "$BACKUP_FILE" ]; then
    # Compress the backup
    echo -e "${YELLOW}Compressing backup...${NC}"
    gzip "$BACKUP_FILE"

    # Get file size
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE_GZ" | awk '{print $5}')

    echo ""
    echo -e "${GREEN}Backup completed successfully!${NC}"
    echo "File: $BACKUP_FILE_GZ"
    echo "Size: $BACKUP_SIZE"

    # List recent backups
    echo ""
    echo "Recent backups:"
    ls -lht "$BACKUP_DIR"/*.gz 2>/dev/null | head -5
else
    echo -e "${RED}Error: Backup file is empty or was not created${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi
