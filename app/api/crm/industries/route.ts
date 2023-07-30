import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const data = await prismadb.crm_Industry_Type.findMany({});

    return NextResponse.json(data);
  } catch (error) {
    console.log("[USERS_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
