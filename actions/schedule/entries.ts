"use server";

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { conferenceRoomKey } from "@/lib/chat/room-keys";
import { teamRoomName } from "@/lib/jitsi/meet-url";
import { emitCalendarOutbound } from "@/lib/crm/calendar/outbound-emit";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export type ScheduleKind = "MEETING" | "LEAVE" | "EVENT" | "CONFERENCE";

export type ScheduleEntryDTO = {
  id: string;
  kind: ScheduleKind;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  organizerId: string;
  organizerName: string;
  attendeeIds: string[];
  meetRoom: string | null;
  chatRoomKey: string | null;
  leaveStatus: string | null;
};

async function requireUser() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

function mapRow(row: {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  organizerId: string;
  attendeeIds: unknown;
  meetRoom: string | null;
  chatRoomKey: string | null;
  leaveStatus: string | null;
  organizer: { name: string | null; email: string };
}): ScheduleEntryDTO {
  return {
    id: row.id,
    kind: row.kind as ScheduleKind,
    title: row.title,
    description: row.description,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    organizerId: row.organizerId,
    organizerName: row.organizer.name?.trim() || row.organizer.email,
    attendeeIds: Array.isArray(row.attendeeIds)
      ? row.attendeeIds.filter((x): x is string => typeof x === "string")
      : [],
    meetRoom: row.meetRoom,
    chatRoomKey: row.chatRoomKey,
    leaveStatus: row.leaveStatus,
  };
}

export async function listScheduleEntries(fromIso?: string, toIso?: string) {
  await requireUser();
  const from = fromIso ? new Date(fromIso) : new Date(Date.now() - 7 * 86400000);
  const to = toIso ? new Date(toIso) : new Date(Date.now() + 60 * 86400000);

  const rows = await prismadb.teamScheduleEntry.findMany({
    where: { startAt: { lte: to }, endAt: { gte: from } },
    orderBy: { startAt: "asc" },
    take: 200,
    include: {
      organizer: { select: { name: true, email: true } },
    },
  });
  return rows.map(mapRow);
}

export async function createScheduleEntry(input: {
  kind: ScheduleKind;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  attendeeIds?: string[];
}) {
  const user = await requireUser();
  const userId = user.id as string;
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new Error("Invalid date range");
  }

  const attendeeIds = Array.from(new Set(input.attendeeIds ?? [])).filter((id) => id !== userId);
  let meetRoom: string | null = null;
  let chatRoomKey: string | null = null;
  let activityId: string | null = null;
  let leaveStatus: string | null = null;

  const scheduleId = randomUUID();

  if (input.kind === "CONFERENCE" || input.kind === "MEETING") {
    meetRoom = teamRoomName("dm", scheduleId.replace(/-/g, "").slice(0, 16));
    chatRoomKey = conferenceRoomKey(scheduleId);
  }

  if (input.kind === "LEAVE") {
    leaveStatus = "PENDING";
  }

  if (input.kind === "MEETING" || input.kind === "CONFERENCE" || input.kind === "EVENT") {
    const durationMin = Math.max(15, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
    const activity = await prismadb.crm_Activities.create({
      data: {
        type: input.kind === "EVENT" ? "note" : "meeting",
        title: input.title,
        description: input.description,
        date: startAt,
        duration: durationMin,
        status: "scheduled",
        metadata: {
          scheduleKind: input.kind,
          meetRoom,
          chatRoomKey,
          attendeeIds,
        },
        createdBy: userId,
      },
    });
    activityId = activity.id;
    if (input.kind === "MEETING" || input.kind === "CONFERENCE") {
      await emitCalendarOutbound(activity.id, "upsert");
    }
  }

  const entry = await prismadb.teamScheduleEntry.create({
    data: {
      id: scheduleId,
      kind: input.kind,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      startAt,
      endAt,
      organizerId: userId,
      attendeeIds,
      meetRoom,
      chatRoomKey,
      activityId,
      leaveStatus,
    },
    include: { organizer: { select: { name: true, email: true } } },
  });

  if (chatRoomKey && input.description?.trim()) {
    await prismadb.teamChatMessage.create({
      data: {
        roomKey: chatRoomKey,
        userId,
        body: input.description.trim(),
        htmlBody: `<p>${input.description.trim()}</p>`,
      },
    });
  }

  revalidatePath("/schedule");
  return mapRow(entry);
}

export async function approveLeave(entryId: string, approve: boolean) {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "manager") {
    throw new Error("Forbidden");
  }
  const entry = await prismadb.teamScheduleEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.kind !== "LEAVE") throw new Error("Not found");
  await prismadb.teamScheduleEntry.update({
    where: { id: entryId },
    data: { leaveStatus: approve ? "APPROVED" : "REJECTED" },
  });
  revalidatePath("/schedule");
}
