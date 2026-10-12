#!/usr/bin/env bash
set -euo pipefail

# Supabase ↔ Vercel: migrate on direct URL; runtime uses pooled POSTGRES_URL / POSTGRES_PRISMA_URL.
if [ -n "${DIRECT_DATABASE_URL:-}" ]; then
  export DATABASE_URL="$DIRECT_DATABASE_URL"
elif [ -n "${POSTGRES_URL_NON_POOLING:-}" ]; then
  export DATABASE_URL="$POSTGRES_URL_NON_POOLING"
elif [ -n "${DIRECT_URL:-}" ]; then
  export DATABASE_URL="$DIRECT_URL"
fi

# Embeddings migrations need pgvector (Supabase + local pgvector/pgvector image).
echo 'CREATE EXTENSION IF NOT EXISTS vector;' | pnpm exec prisma db execute --stdin --schema prisma/schema.prisma

exec prisma migrate deploy
