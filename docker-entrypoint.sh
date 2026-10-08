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

# --- 2. Secrets ---
# A value set in the environment always wins. A missing one is generated once
# and saved under $SECRETS_DIR (the app_data volume), so it survives restarts
# and upgrades. Never regenerate them: a new BETTER_AUTH_SECRET logs everyone
# out, a new EMAIL_ENCRYPTION_KEY makes stored passwords and API keys
# unreadable. If the directory is not writable the container stops instead of
# running with a throwaway secret.
SECRETS_DIR=/app/data/secrets

hex32() { head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
base64_32() { head -c 32 /dev/urandom | base64; }

load_secret() {
  name="$1"
  generator="$2"
  eval "current=\${$name:-}"
  [ -n "$current" ] && return 0
  file="$SECRETS_DIR/$name"
  if [ ! -s "$file" ]; then
    if ! (umask 077 && mkdir -p "$SECRETS_DIR" && "$generator" > "$file.tmp" && mv "$file.tmp" "$file"); then
      echo "ERROR: $name is not set and could not be saved to $SECRETS_DIR."
      echo "       Set $name in the environment, or mount a writable volume at /app/data."
      exit 1
    fi
    echo "==> Generated $name and saved it to $file (include it in your backups)."
  fi
  export "$name=$(cat "$file")"
}

load_secret BETTER_AUTH_SECRET base64_32
load_secret EMAIL_ENCRYPTION_KEY hex32
# Shared with the bundled Inngest server, which reads the same files.
load_secret INNGEST_SIGNING_KEY hex32
load_secret INNGEST_EVENT_KEY hex32

# --- 3. Run Prisma migrations ---
echo "==> Running database migrations..."
prisma migrate deploy
echo "==> Migrations complete."

# --- 4. Create MinIO bucket (idempotent) ---
if [ -n "$MINIO_ENDPOINT" ] && [ -n "$MINIO_ACCESS_KEY" ] && [ -n "$MINIO_SECRET_KEY" ] && [ -n "$MINIO_BUCKET" ]; then
  echo "==> Ensuring MinIO bucket '$MINIO_BUCKET' exists..."
  BUCKET_URL="${MINIO_ENDPOINT%/}/${MINIO_BUCKET}"

  # Create bucket via S3 API (SigV4-signed; MinIO rejects plain basic auth
  # with 400) — returns 200 if created, 409 if exists (both are fine)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT "$BUCKET_URL" \
    --aws-sigv4 "aws:amz:us-east-1:s3" \
    -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
    2>/dev/null || echo "000")

  if [ "$STATUS" = "200" ]; then
    echo "==> Bucket '$MINIO_BUCKET' created."
  elif [ "$STATUS" = "409" ]; then
    echo "==> Bucket '$MINIO_BUCKET' already exists."
  else
    echo "WARN: Could not create MinIO bucket (HTTP $STATUS). File storage may not work until bucket is created manually."
  fi

  # Uploaded files are linked by plain URL (no signature), so browsers need
  # anonymous read on the upload folders. Invoices stay private (presigned).
  # Applied only when the bucket has no policy yet; an existing one is kept.
  POLICY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "${BUCKET_URL}?policy=" \
    --aws-sigv4 "aws:amz:us-east-1:s3" \
    -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
    2>/dev/null || echo "000")
  if [ "$POLICY_STATUS" = "404" ]; then
    RESOURCES=""
    for prefix in avatars images documents uploads thumbnails; do
      RESOURCES="${RESOURCES:+$RESOURCES,}\"arn:aws:s3:::${MINIO_BUCKET}/${prefix}/*\""
    done
    POLICY="{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":[\"*\"]},\"Action\":[\"s3:GetObject\"],\"Resource\":[${RESOURCES}]}]}"
    PUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -X PUT "${BUCKET_URL}?policy=" \
      -H "Content-Type: application/json" \
      --data "$POLICY" \
      --aws-sigv4 "aws:amz:us-east-1:s3" \
      -u "${MINIO_ACCESS_KEY}:${MINIO_SECRET_KEY}" \
      2>/dev/null || echo "000")
    if [ "$PUT_STATUS" = "204" ] || [ "$PUT_STATUS" = "200" ]; then
      echo "==> Set public-read policy on upload folders of '$MINIO_BUCKET'."
    else
      echo "WARN: Could not set bucket policy (HTTP $PUT_STATUS). Uploaded files will not open in the browser until '$MINIO_BUCKET' allows anonymous GetObject on avatars/, images/, documents/, uploads/ and thumbnails/."
    fi
  fi
fi

# --- 5. Conditional database seed ---
# Use psql to count users directly (reliable) rather than prisma db execute
# (which emits noisy output hard to parse).
echo "==> Checking if database needs seeding..."
USER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -tAc 'SELECT COUNT(*) FROM "Users";' 2>/dev/null || echo "0")

# Strip whitespace
USER_COUNT=$(echo "$USER_COUNT" | tr -d '[:space:]')

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo "==> No users found, seeding database..."
  prisma db seed
  echo "==> Seeding complete."
else
  echo "==> Database already has $USER_COUNT user(s), skipping seed."
fi

# --- 6. Start the application ---
echo "==> Starting NextCRM..."
exec node server.js
