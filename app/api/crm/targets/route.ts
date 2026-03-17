import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targets = await prismadb.crm_Targets.findMany({
    orderBy: { created_on: "desc" },
    include: { target_lists: { include: { target_list: { select: { id: true, name: true } } } } },
  });
  return NextResponse.json(targets);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { last_name, email, mobile_phone, ...rest } = body;

  if (!last_name) return NextResponse.json({ error: "last_name is required" }, { status: 400 });
  if (!email && !mobile_phone) return NextResponse.json({ error: "email or mobile_phone is required" }, { status: 400 });

  const target = await prismadb.crm_Targets.create({
    data: { last_name, email, mobile_phone, ...rest, created_by: (session.user as any).id },
  });
  return NextResponse.json(target);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const target = await prismadb.crm_Targets.update({
    where: { id },
    data: { ...data, updatedBy: (session.user as any).id },
  });
  return NextResponse.json(target);
}
