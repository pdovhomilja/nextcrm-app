"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { getCurrentCompanyId } from "@/lib/auth-utils";
import { runBoardGenerationJob } from "@/lib/jobs/board-generation-job";

export async function retryBoardGeneration(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return { error: "Company not found" };
  }

  try {
    // Verify the request belongs to the current user and company
    const request = await db.aIGeneratedBoardRequest.findFirst({
      where: {
        id: requestId,
        userId: session.user.id,
        companyId,
      },
    });

    if (!request) {
      return { error: "Board generation request not found" };
    }

    // Reset the request status to PENDING
    await db.aIGeneratedBoardRequest.update({
      where: { id: requestId },
      data: {
        status: "PENDING",
        failureReason: null, // Clear previous failure reason
      },
    });

    // Trigger the background job again
    runBoardGenerationJob({ boardRequestId: requestId });

    return { success: "Board generation has been restarted!" };
  } catch (error) {
    console.error("Error retrying board generation:", error);
    return { error: "Failed to retry board generation" };
  }
}
