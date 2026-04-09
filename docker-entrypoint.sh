#!/bin/sh
set -e

echo "==> NextCRM Docker Entrypoint"

# --- 1. Wait for Postgres ---
echo "==> Waiting for PostgreSQL..."
RETRIES=30
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -q 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "ERROR: PostgreSQL did not become ready in time."
    exit 1
  fi
  echo "    Postgres not ready, retrying in 1s... ($RETRIES attempts left)"
  sleep 1
done
echo "==> PostgreSQL is ready."

# --- 2. Auto-generate secrets if not provided ---
if [ -z "$BETTER_AUTH_SECRET" ]; then
  export BETTER_AUTH_SECRET=$(head -c 32 /dev/urandom | base64)
  echo "==> Generated BETTER_AUTH_SECRET"
fi

if [ -z "$EMAIL_ENCRYPTION_KEY" ]; then
  export EMAIL_ENCRYPTION_KEY=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
  echo "==> Generated EMAIL_ENCRYPTION_KEY"
fi

# --- 3. Run Prisma migrations ---
echo "==> Running database migrations..."
npx prisma migrate deploy
echo "==> Migrations complete."

# --- 4. Create MinIO bucket (idempotent) ---
if [ -n "$MINIO_ENDPOINT" ] && [ -n "$MINIO_ACCESS_KEY" ] && [ -n "$MINIO_SECRET_KEY" ] && [ -n "$MINIO_BUCKET" ]; then
  echo "==> Ensuring MinIO bucket '$MINIO_BUCKET' exists..."
  # Strip protocol for host:port extraction
  MINIO_HOST=$(echo "$MINIO_ENDPOINT" | sed 's|https\?://||')

  # Create bucket via S3 API — returns 200 if created, 409 if exists (both are fine)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT "http://${MINIO_HOST}/${MINIO_BUCKET}" \
    -H "Host: ${MINIO_HOST}" \
    -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
    2>/dev/null || echo "000")

  if [ "$STATUS" = "200" ]; then
    echo "==> Bucket '$MINIO_BUCKET' created."
  elif [ "$STATUS" = "409" ]; then
    echo "==> Bucket '$MINIO_BUCKET' already exists."
  else
    echo "WARN: Could not create MinIO bucket (HTTP $STATUS). File storage may not work until bucket is created manually."
  fi
fi

# --- 5. Conditional database seed ---
echo "==> Checking if database needs seeding..."
USER_COUNT=$(npx prisma db execute --stdin <<'SQL' 2>/dev/null | grep -c "1" || echo "0"
SELECT 1 FROM "User" LIMIT 1;
SQL
)

if [ "$USER_COUNT" = "0" ]; then
  echo "==> No users found, seeding database..."
  npx prisma db seed
  echo "==> Seeding complete."
else
  echo "==> Database already has users, skipping seed."
fi

# --- 6. Start the application ---
echo "==> Starting NextCRM..."
exec node server.js
