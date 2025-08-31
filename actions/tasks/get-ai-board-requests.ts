"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { getCurrentCompanyId } from "@/lib/auth-utils";

export async function getAiBoardRequests() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const companyId = await getCurrentCompanyId();

    const requests = await db.aIGeneratedBoardRequest.findMany({
      where: {
        userId: session.user.id,
        companyId,
      },
      include: {
        generatedBoard: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, requests };
  } catch (error) {
    console.error("Error fetching AI board requests:", error);
    return { error: "Failed to fetch AI board requests" };
  }
}
