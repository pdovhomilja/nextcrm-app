# Docker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to run `docker-compose up` and get a fully working NextCRM instance with app, Postgres, Inngest, and MinIO.

**Architecture:** Multi-stage Dockerfile with standalone Next.js output. Single docker-compose.yml orchestrates 4 services on an internal network. Entrypoint script handles migrations, seeding, and MinIO bucket creation automatically.

**Tech Stack:** Docker, Docker Compose, Node 22 Alpine, Postgres 18, MinIO, Inngest Dev Server

**Spec:** `docs/superpowers/specs/2026-04-08-docker-implementation-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `Dockerfile` | Multi-stage build: deps → build → runner |
| `docker-compose.yml` | Service orchestration (app, postgres, inngest, minio) |
| `docker-entrypoint.sh` | Startup: wait for DB, migrate, seed, create bucket, start app |
| `.dockerignore` | Exclude unnecessary files from build context |
| `.env.docker` | Documented example of all configurable env vars |
| `next.config.js` | Modified: add `output: "standalone"`, add `minio` hostname |

---

### Task 1: Add `.dockerignore`

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

```
node_modules
.next
.git
.gitignore
.env
.env.local
.env*.local
*.md
.vscode
.idea
tests
e2e
playwright-report
test-results
docs
.playwright
```

- [ ] **Step 2: Commit**

```bash
git add .dockerignore
git commit -m "chore: add .dockerignore for Docker build context"
```

---

### Task 2: Modify `next.config.js` for standalone output

**Files:**
- Modify: `next.config.js`

- [ ] **Step 1: Read current `next.config.js`**

Read the file to confirm current state before editing.

- [ ] **Step 2: Add `output: "standalone"` and `minio` hostname**

Edit `next.config.js` — add `output: "standalone"` to the `nextConfig` object and add `minio` to the `remotePatterns` array:

```javascript
const withNextIntl = require("next-intl/plugin")(
  "./i18n/request.ts"
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "localhost" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "minio-cwg0o4ss0scoccgwso8sk004.coolify.cz" },
      { protocol: "http", hostname: "minio" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:locale/crm/targets/:path*",
        destination: "/:locale/campaigns/targets/:path*",
        permanent: true,
      },
      {
        source: "/:locale/crm/target-lists/:path*",
        destination: "/:locale/campaigns/target-lists/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
```

The two changes are:
1. `output: "standalone"` — produces self-contained build
2. `{ protocol: "http", hostname: "minio" }` — allows Next.js Image to load from internal MinIO service

- [ ] **Step 3: Verify the app still builds locally**

```bash
pnpm build
```

Expected: Build succeeds. The `.next/standalone/` directory should now exist.

- [ ] **Step 4: Commit**

```bash
git add next.config.js
git commit -m "feat: enable Next.js standalone output for Docker"
```

---

### Task 3: Create `docker-entrypoint.sh`

**Files:**
- Create: `docker-entrypoint.sh`

- [ ] **Step 1: Create the entrypoint script**

```bash
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
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x docker-entrypoint.sh
```

- [ ] **Step 3: Commit**

```bash
git add docker-entrypoint.sh
git commit -m "feat: add Docker entrypoint script for auto-initialization"
```

---

### Task 4: Create `Dockerfile`

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create the multi-stage Dockerfile**

```dockerfile
# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate
RUN pnpm next build

# ============================================
# Stage 3: Production runner
# ============================================
FROM node:22-alpine AS runner

RUN apk add --no-cache curl postgresql-client

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Copy Prisma files for runtime migrations and seeding
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/.pnpm/@prisma+engines*/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=build /app/node_modules/.pnpm/prisma*/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy seed dependencies (ts-node, tsx, typescript for seed script)
COPY --from=build /app/node_modules/.pnpm/ts-node*/node_modules/ts-node ./node_modules/ts-node
COPY --from=build /app/node_modules/.pnpm/tsx*/node_modules/tsx ./node_modules/tsx
COPY --from=build /app/node_modules/.pnpm/typescript*/node_modules/typescript ./node_modules/typescript
COPY --from=build /app/package.json ./package.json

# Make npx find prisma
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
```

**Notes on the runner stage:**
- `postgresql-client` provides `pg_isready` for the entrypoint health check
- `curl` is needed for MinIO bucket creation
- Prisma client, engines, and CLI are copied individually to avoid pulling the entire `node_modules`
- Seed dependencies (ts-node, tsx, typescript) are needed for `prisma db seed` which runs `ts-node ./prisma/seeds/seed.ts`
- The `PATH` addition ensures `npx prisma` resolves correctly

- [ ] **Step 2: Verify the Dockerfile builds**

```bash
docker build -t nextcrm:test .
```

Expected: Build completes successfully. If Prisma COPY paths don't resolve, inspect the build stage to find exact paths:

```bash
docker build --target build -t nextcrm:build-debug .
docker run --rm nextcrm:build-debug ls -la node_modules/.pnpm/ | grep prisma
```

Adjust the COPY paths in the Dockerfile if the pnpm store paths differ.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: add multi-stage Dockerfile for NextCRM"
```

---

### Task 5: Create `docker-compose.yml`

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create the compose file**

```yaml
services:
  # --- PostgreSQL Database ---
  postgres:
    image: postgres:18-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: nextcrm
      POSTGRES_PASSWORD: nextcrm
      POSTGRES_DB: nextcrm
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - nextcrm
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nextcrm"]
      interval: 5s
      timeout: 5s
      retries: 5
    # Uncomment to expose Postgres to host:
    # ports:
    #   - "5432:5432"

  # --- MinIO Object Storage ---
  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    volumes:
      - minio_data:/data
    networks:
      - nextcrm
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 5s
      retries: 5
    # Uncomment to expose MinIO to host:
    # ports:
    #   - "9000:9000"
    #   - "9001:9001"

  # --- Inngest Dev Server ---
  inngest:
    image: inngest/inngest:latest
    restart: unless-stopped
    command: inngest dev -u http://app:3000/api/inngest
    networks:
      - nextcrm
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8288/health"]
      interval: 5s
      timeout: 5s
      retries: 5
    # Uncomment to expose Inngest dashboard to host:
    # ports:
    #   - "8288:8288"

  # --- NextCRM Application ---
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # Database
      DATABASE_URL: postgresql://nextcrm:nextcrm@postgres:5432/nextcrm
      DB_HOST: postgres
      DB_PORT: "5432"
      DB_USER: nextcrm

      # Auth
      BETTER_AUTH_URL: http://localhost:3000
      # BETTER_AUTH_SECRET is auto-generated if not set

      # MinIO
      NEXT_PUBLIC_MINIO_ENDPOINT: http://minio:9000
      MINIO_ENDPOINT: http://minio:9000
      MINIO_PORT: "9000"
      MINIO_BUCKET: nextcrm
      MINIO_USE_SSL: "false"
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin123

      # Inngest
      INNGEST_DEV: "1"
      INNGEST_ID: nextcrm
      INNGEST_APP_NAME: NextCRM
      INNGEST_EVENT_KEY: local
      INNGEST_SIGNING_KEY: ""
      INNGEST_BASE_URL: http://inngest:8288

      # App
      NEXT_PUBLIC_APP_NAME: NextCRM
      NEXT_PUBLIC_APP_URL: http://localhost:3000

      # Optional — override via .env file or environment:
      # OPENAI_API_KEY: ""
      # GOOGLE_ID: ""
      # GOOGLE_SECRET: ""
      # RESEND_API_KEY: ""
      # FIRECRAWL_API_KEY: ""
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
      inngest:
        condition: service_healthy
    networks:
      - nextcrm
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

volumes:
  postgres_data:
  minio_data:

networks:
  nextcrm:
    driver: bridge
```

**Key decisions:**
- `DB_HOST`, `DB_PORT`, `DB_USER` are separate env vars used by the entrypoint for `pg_isready` (which doesn't parse connection strings)
- Inngest `command` points back to the app's Inngest route for function discovery
- `inngest` healthcheck uses `wget` instead of `curl` because the Inngest image is based on a minimal distro that includes wget
- `start_period: 30s` on the app gives time for migrations and seeding before health checks start failing
- All optional API keys are commented out — users add them via `.env` file

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose.yml with all services"
```

---

### Task 6: Create `.env.docker` example file

**Files:**
- Create: `.env.docker`

- [ ] **Step 1: Create the example env file**

```bash
# ===========================================
# NextCRM Docker Environment Configuration
# ===========================================
# Copy this file to .env to customize your deployment.
# docker-compose.yml already sets sensible defaults for all
# internal services. Only set values here if you need to override.
#
# Usage:
#   cp .env.docker .env
#   # Edit .env with your values
#   docker-compose up
# ===========================================

# --- Database (default: bundled Postgres) ---
# Override to use an external database:
# DATABASE_URL=postgresql://user:pass@your-host:5432/nextcrm

# --- Auth ---
# Auto-generated on first start if not set.
# Set explicitly for stable sessions across container restarts:
# BETTER_AUTH_SECRET=your-secret-here
# BETTER_AUTH_URL=http://localhost:3000

# --- MinIO Object Storage (default: bundled MinIO) ---
# Override to use external S3-compatible storage:
# MINIO_ENDPOINT=https://your-s3-host
# MINIO_PORT=443
# MINIO_BUCKET=your-bucket
# MINIO_USE_SSL=true
# MINIO_ACCESS_KEY=your-key
# MINIO_SECRET_KEY=your-secret

# --- Google OAuth (optional) ---
# GOOGLE_ID=your-google-client-id
# GOOGLE_SECRET=your-google-client-secret

# --- OpenAI (optional, for AI features) ---
# OPENAI_API_KEY=sk-...

# --- Email Sending via Resend (optional) ---
# RESEND_API_KEY=re_...
# RESEND_FROM_EMAIL=noreply@yourdomain.com

# --- SMTP / IMAP (optional, for email client) ---
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your-user
# SMTP_PASSWORD=your-password
# IMAP_HOST=imap.example.com
# IMAP_PORT=993
# IMAP_USER=your-user
# IMAP_PASSWORD=your-password

# --- Firecrawl (optional, for contact enrichment) ---
# FIRECRAWL_API_KEY=fc-...

# --- E2B (optional, for agent enrichment) ---
# E2B_API_KEY=e2b_...

# --- Rossum (optional, for invoice parsing) ---
# ROSSUM_USERNAME=your-user
# ROSSUM_PASSWORD=your-password
```

- [ ] **Step 2: Commit**

```bash
git add .env.docker
git commit -m "docs: add .env.docker example for Docker deployments"
```

---

### Task 7: End-to-end verification

**Files:** None (testing only)

- [ ] **Step 1: Build and start all services**

```bash
docker-compose up --build -d
```

Expected: All 4 services start. Watch logs:

```bash
docker-compose logs -f app
```

Expected output sequence:
1. `==> Waiting for PostgreSQL...`
2. `==> PostgreSQL is ready.`
3. `==> Generated BETTER_AUTH_SECRET`
4. `==> Running database migrations...`
5. `==> Migrations complete.`
6. `==> Ensuring MinIO bucket 'nextcrm' exists...`
7. `==> Bucket 'nextcrm' created.`
8. `==> No users found, seeding database...`
9. `==> Seeding complete.`
10. `==> Starting NextCRM...`

- [ ] **Step 2: Verify health checks**

```bash
docker-compose ps
```

Expected: All services show `(healthy)` status.

- [ ] **Step 3: Verify the app is accessible**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: `200`

- [ ] **Step 4: Verify restart idempotency**

```bash
docker-compose restart app
docker-compose logs -f app
```

Expected: Entrypoint runs again but:
- Migrations report "no pending migrations"
- Bucket creation reports "already exists"
- Seed is skipped ("Database already has users")
- App starts normally

- [ ] **Step 5: Fix any issues found during verification**

If any step fails, debug and fix. Common issues:
- Prisma COPY paths in Dockerfile need adjustment — use `docker build --target build` to inspect
- MinIO bucket creation auth may need adjustment — test curl command manually
- Seed detection query may need adjustment based on actual Prisma output

- [ ] **Step 6: Clean up test build**

```bash
docker-compose down -v
```

- [ ] **Step 7: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "fix: Docker setup adjustments from e2e verification"
```

---

### Task 8: Verify `docker-compose up` from clean state

**Files:** None (final validation)

- [ ] **Step 1: Full clean start**

```bash
docker-compose down -v
docker rmi nextcrm-app-app 2>/dev/null || true
docker-compose up --build -d
```

- [ ] **Step 2: Wait for healthy state and verify**

```bash
# Wait for app to be healthy (up to 60s)
timeout 60 sh -c 'until docker-compose ps app | grep -q healthy; do sleep 2; done'
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: `200`

- [ ] **Step 3: Clean up**

```bash
docker-compose down -v
```

- [ ] **Step 4: Commit any final adjustments**

If any fixes were needed, commit them.
