import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function PUT(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const { language } = await req.json();

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.userId) {
    return new NextResponse("No user ID provided", { status: 400 });
  }

  if (!language) {
    return new NextResponse("No language provided", { status: 400 });
  }

  try {
    const newUserLanguage = await prismadb.users.update({
      data: {
        userLanguage: language,
      },
      where: {
        id: params.userId,
      },
    });

    return NextResponse.json({ language: language }, { status: 200 });
  } catch (error) {
    console.log("[NEWUSER_LANG_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
