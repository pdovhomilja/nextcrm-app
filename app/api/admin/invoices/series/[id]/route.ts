import { NextRequest, NextResponse } from "next/server";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

async function ensureAdmin(): Promise<NextResponse | null> {
  try {
    await requireRole(["admin"]);
    return null;
  } catch (e) {
    if (e instanceof AuthorizationError)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (e instanceof AuthenticationError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const denied = await ensureAdmin();
  if (denied) return denied;

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
  const denied = await ensureAdmin();
  if (denied) return denied;

  await prismadb.invoice_Series.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
