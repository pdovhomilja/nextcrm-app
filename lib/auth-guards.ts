import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireOwnerOrAdmin(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.id !== userId && !session.user.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return { session };
}
