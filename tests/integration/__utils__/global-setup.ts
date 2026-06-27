import { execSync } from "node:child_process";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.integration", override: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("[integration global-setup] DATABASE_URL is not set. Did .env.integration load?");
}

function sh(command: string): void {
  console.log(`[integration global-setup] $ ${command}`);
  execSync(command, { stdio: "inherit", env: process.env });
}

async function truncateOtpRows(): Promise<void> {
  // The verification table accumulates OTPs across test runs. If we don't
  // wipe it, the test-otp DB-fallback (app/api/auth/test-otp/route.ts)
  // may return a stale OTP from a previous run, which the sign-in flow
  // will then reject with HTTP 400.
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query('TRUNCATE TABLE "verification"');
    console.log("[integration global-setup] truncated verification table");
  } finally {
    await client.end();
  }
}

export async function setup(): Promise<void> {
  sh("pnpm exec prisma migrate deploy");
  sh("pnpm exec prisma db seed");
  await truncateOtpRows();
}

export async function teardown(): Promise<void> {}
