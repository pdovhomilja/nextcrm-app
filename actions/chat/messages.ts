"use server";

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { dmRoomKey, GENERAL_CHAT_ROOM, parseRoomKey } from "@/lib/chat/room-keys";
import { stripHtmlToPlain } from "@/lib/email/compose-helpers";

async function requireUserId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id as string;
}

async function assertRoomAccess(roomKey: string, userId: string) {
  if (roomKey.startsWith("dm:")) {
    const parts = roomKey.split(":");
    if (parts.length !== 3 || ![parts[1], parts[2]].includes(userId)) {
      throw new Error("Forbidden");
    }
    return;
  }
  if (roomKey.startsWith("conf:")) {
    const id = roomKey.slice(5);
    const entry = await prismadb.teamScheduleEntry.findUnique({
      where: { id },
      select: { organizerId: true, attendeeIds: true },
    });
    if (!entry) throw new Error("Forbidden");
    const attendees = Array.isArray(entry.attendeeIds)
      ? entry.attendeeIds.filter((x): x is string => typeof x === "string")
      : [];
    if (entry.organizerId !== userId && !attendees.includes(userId)) {
      throw new Error("Forbidden");
    }
  }
}

export type ChatAttachmentDTO = {
  url: string;
  name: string;
  mime: string;
} | null;

export type ChatMessageDTO = {
  id: string;
  roomKey: string;
  body: string;
  htmlBody: string | null;
  attachment: ChatAttachmentDTO;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

export async function getChatMessages(roomKeyRaw: string, afterIso?: string) {
  const userId = await requireUserId();
  const roomKey = parseRoomKey(roomKeyRaw);
  await assertRoomAccess(roomKey, userId);

  const afterDate = afterIso ? new Date(afterIso) : null;
  const validAfter = afterDate && !Number.isNaN(afterDate.getTime()) ? afterDate : null;

  if (validAfter) {
    const rows = await prismadb.teamChatMessage.findMany({
      where: { roomKey, createdAt: { gt: validAfter } },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return mapRows(rows);
  }

  const rows = await prismadb.teamChatMessage.findMany({
    where: { roomKey },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return mapRows(rows.reverse());
}

function mapRows(
  rows: {
    id: string;
    roomKey: string;
    body: string;
    htmlBody: string | null;
    attachmentUrl: string | null;
    attachmentName: string | null;
    attachmentMime: string | null;
    createdAt: Date;
    user: { id: string; name: string | null; email: string };
  }[]
): ChatMessageDTO[] {
  return rows.map((r) => ({
    id: r.id,
    roomKey: r.roomKey,
    body: r.body,
    htmlBody: r.htmlBody,
    attachment:
      r.attachmentUrl && r.attachmentName
        ? {
            url: r.attachmentUrl,
            name: r.attachmentName,
            mime: r.attachmentMime ?? "application/octet-stream",
          }
        : null,
    createdAt: r.createdAt.toISOString(),
    user: {
      id: r.user.id,
      name: r.user.name?.trim() || r.user.email,
      email: r.user.email,
    },
  }));
}

export async function sendChatMessage(
  roomKeyRaw: string,
  htmlBody: string,
  attachment?: ChatAttachmentDTO
) {
  const userId = await requireUserId();
  const roomKey = parseRoomKey(roomKeyRaw);
  await assertRoomAccess(roomKey, userId);

  const html = htmlBody.trim();
  const hasText = html && html !== "<p></p>";
  const hasFile = Boolean(attachment?.url);

  if (!hasText && !hasFile) throw new Error("Message is empty");

  const body = hasText ? stripHtmlToPlain(html) : attachment?.name ?? "Attachment";

  const msg = await prismadb.teamChatMessage.create({
    data: {
      roomKey,
      userId,
      body,
      htmlBody: hasText ? html : null,
      attachmentUrl: attachment?.url ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentMime: attachment?.mime ?? null,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return {
    id: msg.id,
    roomKey: msg.roomKey,
    body: msg.body,
    htmlBody: msg.htmlBody,
    attachment:
      msg.attachmentUrl && msg.attachmentName
        ? {
            url: msg.attachmentUrl,
            name: msg.attachmentName,
            mime: msg.attachmentMime ?? "application/octet-stream",
          }
        : null,
    createdAt: msg.createdAt.toISOString(),
    user: {
      id: msg.user.id,
      name: msg.user.name?.trim() || msg.user.email,
      email: msg.user.email,
    },
  } satisfies ChatMessageDTO;
}

export async function getDmRoomKey(otherUserId: string) {
  const userId = await requireUserId();
  if (otherUserId === userId) throw new Error("Invalid user");
  return dmRoomKey(userId, otherUserId);
}

export { GENERAL_CHAT_ROOM };
