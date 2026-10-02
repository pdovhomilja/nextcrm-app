/**
 * Ad-hoc runner for the homepage prompt-layer seed: `pnpm seed:homepage-prompts`.
 *
 * Deliberately NOT behind scripts/assert-local-db.sh - it must be able to target
 * any environment (it only upserts the 26 fixed-id system rows and never touches
 * operator-created prompts). The primary delivery channel to hosted environments
 * is migration 20261001130000_seed_homepage_prompt_layers; use this for local/dev
 * or an ad-hoc re-seed. Targets whatever DATABASE_URL is set (.env.local is loaded
 * if present).
 */
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";
import { seedHomepagePromptLayers } from "./homepage-prompt-layers";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await seedHomepagePromptLayers(prisma);
    console.log("Homepage prompt layers seeded");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
