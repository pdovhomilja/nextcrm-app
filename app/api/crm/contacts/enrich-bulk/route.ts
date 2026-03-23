import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inngest } from "@/inngest/client";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactIds, fields } = await request.json();

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json({ error: "contactIds must be a non-empty array" }, { status: 400 });
  }
  if (contactIds.length > 100) {
    return NextResponse.json({ error: "Maximum 100 contacts per batch" }, { status: 400 });
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: "fields must be a non-empty array" }, { status: 400 });
  }

  await inngest.send({
    name: "enrich/contacts.bulk",
    data: { contactIds, fields, triggeredBy: session.user.id },
  });

  return NextResponse.json({ success: true, count: contactIds.length });
}
