"use server";

import db from "@/lib/db";
import type { SectionPosition } from "@/app/(app)/[cid]/tasks/_types";
import {
  requireAuth,
  verifySectionAccess,
} from "@/lib/security/company-access-validator";

export async function updateSectionPosition(
  sectionId: string,
  newPosition: number,
) {
  const { userId, activeCompanyId } = await requireAuth();
  await verifySectionAccess(sectionId, userId, activeCompanyId);

  try {
    await db.boardSection.update({
      where: { id: sectionId },
      data: { position: newPosition },
    });
  } catch (error) {
    throw new Error(
      `Failed to update section position: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function updateSectionPositions(updates: SectionPosition[]) {
  if (updates.length === 0) return;

  const { userId, activeCompanyId } = await requireAuth();

  // Verify access to all sections being updated
  await Promise.all(
    updates.map((update) =>
      verifySectionAccess(update.id, userId, activeCompanyId)
    ),
  );

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
