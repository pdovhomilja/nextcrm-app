import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function PUT(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const { password, cpassword } = await req.json();

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.userId) {
    return new NextResponse("No user ID provided", { status: 400 });
  }

  if (!password || !cpassword) {
    return new NextResponse("No password provided", { status: 400 });
  }

  if (password !== cpassword) {
    return new NextResponse("Passwords do not match", { status: 400 });
  }

  if (session.user.email === "demo@nextcrm.io") {
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
    });

    return NextResponse.json(newUserPass);
  } catch (error) {
    console.log("[NEW_USERPASS_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
