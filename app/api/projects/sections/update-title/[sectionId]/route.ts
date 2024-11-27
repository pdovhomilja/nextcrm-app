import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, props: { params: Promise<{ sectionId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  const body = await req.json();
  const { sectionId } = params;
  const { newTitle } = body;

  try {
    await prismadb.sections.update({
      where: {
        id: sectionId,
      },
      data: {
        title: newTitle,
      },
    });

    return NextResponse.json(
      { message: "Section Title change successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log("[NEW_SECTION_TITLE_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
