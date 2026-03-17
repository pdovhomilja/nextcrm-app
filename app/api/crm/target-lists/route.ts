import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lists = await prismadb.crm_TargetLists.findMany({
    orderBy: { created_on: "desc" },
    include: { _count: { select: { targets: true } } },
  });
  return NextResponse.json(lists);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, targetIds = [] } = body;
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const list = await prismadb.crm_TargetLists.create({
    data: {
      name,
      description,
      created_by: (session.user as any).id,
      targets: {
        create: targetIds.map((id: string) => ({ target_id: id })),
      },
    },
    include: { targets: true },
  });
  return NextResponse.json(list);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name, description, status } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const list = await prismadb.crm_TargetLists.update({
    where: { id },
    data: { name, description, status },
  });
  return NextResponse.json(list);
}
