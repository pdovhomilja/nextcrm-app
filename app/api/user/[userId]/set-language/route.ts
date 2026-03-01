import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { requireOwnerOrAdmin } from "@/lib/auth-guards";

export async function PUT(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const { language } = await req.json();

  const guard = await requireOwnerOrAdmin(params.userId);
  if (guard instanceof NextResponse) return guard;

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
