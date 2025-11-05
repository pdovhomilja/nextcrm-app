#!/bin/sh

# Run Prisma migrations and seed the database
echo "Running Prisma migrations..."
pnpm prisma-prod

# Start the Next.js application
echo "Starting Next.js application..."
exec pnpm start
