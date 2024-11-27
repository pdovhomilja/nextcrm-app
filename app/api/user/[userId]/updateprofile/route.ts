import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function PUT(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const { name, username, account_name } = await req.json();

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.userId) {
    return new NextResponse("No user ID provided", { status: 400 });
  }

  try {
    const newUserPass = await prismadb.users.update({
      data: {
        name: name,
        username: username,
        account_name: account_name,
      },
      where: {
        id: params.userId,
      },
    });

    return NextResponse.json(newUserPass);
  } catch (error) {
    console.log("[UPDATE_USER_PROFILE_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
