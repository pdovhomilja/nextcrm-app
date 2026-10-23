"use server";

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import {
  createEmailDesign,
  exportDesign,
  fetchExportedHtml,
  listCanvaDesigns,
  type CanvaDesignSummary,
} from "@/lib/canva/designs";
import { persistAttachmentBuffer } from "@/lib/email/persist-attachment";

async function userId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id as string;
}

export async function getCanvaConnectionState() {
  const id = await userId();
  const row = await prismadb.canvaConnection.findUnique({
    where: { userId: id },
    select: { displayName: true, canvaUserId: true, scope: true, updatedAt: true },
  });
  return {
    connected: Boolean(row),
    displayName: row?.displayName ?? null,
    canvaUserId: row?.canvaUserId ?? null,
  };
}

export async function disconnectCanva() {
  const id = await userId();
  await prismadb.canvaConnection.deleteMany({ where: { userId: id } });
}

export async function startCanvaDesign(title: string): Promise<CanvaDesignSummary> {
  return createEmailDesign(await userId(), title.trim() || "CRM email design");
}

export async function recentCanvaDesigns(): Promise<CanvaDesignSummary[]> {
  return listCanvaDesigns(await userId());
}

export async function importCanvaDesign(designId: string, mode: "image" | "html") {
  const id = designId.trim();
  if (!id) throw new Error("Design id is required");
  const urls = await exportDesign(await userId(), id, mode === "html" ? "html_standalone" : "png");
  const url = urls[0];
  if (!url) throw new Error("Canva did not return an export file");
  if (mode === "html") {
    const html = await fetchExportedHtml(url);
    return { html, imageUrl: null as string | null };
  }

  let imageUrl = url;
  try {
    const file = await fetch(url);
    if (file.ok) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await persistAttachmentBuffer(`canva-${id}.png`, "image/png", buffer);
      imageUrl = stored.url;
    }
  } catch {
    // Canva's download URL still works for about 24 hours if storage is unavailable.
  }
  const html = `<p><img src="${imageUrl}" alt="Canva design" style="max-width:100%;height:auto;display:block;" /></p>`;
  return { html, imageUrl };
}
