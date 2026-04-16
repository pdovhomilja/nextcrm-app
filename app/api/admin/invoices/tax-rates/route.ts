import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/actions/get-user";
import { prismadb } from "@/lib/prisma";

export async function GET() {
  const user = await getUser();
  if (!user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const taxRates = await prismadb.invoice_TaxRates.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: taxRates });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, rate, isDefault, active } = body;

  if (!name || rate == null) {
    return NextResponse.json({ error: "name and rate are required" }, { status: 400 });
  }

  const taxRate = await prismadb.invoice_TaxRates.create({
    data: {
      name,
      rate,
      isDefault: isDefault ?? false,
      active: active ?? true,
    },
  });

  return NextResponse.json({ data: taxRate }, { status: 201 });
}
