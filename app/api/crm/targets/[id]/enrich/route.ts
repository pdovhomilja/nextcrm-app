import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inngest } from "@/inngest/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id: targetId } = await params;
  const body = await request.json().catch(() => ({})) as { force?: boolean };

  await inngest.send({
    name: "enrich/target.run",
    data: { targetId, triggeredBy: session.user.id, force: body.force ?? false },
  });

  return NextResponse.json({ queued: true });
}
