#!/usr/bin/env bash
set -euo pipefail

# Build-time migrations may use a direct/migration URL so runtime DATABASE_URL can use a pooled app role.
if [ -n "${DIRECT_DATABASE_URL:-}" ]; then
  export DATABASE_URL="$DIRECT_DATABASE_URL"
fi

exec prisma migrate deploy
