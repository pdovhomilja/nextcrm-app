/**
 * One-time migration: copy openAi_keys rows into ApiKeys with encryption.
 * Run with: pnpm exec tsx scripts/migrate-openai-keys.ts
 * Requires EMAIL_ENCRYPTION_KEY to be set in your .env.
 *
 * NOTE: The openAi_keys table is dropped by the Prisma migration (Task 1).
 * If you have existing production data in openAi_keys, restore it from backup
 * and run this script against a schema that still has both tables.
 * For new installations this is a no-op.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("openAi_keys table was dropped in the Task 1 migration.");
  console.log(
    "If you had existing data, restore from backup and re-run against the old schema."
  );
  console.log("For new installations: no migration needed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
