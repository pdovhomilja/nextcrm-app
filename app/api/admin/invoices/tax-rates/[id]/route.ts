import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/actions/get-user";
import { prismadb } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUser();
    if (!user.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const taxRate = await prismadb.invoice_TaxRates.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.rate !== undefined && { rate: body.rate }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });

  return NextResponse.json({ data: taxRate });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getUser();
    if (!user.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prismadb.invoice_TaxRates.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
