import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getEmail } from "@/actions/emails/messages";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ emailId: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { emailId } = await ctx.params;
  const email = await getEmail(emailId);
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(email, {
    headers: {
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
