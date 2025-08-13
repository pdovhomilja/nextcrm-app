"use server";

import db from "@/lib/db";
import type { BoardSection, Task } from "@/app/(app)/[cid]/tasks/_types";

export async function getBoardSections(
  boardId: string
): Promise<BoardSection[]> {
  const boardSections = await db.boardSection.findMany({
    where: {
      boardId,
    },
    orderBy: {
      position: "asc",
    },
    include: {
      tasks: {
        orderBy: {
          position: "asc",
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  const sectionsForClient: BoardSection[] = boardSections.map((section) => ({
    id: section.id,
    name: section.name,
    position: section.position,
    tasks: section.tasks.map(
      (t): Task => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: (t.status as unknown as string) ?? "NEW",
        priority: (t.priority as unknown as string) ?? "LOW",
        dueDate: t.dueDate,
        position: t.position,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        assignedTo: {
          id: t.assignedTo?.id ?? "",
          name: t.assignedTo?.name ?? null,
        },
        createdBy: {
          id: t.createdBy?.id ?? "",
          name: t.createdBy?.name ?? null,
        },
        documents: [],
      })
    ),
  }));

  return sectionsForClient;
}
