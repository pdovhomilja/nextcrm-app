"use server";

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { dmRoomKey, GENERAL_CHAT_ROOM, parseAttendeeIds } from "@/lib/chat/room-keys";

function accessibleRoomKeys(userId: string, peerIds: string[]): string[] {
  const keys = [GENERAL_CHAT_ROOM];
  for (const peer of peerIds) {
    if (peer !== userId) keys.push(dmRoomKey(userId, peer));
  }
  return keys;
}

export async function markChatRoomRead(roomKey: string) {
  const session = await getSession();
  if (!session?.user?.id) return;
  const userId = session.user.id as string;

  await prismadb.teamChatRead.upsert({
    where: { userId_roomKey: { userId, roomKey } },
    create: { userId, roomKey, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

export async function getChatUnreadCount(): Promise<number> {
  const session = await getSession();
  if (!session?.user?.id) return 0;
  const userId = session.user.id as string;

  const peers = await prismadb.users.findMany({
    where: { userStatus: "ACTIVE" },
    select: { id: true },
    take: 100,
  });
  const confEntries = await prismadb.teamScheduleEntry.findMany({
    where: { chatRoomKey: { not: null } },
    select: { chatRoomKey: true, organizerId: true, attendeeIds: true },
    take: 100,
  });
  const confRooms = confEntries
    .filter(
      (e) =>
        e.organizerId === userId || parseAttendeeIds(e.attendeeIds).includes(userId)
    )
    .map((e) => e.chatRoomKey!)
    .filter(Boolean);
  const roomKeys = [
    ...accessibleRoomKeys(
      userId,
      peers.map((p) => p.id)
    ),
    ...confRooms,
  ];

  const reads = await prismadb.teamChatRead.findMany({
    where: { userId, roomKey: { in: roomKeys } },
    select: { roomKey: true, lastReadAt: true },
  });
  const readMap = new Map(reads.map((r) => [r.roomKey, r.lastReadAt]));

  let total = 0;
  for (const roomKey of roomKeys) {
    const since = readMap.get(roomKey) ?? new Date(0);
    const n = await prismadb.teamChatMessage.count({
      where: {
        roomKey,
        userId: { not: userId },
        createdAt: { gt: since },
      },
    });
    total += n;
  }
  return total;
}
