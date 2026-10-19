FROM node:22-alpine AS base
RUN corepack enable

FROM base AS build
# git fetches the release tags for older docs versions (scripts/fetch-versions.mjs)
RUN apk add --no-cache git
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# The build cache grows with every docs version and is not needed at runtime.
RUN pnpm build && rm -rf .next/cache

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "start"]
