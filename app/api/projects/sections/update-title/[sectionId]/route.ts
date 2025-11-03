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

  if (!session.user?.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  const body = await req.json();
  const { sectionId } = params;
  const { newTitle } = body;

  try {
    // Verify section belongs to the user's organization
    const section = await prismadb.sections.findFirst({
      where: {
        id: sectionId,
        organizationId: session.user.organizationId,
      },
    });

    if (!section) {
      return new NextResponse("Section not found or unauthorized", { status: 404 });
    }

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
