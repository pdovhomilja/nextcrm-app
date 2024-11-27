import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { set } from "zod";

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  const userId = params.userId;

  if (!userId) {
    return new NextResponse("No userID, userId is required", { status: 401 });
  }

  const { databaseId, secretKey } = await req.json();

  if (!databaseId || !secretKey) {
    return new NextResponse("No data from form (databaseId, secretKey)", {
      status: 401,
    });
  }
  try {
    const checkIfExist = await prismadb.secondBrain_notions.findFirst({
      where: {
        user: userId,
      },
    });
    //console.log(checkIfExist, "Check if exist");
    //console.log(checkIfExist !== null, "Check if exist result");
    if (checkIfExist !== null) {
      try {
        const updateNotion = await prismadb.secondBrain_notions.update({
          where: {
            id: checkIfExist.id,
          },
          data: {
            notion_api_key: secretKey,
            notion_db_id: databaseId,
          },
        });
        return NextResponse.json(updateNotion, {
          status: 200,
        });
      } catch (error) {
        console.log(error);
      }
    } else {
      const setNotion = await prismadb.secondBrain_notions.create({
        data: {
          v: 0,
          notion_api_key: secretKey,
          notion_db_id: databaseId,
          user: userId,
        },
      });

      return NextResponse.json(setNotion, {
        status: 200,
      });
    }
  } catch (error) {
    console.log("[USER_UPDATE_NOTION]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
