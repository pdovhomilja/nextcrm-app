import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/actions/get-user";
import { prismadb } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const user = await getUser();
    if (!user.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const currency = await prismadb.invoice_Currencies.update({
    where: { code },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.symbol !== undefined && { symbol: body.symbol }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });

  return NextResponse.json({ data: currency });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const user = await getUser();
    if (!user.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prismadb.invoice_Currencies.delete({ where: { code } });
  return NextResponse.json({ success: true });
}
