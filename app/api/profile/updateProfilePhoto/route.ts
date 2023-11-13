import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized" },
      {
        status: 401,
      }
    );
  }

  const body = await req.json();

  if (!body.avatar) {
    return NextResponse.json(
      { message: "No avatar provided" },
      {
        status: 400,
      }
    );
  }

  try {
    await prismadb.users.update({
      where: {
        id: session.user.id,
      },
      data: {
        avatar: body.avatar,
      },
    });
    console.log("Profile photo updated");
    return NextResponse.json(
      { message: "Profile photo updated" },
      { status: 200 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error updating profile photo" },
      {
        status: 500,
      }
    );
  }
}
