# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# Enable corepack and prepare pnpm in a single layer for better caching
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy lock files first (changes less frequently) for maximum cache efficiency
COPY pnpm-lock.yaml package.json ./

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:22-alpine AS build

WORKDIR /app

# Enable corepack (reuse from deps if cached)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Dummy env vars for build-time validation. Next.js collects page data
# during build, which imports modules that check env vars at load time.
# Real values are injected at runtime via docker-compose.
ENV DATABASE_URL="postgresql://placeholder:[REDACTED]@placeholder:5432/placeholder" \
    INNGEST_ID="nextcrm-build" \
    INNGEST_APP_NAME="NextCRM-Build" \
    INNGEST_EVENT_KEY="build-placeholder" \
    INNGEST_SIGNING_KEY="build-placeholder" \
    BETTER_AUTH_SECRET="build-time-placeholder-secret-replace-at-runtime" \
    BETTER_AUTH_URL="http://localhost:3000" \
    MINIO_ENDPOINT="http://placeholder:9000" \
    MINIO_PORT="9000" \
    MINIO_BUCKET="placeholder" \
    MINIO_USE_SSL="false" \
    MINIO_ACCESS_KEY="placeholder" \
    MINIO_SECRET_KEY="placeholder" \
    NEXT_PUBLIC_MINIO_ENDPOINT="http://placeholder:9000" \
    EMAIL_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000" \
    OPENAI_API_KEY="sk-placeholder-for-build" \
    RESEND_API_KEY="re_placeholder_for_build" \
    SKIP_ENV_VALIDATION=1

# Run build steps in a single layer to reduce intermediate images
RUN pnpm prisma generate && pnpm next build

# ============================================
# Stage 3: Production runner
# ============================================
FROM node:22-alpine AS runner

# Install system dependencies in a single layer
RUN apk add --no-cache curl postgresql-client

# Set environment early to consolidate layers
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user before copying files (enables --chown in COPY)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install Prisma CLI + tsx + dotenv into /opt/tools to avoid conflicts
# with Next.js standalone node_modules (pnpm-symlinked structure).
# We'll expose these via PATH and NODE_PATH for Prisma/tsx discovery.
WORKDIR /opt/tools
RUN printf '{"name":"nextcrm-tools","version":"0.0.0","private":true}\n' > package.json && \
    npm install --no-audit --no-fund \
      prisma@7.6.0 \
      @prisma/client@7.6.0 \
      @prisma/adapter-pg@7.6.0 \
      pg@8.18.0 \
      tsx@4.21.0 \
      dotenv@17.3.1 \
      typescript@5.9.3 && \
    npm cache clean --force

WORKDIR /app

# Copy standalone build output with proper ownership
# (includes minimal node_modules with @prisma/client the app needs)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema + migrations for runtime migrate deploy
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma

# Copy and set permissions for entrypoint in one command
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Write a Docker-specific prisma.config.ts that does not import dotenv
# (env vars are injected by docker-compose, not loaded from .env files).
RUN printf '%s\n' \
    'import { defineConfig, env } from "prisma/config";' \
    '' \
    'export default defineConfig({' \
    '  datasource: {' \
    '    url: env("DATABASE_URL"),' \
    '  },' \
    '  migrations: {' \
    '    seed: "tsx prisma/seeds/seed.ts",' \
    '  },' \
    '});' \
    > /app/prisma.config.ts && \
    chown nextjs:nodejs /app/prisma.config.ts

# Merge /opt/tools packages into /app/node_modules for ESM resolution.
# ESM ignores NODE_PATH, so packages like @prisma/adapter-pg must exist
# as real directories. The `-n` flag prevents overwriting pnpm symlinks.
RUN mkdir -p /app/node_modules/@prisma && \
    cp -rn /opt/tools/node_modules/@prisma/adapter-pg /app/node_modules/@prisma/ 2>/dev/null || true && \
    cp -rn /opt/tools/node_modules/pg-cloudflare /app/node_modules/ 2>/dev/null || true && \
    chown -R nextjs:nodejs /app /opt/tools

USER nextjs

EXPOSE 3000

# Set PATH to expose Prisma/tsx CLIs and NODE_PATH for module resolution
ENV PATH="/opt/tools/node_modules/.bin:$PATH" \
    NODE_PATH="/opt/tools/node_modules"

ENTRYPOINT ["./docker-entrypoint.sh"]
