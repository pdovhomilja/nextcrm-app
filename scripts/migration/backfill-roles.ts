/**
 * Backfill the `role` column from existing `is_admin` / `is_account_admin` flags.
 * Idempotent: safe to run multiple times.
 *
 * Mapping:
 *   is_admin = true              → role = "admin"
 *   is_account_admin = true      → role = "member"
 *   both false                   → role = "member"
 *
 * Run: npx tsx scripts/migration/backfill-roles.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting role backfill...");

  // Admins first (is_admin takes precedence)
  const adminResult = await prisma.users.updateMany({
    where: { is_admin: true, role: "member" },
    data: { role: "admin" },
  });
  console.log(`  Updated ${adminResult.count} users to role=admin`);

  // is_account_admin users stay as "member" (already the default)

  const summary = await prisma.users.groupBy({
    by: ["role"],
    _count: { role: true },
  });
  console.log("Role distribution:", summary);

  console.log("Role backfill complete.");
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
