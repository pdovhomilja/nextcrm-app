"use server";

import db from "@/lib/db";
import { auth } from "@/auth";

export async function getBoards(userId: string, query?: string) {
  const session = await auth();

  // Get user's active company ID for multi-tenant isolation
  const companyId = session?.user?.activeCompanyId;

  if (!companyId) {
    throw new Error("No active company found");
  }

  const boards = await db.board.findMany({
    where: {
      AND: [
        {
          access: {
            has: userId,
          },
        },
        {
          // Multi-tenant isolation: only show boards from user's company
          companyId: companyId,
        },
        ...(query
          ? [
              {
                OR: [
                  { name: { contains: query, mode: "insensitive" as const } },
                  {
                    description: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  return boards;
}
