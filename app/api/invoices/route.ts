import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { buildSearchWhere, type SearchFilters } from "@/lib/invoices/search";
import type { InvoiceStatus } from "@/lib/invoices/permissions";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "25")));
  const skip = (page - 1) * limit;

  const filters: SearchFilters = {};
  const status = url.searchParams.get("status");
  if (status) filters.status = status.split(",") as InvoiceStatus[];
  const accountId = url.searchParams.get("accountId");
  if (accountId) filters.accountId = accountId;
  const currency = url.searchParams.get("currency");
  if (currency) filters.currency = currency;
  const issueFrom = url.searchParams.get("issueFrom");
  if (issueFrom) filters.issueFrom = new Date(issueFrom);
  const issueTo = url.searchParams.get("issueTo");
  if (issueTo) filters.issueTo = new Date(issueTo);

  const where = buildSearchWhere(filters);

  const [invoices, total] = await Promise.all([
    prismadb.invoices.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        account: { select: { id: true, name: true } },
        series: { select: { id: true, name: true } },
      },
    }),
    prismadb.invoices.count({ where }),
  ]);

  return NextResponse.json({ data: invoices, total, page, limit });
}