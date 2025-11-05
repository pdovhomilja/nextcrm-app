# Dockerfile for NextCRM

# 1. Builder Stage
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definition files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Generate Prisma client and build the Next.js application
RUN pnpm vercel-build

# 2. Production Stage
FROM node:20-slim AS production

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system nodejs && \
    adduser --system --ingroup nodejs nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy the entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh .

# Set permissions for the entrypoint script
RUN chmod +x docker-entrypoint.sh

# Change ownership of the app directory to the non-root user
RUN chown -R nextjs:nodejs /app

# Switch to the non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Set the entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]

# Start the server
CMD ["node", "server.js"]
