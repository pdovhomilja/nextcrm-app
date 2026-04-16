import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/actions/get-user";
import { prismadb } from "@/lib/prisma";

export async function GET() {
  const user = await getUser();
  if (!user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currencies = await prismadb.invoice_Currencies.findMany({
    orderBy: { code: "asc" },
  });

  return NextResponse.json({ data: currencies });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { code, name, symbol, active } = body;

  if (!code || !name) {
    return NextResponse.json({ error: "code and name are required" }, { status: 400 });
  }

  if (code.length !== 3) {
    return NextResponse.json({ error: "code must be a 3-letter currency code" }, { status: 400 });
  }

  const currency = await prismadb.invoice_Currencies.create({
    data: {
      code: code.toUpperCase(),
      name,
      symbol: symbol ?? null,
      active: active ?? true,
    },
  });

  return NextResponse.json({ data: currency }, { status: 201 });
}
