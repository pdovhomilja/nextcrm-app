"use server";

import { revalidatePath } from "next/cache";

import {
  assertCanWriteBoard,
  AuthenticationError,
  AuthorizationError,
  requireAuthenticated,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import {
  sectionsForTemplate,
  type BoardTemplateId,
} from "@/lib/projects/board-templates";

export async function applyBoardTemplate(
  boardId: string,
  template: BoardTemplateId = "scrum"
) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  if (!boardId) return { error: "Missing board ID" };

  try {
    await assertCanWriteBoard(user, boardId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    const existing = await prismadb.sections.findMany({
      where: { board: boardId },
      orderBy: { position: "asc" },
      select: { title: true, position: true },
    });

    const existingTitles = new Set(existing.map((s) => s.title.trim().toLowerCase()));
    const templateSections = sectionsForTemplate(template);
    const toAdd = templateSections.filter(
      (title) => !existingTitles.has(title.toLowerCase())
    );

    if (toAdd.length === 0) {
      return { data: { added: 0, sectionTitles: [] as string[] } };
    }

    let position =
      existing.length > 0
        ? Math.max(...existing.map((s) => Number(s.position ?? 0))) + 1
        : 0;

    for (const title of toAdd) {
      await prismadb.sections.create({
        data: {
          v: 0,
          board: boardId,
          title,
          position: position++,
        },
      });
    }

    revalidatePath("/[locale]/(routes)/projects", "page");
    revalidatePath(`/[locale]/(routes)/projects/boards/${boardId}`, "page");

    return { data: { added: toAdd.length, sectionTitles: toAdd } };
  } catch (error) {
    console.error("[APPLY_BOARD_TEMPLATE]", error);
    return { error: "Failed to apply board template" };
  }
}
