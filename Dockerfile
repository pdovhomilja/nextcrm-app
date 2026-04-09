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

# Dummy env vars for build-time validation. Next.js collects page data
# during build, which imports modules that check env vars at load time.
# Real values are injected at runtime via docker-compose.
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
ENV INNGEST_ID="nextcrm-build"
ENV INNGEST_APP_NAME="NextCRM-Build"
ENV INNGEST_EVENT_KEY="build-placeholder"
ENV INNGEST_SIGNING_KEY="build-placeholder"
ENV BETTER_AUTH_SECRET="build-time-placeholder-secret-replace-at-runtime"
ENV BETTER_AUTH_URL="http://localhost:3000"
ENV MINIO_ENDPOINT="http://placeholder:9000"
ENV MINIO_PORT="9000"
ENV MINIO_BUCKET="placeholder"
ENV MINIO_USE_SSL="false"
ENV MINIO_ACCESS_KEY="placeholder"
ENV MINIO_SECRET_KEY="placeholder"
ENV NEXT_PUBLIC_MINIO_ENDPOINT="http://placeholder:9000"
ENV EMAIL_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000"
ENV OPENAI_API_KEY="sk-placeholder-for-build"
ENV RESEND_API_KEY="re_placeholder_for_build"
ENV SKIP_ENV_VALIDATION=1

RUN pnpm prisma generate
RUN pnpm next build

# ============================================
# Stage 3: Production runner
# ============================================
FROM node:22-alpine AS runner

RUN apk add --no-cache curl postgresql-client

# Install Prisma CLI + tsx + dotenv into a SEPARATE /opt/tools directory.
# This avoids conflicts with Next.js standalone node_modules (which has
# a pnpm-symlinked structure that npm install chokes on). We'll expose
# these via PATH and NODE_PATH so prisma.config.ts can resolve `prisma/config`.
WORKDIR /opt/tools
RUN printf '{"name":"nextcrm-tools","version":"0.0.0","private":true}\n' > package.json && \
    npm install --no-audit --no-fund \
      prisma@7.6.0 \
      @prisma/client@7.6.0 \
      @prisma/adapter-pg@7.6.0 \
      pg@8.18.0 \
      tsx@4.21.0 \
      dotenv@17.3.1 \
      typescript@5.9.3

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output (includes its own minimal node_modules
# with @prisma/client the app needs at runtime)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Copy Prisma schema + migrations for runtime migrate deploy
COPY --from=build /app/prisma ./prisma

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
    > /app/prisma.config.ts

# Merge /opt/tools packages into /app/node_modules so ESM import
# resolution (used by tsx for the seed script) can find them.
# ESM ignores NODE_PATH, so packages like @prisma/adapter-pg must exist
# as real directories under /app/node_modules. The `-n` flag prevents
# overwriting existing symlinks/dirs from the pnpm-structured standalone.
RUN mkdir -p /app/node_modules/@prisma && \
    cp -rn /opt/tools/node_modules/@prisma/adapter-pg /app/node_modules/@prisma/ 2>/dev/null || true && \
    cp -rn /opt/tools/node_modules/pg-cloudflare /app/node_modules/ 2>/dev/null || true

# Copy entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Set ownership for /app (standalone output + prisma)
# and /opt/tools so the non-root nextjs user can use them.
RUN chown -R nextjs:nodejs /app /opt/tools

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Make prisma/tsx CLIs discoverable AND make prisma.config.ts able to
# `import "prisma/config"` via Node's module resolution (NODE_PATH).
ENV PATH="/opt/tools/node_modules/.bin:$PATH"
ENV NODE_PATH="/opt/tools/node_modules"

ENTRYPOINT ["./docker-entrypoint.sh"]
