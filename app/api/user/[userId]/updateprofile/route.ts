import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { requireOwnerOrAdmin } from "@/lib/auth-guards";

export async function PUT(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const { name, username, account_name } = await req.json();

  const guard = await requireOwnerOrAdmin(params.userId);
  if (guard instanceof NextResponse) return guard;

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
