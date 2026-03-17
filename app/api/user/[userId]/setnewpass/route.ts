import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { requireOwnerOrAdmin } from "@/lib/auth-guards";

export async function PUT(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const { password, cpassword } = await req.json();

  const guard = await requireOwnerOrAdmin(params.userId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  if (!params.userId) {
    return new NextResponse("No user ID provided", { status: 400 });
  }

  if (!password || !cpassword) {
    return new NextResponse("No password provided", { status: 400 });
  }

  if (password !== cpassword) {
    return new NextResponse("Passwords do not match", { status: 400 });
  }

  if (session.user?.email === "demo@nextcrm.io") {
    return new NextResponse(
      "Hey, don't be a fool! There are so many works done! Thanks!",
      {
        status: 400,
      }
    );
  }

  try {
    const newUserPass = await prismadb.users.update({
      data: {
        password: await hash(password, 10),
      },
      where: {
        id: params.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        account_name: true,
        avatar: true,
        is_admin: true,
        is_account_admin: true,
        userLanguage: true,
        userStatus: true,
        lastLoginAt: true,
      },
    });

    return NextResponse.json(newUserPass);
  } catch (error) {
    console.log("[NEW_USERPASS_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
