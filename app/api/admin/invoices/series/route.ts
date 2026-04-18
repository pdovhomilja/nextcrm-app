import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/actions/get-user";
import { prismadb } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getUser();
    if (!user.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const series = await prismadb.invoice_Series.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: series });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, prefixTemplate, resetPolicy, isDefault, active } = body;

  if (!name || !prefixTemplate) {
    return NextResponse.json(
      { error: "name and prefixTemplate are required" },
      { status: 400 }
    );
  }

  const series = await prismadb.invoice_Series.create({
    data: {
      name,
      prefixTemplate,
      resetPolicy: resetPolicy ?? "YEARLY",
      isDefault: isDefault ?? false,
      active: active ?? true,
    },
  });

  return NextResponse.json({ data: series }, { status: 201 });
}
