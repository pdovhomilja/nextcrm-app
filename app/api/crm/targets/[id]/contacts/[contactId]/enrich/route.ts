import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inngest } from "@/inngest/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { contactId } = await params;

  await inngest.send({
    name: "enrich/target.contact.run",
    data: { contactId, triggeredBy: session.user.id },
  });

  return NextResponse.json({ queued: true });
}
