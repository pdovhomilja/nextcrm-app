import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, props: { params: Promise<{ sectionId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  const { sectionId } = params;
  if (!sectionId) {
    return new NextResponse("Missing sectionId", { status: 400 });
  }

  try {
    const tasks = await prismadb.tasks.deleteMany({
      where: {
        section: sectionId,
      },
    });
    console.log("All section tasks deleted", tasks);
    await prismadb.sections.delete({
      where: {
        id: sectionId,
      },
    });
    console.log("Delete section:", sectionId);
    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[DELETE_SECTION]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
