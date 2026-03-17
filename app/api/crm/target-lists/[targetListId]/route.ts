import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ targetListId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetListId } = await params;
  const list = await prismadb.crm_TargetLists.findUnique({
    where: { id: targetListId },
    include: { targets: { include: { target: true } }, crate_by_user: { select: { name: true } } },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(list);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ targetListId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetListId } = await params;
  await prismadb.crm_TargetLists.delete({ where: { id: targetListId } });
  return NextResponse.json({ message: "Target list deleted" });
}
