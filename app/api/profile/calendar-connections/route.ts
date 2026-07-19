import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const connections = await prismadb.calendarConnection.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      accountEmail: true,
      isActive: true,
      lastSyncedAt: true,
      lastSyncError: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ connections });
}
