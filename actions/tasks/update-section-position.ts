"use server";

import db from "@/lib/db";
import type { SectionPosition } from "@/app/(app)/[cid]/tasks/_types";

export async function updateSectionPosition(
  sectionId: string,
  newPosition: number,
) {
  try {
    await db.boardSection.update({
      where: {
        id: sectionId,
      },
      data: {
        position: newPosition,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to update section position: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function updateSectionPositions(updates: SectionPosition[]) {
  if (updates.length === 0) return;

  try {
    await db.$transaction(
      updates.map((update) =>
        db.boardSection.update({
          where: { id: update.id },
          data: { position: update.position },
        }),
      ),
    );
  } catch (error) {
    throw new Error(
      `Failed to update section positions: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
