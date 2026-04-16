import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/actions/get-user";
import { prismadb } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const series = await prismadb.invoice_Series.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.prefixTemplate !== undefined && { prefixTemplate: body.prefixTemplate }),
      ...(body.resetPolicy !== undefined && { resetPolicy: body.resetPolicy }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });

  return NextResponse.json({ data: series });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prismadb.invoice_Series.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
