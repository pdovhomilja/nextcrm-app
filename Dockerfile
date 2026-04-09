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
