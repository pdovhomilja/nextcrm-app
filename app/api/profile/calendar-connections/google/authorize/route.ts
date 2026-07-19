import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getGoogleAuthUrl } from "@/lib/crm/calendar/google";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(getGoogleAuthUrl());
}
