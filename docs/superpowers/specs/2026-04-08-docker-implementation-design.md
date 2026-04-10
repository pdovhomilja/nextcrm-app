# Docker Implementation Design

**Date:** 2026-04-08
**Status:** Approved

## Goal

Enable users to clone the NextCRM repo and run `docker-compose up` to get a fully working instance — app, database, background jobs, and file storage — with zero manual configuration. Optimized for self-hosting platforms like Coolify.

## User Experience

```bash
git clone https://github.com/pdovhomilja/nextcrm-app
cd nextcrm-app
docker-compose up
# → app ready at http://localhost:3000
```

## Architecture

### Services

| Service | Image | Internal Port | Exposed Port | Purpose |
|---------|-------|--------------|--------------|---------|
| app | Built from `./Dockerfile` | 3000 | 3000 | NextCRM application |
| postgres | `postgres:18-alpine` | 5432 | none | Database |
| inngest | `inngest/inngest:latest` | 8288 | none | Background jobs |
| minio | `minio/minio:latest` | 9000, 9001 | none | Object storage (S3-compatible) |

### Networking

- Single Docker network: `nextcrm`
- Only port 3000 exposed to host
- All inter-service communication over internal DNS (e.g., `postgres:5432`, `minio:9000`, `inngest:8288`)
- Users who need direct DB/MinIO access can uncomment port mappings in docker-compose.yml

### Volumes

- `postgres_data` — persistent database storage
- `minio_data` — persistent file storage

## Dockerfile (Multi-stage)

### Stage 1: `deps`

- Base: `node:22-alpine`
- Install `pnpm` globally
- Copy `package.json` + `pnpm-lock.yaml`
- Run `pnpm install --frozen-lockfile`
- This layer is cached — only rebuilds when dependencies change

### Stage 2: `build`

- Copy source code from context
- Copy `node_modules` from `deps` stage
- Run `pnpm prisma generate`
- Run `pnpm next build`
- Next.js produces standalone output in `.next/standalone/`

### Stage 3: `runner`

- Base: `node:22-alpine`
- Create non-root user `nextjs` (uid 1001)
- Copy from build stage:
  - `.next/standalone/` — the self-contained server
  - `.next/static/` → `.next/standalone/.next/static/`
  - `public/` → `.next/standalone/public/`
  - `prisma/` — schema + migrations for runtime migrate/seed
  - Prisma engine binaries
- Copy `docker-entrypoint.sh`
- Run as `nextjs` user
- Entrypoint: `docker-entrypoint.sh`

**Expected image size:** ~200-300MB

## Entrypoint Script (`docker-entrypoint.sh`)

Sequential startup flow:

1. **Wait for Postgres** — loop with `pg_isready` until database accepts connections. Max 30 second timeout, then fail with clear error message.
2. **Run migrations** — `npx prisma migrate deploy` to apply all pending migrations.
3. **Create MinIO bucket** — ensure the `nextcrm` bucket exists using the MinIO S3 API via `curl` (PUT request to create bucket). No additional tools needed. Idempotent — skips if bucket already present (ignores 409 BucketAlreadyOwnedByYou).
4. **Conditional seed** — query database for existing users. If none found, run `npx prisma db seed` to create default admin account. Prevents re-seeding on container restarts.
5. **Start app** — `exec node server.js` (exec replaces shell so signals propagate correctly for graceful shutdown).

## docker-compose.yml

### Default Credentials (Internal Only)

| Service | Credentials |
|---------|------------|
| Postgres | user: `nextcrm`, password: `nextcrm`, database: `nextcrm` |
| MinIO | access key: `minioadmin`, secret key: `minioadmin123`, bucket: `nextcrm` |

### Environment Wiring

The app service receives pre-configured environment variables:

```yaml
DATABASE_URL: postgresql://nextcrm:nextcrm@postgres:5432/nextcrm
MINIO_ENDPOINT: http://minio:9000
NEXT_PUBLIC_MINIO_ENDPOINT: http://minio:9000
MINIO_PORT: "9000"
MINIO_BUCKET: nextcrm
MINIO_USE_SSL: "false"
MINIO_ACCESS_KEY: minioadmin
MINIO_SECRET_KEY: minioadmin123
INNGEST_BASE_URL: http://inngest:8288
INNGEST_EVENT_KEY: local
BETTER_AUTH_URL: http://localhost:3000
```

`BETTER_AUTH_SECRET` and `EMAIL_ENCRYPTION_KEY` are auto-generated in the entrypoint if not provided via environment.

### Health Checks

| Service | Check | Interval | Retries |
|---------|-------|----------|---------|
| postgres | `pg_isready -U nextcrm` | 5s | 5 |
| minio | `curl -f http://localhost:9000/minio/health/live` | 5s | 5 |
| inngest | `curl -f http://localhost:8288/health` | 5s | 5 |
| app | `curl -f http://localhost:3000` | 10s | 5 |

### Dependency Ordering

```
app → depends_on → postgres (healthy), minio (healthy), inngest (healthy)
```

### Restart Policy

All services: `restart: unless-stopped`

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for NextCRM |
| `docker-compose.yml` | Full-stack service orchestration |
| `docker-entrypoint.sh` | Startup script (migrations, seed, bucket creation) |
| `.dockerignore` | Exclude node_modules, .next, .git, .env* from build context |
| `.env.docker` | Example env file documenting all configurable variables |

### Modified Files

| File | Change |
|------|--------|
| `next.config.js` | Add `output: "standalone"`, add `minio` to image `remotePatterns` |

## .env.docker Structure

Variables grouped by category:

### Required (have defaults in docker-compose.yml)

- `DATABASE_URL` — Postgres connection string
- `MINIO_*` — MinIO connection details
- `INNGEST_*` — Inngest connection details
- `BETTER_AUTH_SECRET` — auto-generated if not set
- `BETTER_AUTH_URL` — defaults to http://localhost:3000
- `EMAIL_ENCRYPTION_KEY` — auto-generated if not set

### Optional (external services, disabled by default)

- `OPENAI_API_KEY` — for AI features
- `GOOGLE_ID` / `GOOGLE_SECRET` — for Google OAuth login
- `RESEND_API_KEY` — for email sending
- `FIRECRAWL_API_KEY` — for contact enrichment
- `ROSSUM_USERNAME` / `ROSSUM_PASSWORD` — for invoice parsing
- `SMTP_*` / `IMAP_*` — for email client functionality
- `E2B_API_KEY` — for E2B enrichment

## .dockerignore

```
node_modules
.next
.git
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
```

## Security Notes

- Only port 3000 exposed to host — database, MinIO, and Inngest are not accessible from outside Docker network
- App runs as non-root user in container
- Default internal credentials are for local/self-hosted use only — users deploying publicly should override via environment variables
- `.env` files excluded from Docker build context via `.dockerignore`
