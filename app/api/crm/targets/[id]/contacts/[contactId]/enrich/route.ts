import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { inngest } from "@/inngest/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { contactId } = await params;

  await inngest.send({
    name: "enrich/target.contact.run",
    data: { contactId, triggeredBy: session.user.id },
  });

  return NextResponse.json({ queued: true });
}
