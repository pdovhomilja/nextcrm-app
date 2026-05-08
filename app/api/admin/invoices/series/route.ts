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

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const series = await prismadb.invoice_Series.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: series });
}

export async function POST(request: NextRequest) {
  const denied = await ensureAdmin();
  if (denied) return denied;

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
