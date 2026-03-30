/**
 * Test-only endpoint: ensures at least N campaigns exist in the DB.
 * Only available in non-production environments.
 * POST /api/test/seed-campaigns  { count: number }
 */
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { count = 2 } = await request.json().catch(() => ({ count: 2 }));

  const existing = await prismadb.crm_campaigns.count({
    where: { status: { not: "deleted" } },
  });

  const toCreate = Math.max(0, count - existing);
  const created: string[] = [];

  for (let i = 0; i < toCreate; i++) {
    const campaign = await prismadb.crm_campaigns.create({
      data: {
        v: 0,
        name: `Seeded Campaign ${existing + i + 1}`,
        description: "Created by E2E test seed",
        status: "draft",
      },
    });
    created.push(campaign.id);
  }

  return NextResponse.json({ existing, created: created.length, ids: created });
}
