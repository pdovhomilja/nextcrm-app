import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { utapi } from "@/lib/server/uploadthings";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/middleware/with-rate-limit";

async function handleDELETE(req: NextRequest, props: { params: Promise<{ documentId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  try {
    if (!params.documentId)
      return new NextResponse("Document ID not found", { status: 404 });

    const document = await prismadb.documents.findMany({
      where: {
        id: params.documentId,
        organizationId: session.user.organizationId,
      },
    });

    if (!document) {
      return new NextResponse("Document in DB not found", { status: 404 });
    }

    //console.log(document[0].key, "document to delete");

    const deletedDocument = await prismadb.documents.delete({
      where: {
        id: params.documentId,
      },
    });

    console.log("Document deleted:", deletedDocument);

    if (!document[0].key)
      return new NextResponse("Document key not found", { status: 404 });

    const utapiFile = await utapi.deleteFiles([document[0].key]);
    console.log(utapiFile, "utapiFile");

    return NextResponse.json("deletedDocument");
  } catch (error) {
    console.log("[Document_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const DELETE = withRateLimit(handleDELETE);
