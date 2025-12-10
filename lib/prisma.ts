import { PrismaClient } from "@prisma/client";

declare global {
  var cachedPrisma: PrismaClient | undefined;
}

// Prisma Client configuration with connection pooling and lifecycle management
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Ensure graceful shutdown on hot reload in development
  if (process.env.NODE_ENV !== "production") {
    // Clean up on process termination
    const cleanup = async () => {
      await client.$disconnect();
    };

    process.on("beforeExit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  return client;
};

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = prismaClientSingleton();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = prismaClientSingleton();
  }
  prisma = global.cachedPrisma;
}

export const prismadb = prisma;
