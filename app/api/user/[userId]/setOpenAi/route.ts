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

  const { organizationId, secretKey } = await req.json();

  if (!organizationId || !secretKey) {
    return new NextResponse("No data from form (organizationId, secretKey)", {
      status: 401,
    });
  }
  try {
    const checkIfExist = await prismadb.openAi_keys.findFirst({
      where: {
        user: userId,
      },
    });
    //console.log(checkIfExist, "Check if exist");
    //console.log(checkIfExist !== null, "Check if exist result");
    if (checkIfExist !== null) {
      try {
        const updateNotion = await prismadb.openAi_keys.update({
          where: {
            id: checkIfExist.id,
          },
          data: {
            api_key: secretKey,
            organization_id: organizationId,
          },
        });
        return NextResponse.json(updateNotion, {
          status: 200,
        });
      } catch (error) {
        console.log(error);
      }
    } else {
      const setOpenAiKey = await prismadb.openAi_keys.create({
        data: {
          v: 0,
          api_key: secretKey,
          organization_id: organizationId,
          user: userId,
        },
      });

      return NextResponse.json(setOpenAiKey, {
        status: 200,
      });
    }
  } catch (error) {
    console.log("[USER_UPDATE_OPENAIKEY]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
