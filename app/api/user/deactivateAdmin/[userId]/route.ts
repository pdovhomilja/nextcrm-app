import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const user = await prismadb.users.update({
      where: {
        id: params.userId,
      },
      data: {
        is_admin: false,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.log("[USER_ADMIN_DEACTIVATE_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
