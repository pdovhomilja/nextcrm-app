import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ data: [] });
  }

  const limit = Math.min(
    50,
    Number(request.nextUrl.searchParams.get("limit") ?? "20")
  );

  // Use tsvector full-text search with plainto_tsquery for safe input handling
  const results = await prismadb.$queryRaw<
    Array<{
      id: string;
      number: string | null;
      status: string;
      grandTotal: string;
      currency: string;
      accountName: string;
    }>
  >`
    SELECT
      i.id,
      i.number,
      i.status,
      i."grandTotal"::text as "grandTotal",
      i.currency,
      a.name as "accountName"
    FROM "Invoices" i
    JOIN "crm_Accounts" a ON a.id = i."accountId"
    WHERE i.search_vector @@ plainto_tsquery('simple', ${q})
       OR i.number ILIKE ${"%" + q + "%"}
       OR a.name ILIKE ${"%" + q + "%"}
    ORDER BY i."createdAt" DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({ data: results });
}
