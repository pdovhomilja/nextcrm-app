import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  props: { params: Promise<{ targetListId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetListId } = await props.params;
  const { targetIds } = await req.json();
  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    return NextResponse.json({ error: "targetIds must be a non-empty array" }, { status: 400 });
  }

  const result = await prismadb.targetsToTargetLists.createMany({
    data: targetIds.map((id: string) => ({
      target_id: id,
      target_list_id: targetListId,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ added: result.count });
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ targetListId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetListId } = await props.params;
  const { targetId } = await req.json();
  if (!targetId) {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  await prismadb.targetsToTargetLists.delete({
    where: {
      target_id_target_list_id: {
        target_id: targetId,
        target_list_id: targetListId,
      },
    },
  });

  return NextResponse.json({ success: true });
}
