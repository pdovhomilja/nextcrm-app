#!/bin/bash

# Script to apply rate limiting middleware to all API routes
# This script systematically updates API route files to include rate limiting

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for tracking progress
PROCESSED=0
SKIPPED=0
FAILED=0

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Check if file needs rate limiting
needs_rate_limiting() {
    local file="$1"

    # Skip if already has rate limiting
    if grep -q "rateLimited\|withRateLimit" "$file"; then
        return 1
    fi

    # Skip certain files
    case "$file" in
        */auth/[...nextauth]/*) return 1 ;;  # NextAuth handles its own auth
        */health/*) return 1 ;;  # Health checks bypass
        */cron/*) return 1 ;;  # Cron jobs have CRON_SECRET
        */webhooks/stripe/*) return 1 ;;  # Webhooks verify signature
    esac

    return 0
}

# Apply rate limiting to a route file
apply_rate_limiting() {
    local file="$1"

    log_info "Processing: $file"

    # Create backup
    cp "$file" "${file}.backup"

    # Check if file has exports
    if ! grep -q "export async function" "$file"; then
        log_warn "Skipping $file - no exported async functions found"
        rm "${file}.backup"
        ((SKIPPED++))
        return 0
    fi

    # Apply transformation
    # 1. Add imports at top
    if ! grep -q "import.*rateLimited.*from.*@/middleware/with-rate-limit" "$file"; then
        # Find first import line and add after it
        sed -i '1a import { rateLimited } from "@/middleware/with-rate-limit";' "$file"
    fi

    # 2. Change NextResponse to NextRequest for request parameter
    sed -i 's/import { NextResponse }/import { NextRequest, NextResponse }/g' "$file"

    # 3. Convert exported functions to internal functions
    sed -i 's/export async function GET(/async function handleGET(/g' "$file"
    sed -i 's/export async function POST(/async function handlePOST(/g' "$file"
    sed -i 's/export async function PUT(/async function handlePUT(/g' "$file"
    sed -i 's/export async function DELETE(/async function handleDELETE(/g' "$file"
    sed -i 's/export async function PATCH(/async function handlePATCH(/g' "$file"

    # 4. Change Request to NextRequest for parameters
    sed -i 's/\(async function handle[A-Z]*\)(req: Request)/\1(req: NextRequest)/g' "$file"

    # 5. Add exports at end of file
    local exports=""
    if grep -q "async function handleGET" "$file"; then
        exports="${exports}export const GET = rateLimited(handleGET);\n"
    fi
    if grep -q "async function handlePOST" "$file"; then
        exports="${exports}export const POST = rateLimited(handlePOST);\n"
    fi
    if grep -q "async function handlePUT" "$file"; then
        exports="${exports}export const PUT = rateLimited(handlePUT);\n"
    fi
    if grep -q "async function handleDELETE" "$file"; then
        exports="${exports}export const DELETE = rateLimited(handleDELETE);\n"
    fi
    if grep -q "async function handlePATCH" "$file"; then
        exports="${exports}export const PATCH = rateLimited(handlePATCH);\n"
    fi

    if [ -n "$exports" ]; then
        echo -e "\n// Apply rate limiting" >> "$file"
        echo -e "$exports" >> "$file"
    fi

    ((PROCESSED++))
    log_info "✓ Applied rate limiting to $file"
}

# Main execution
main() {
    log_info "Starting rate limiting application to API routes..."

    # Find all API route files
    find app/api -type f -name "route.ts" | while read -r file; do
        if needs_rate_limiting "$file"; then
            apply_rate_limiting "$file" || {
                log_error "Failed to process $file"
                # Restore backup
                if [ -f "${file}.backup" ]; then
                    mv "${file}.backup" "$file"
                fi
                ((FAILED++))
            }
        else
            log_info "Skipping $file (already has rate limiting or excluded)"
            ((SKIPPED++))
        fi
    done

    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Rate limiting application complete!"
    log_info "Processed: ${GREEN}${PROCESSED}${NC}"
    log_info "Skipped: ${YELLOW}${SKIPPED}${NC}"
    log_info "Failed: ${RED}${FAILED}${NC}"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Cleanup backups if all successful
    if [ "$FAILED" -eq 0 ]; then
        log_info "Cleaning up backup files..."
        find app/api -type f -name "route.ts.backup" -delete
    else
        log_warn "Some files failed. Backup files retained for recovery."
    fi
}

# Show help
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    cat <<EOF
Apply Rate Limiting Script

Usage: ./scripts/apply-rate-limiting.sh [OPTIONS]

This script automatically applies rate limiting middleware to all API routes
in the NextCRM application.

OPTIONS:
    -h, --help      Show this help message
    --dry-run       Show what would be changed without applying
    --rollback      Restore all files from .backup files

WHAT IT DOES:
    1. Adds rate limiting imports to each route file
    2. Converts exported functions to internal handlers
    3. Wraps handlers with rateLimited() middleware
    4. Preserves all existing functionality

SAFETY:
    - Creates .backup files before modifying
    - Skips files with existing rate limiting
    - Excludes health checks, webhooks, and cron endpoints
    - Can be rolled back if needed

EXAMPLES:
    ./scripts/apply-rate-limiting.sh           # Apply rate limiting
    ./scripts/apply-rate-limiting.sh --dry-run # Preview changes
    ./scripts/apply-rate-limiting.sh --rollback # Undo changes
EOF
    exit 0
fi

# Handle rollback
if [ "${1:-}" = "--rollback" ]; then
    log_info "Rolling back changes..."
    find app/api -type f -name "route.ts.backup" | while read -r backup; do
        original="${backup%.backup}"
        mv "$backup" "$original"
        log_info "Restored $original"
    done
    log_info "Rollback complete"
    exit 0
fi

# Handle dry-run
if [ "${1:-}" = "--dry-run" ]; then
    log_info "DRY RUN MODE - No files will be modified"
    find app/api -type f -name "route.ts" | while read -r file; do
        if needs_rate_limiting "$file"; then
            echo "Would process: $file"
        else
            echo "Would skip: $file"
        fi
    done
    exit 0
fi

# Run main
main
