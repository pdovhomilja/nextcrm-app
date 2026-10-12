#!/usr/bin/env bash
set -euo pipefail

# Supabase ↔ Vercel: migrate on direct URL; runtime uses pooled POSTGRES_URL / POSTGRES_PRISMA_URL.
if [ "${VERCEL:-}" = "1" ] && [ -n "${POSTGRES_URL_NON_POOLING:-}" ]; then
  export DATABASE_URL="$POSTGRES_URL_NON_POOLING"
elif [ -n "${DIRECT_DATABASE_URL:-}" ]; then
  export DATABASE_URL="$DIRECT_DATABASE_URL"
elif [ -n "${POSTGRES_URL_NON_POOLING:-}" ]; then
  export DATABASE_URL="$POSTGRES_URL_NON_POOLING"
elif [ -n "${DIRECT_URL:-}" ]; then
  export DATABASE_URL="$DIRECT_URL"
fi

# Embeddings migrations need pgvector (Supabase + local pgvector/pgvector image).
echo 'CREATE EXTENSION IF NOT EXISTS vector;' | pnpm exec prisma db execute --stdin

run_migrate_deploy() {
  pnpm exec prisma migrate deploy
}

set +e
migrate_out="$(run_migrate_deploy 2>&1)"
migrate_code=$?
set -e

if [ "$migrate_code" -ne 0 ]; then
  echo "$migrate_out"
  if echo "$migrate_out" | grep -q 'P3009'; then
    echo "[prisma-migrate-deploy] Recovering failed pgvector migration (P3009) and retrying…"
    pnpm exec prisma migrate resolve --rolled-back "20260320000000_add_pgvector_embeddings"
    run_migrate_deploy
  else
    exit "$migrate_code"
  fi
fi
