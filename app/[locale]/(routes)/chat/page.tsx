import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { getTeamDirectory } from "@/actions/team/get-team-directory";
import { dmRoomKey, GENERAL_CHAT_ROOM, parseRoomKey } from "@/lib/chat/room-keys";
import { dmMeetRoomSuffix, teamRoomName } from "@/lib/jitsi/meet-url";
import { ChatShell } from "./components/ChatShell";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; userId?: string; call?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/sign-in");

  const params = await searchParams;
  const userId = session.user.id as string;
  let roomKey = parseRoomKey(params.room);

  if (params.userId) {
    roomKey = dmRoomKey(userId, params.userId);
  }

  const team = await getTeamDirectory();
  const displayName = session.user.name?.trim() || session.user.email || "User";

  const roomTitle =
    roomKey === GENERAL_CHAT_ROOM
      ? "General"
      : roomKey.startsWith("conf:")
        ? "Conference"
        : (team.find((m) => roomKey.includes(m.id))?.name ?? "Direct message");

  const meetRoom =
    roomKey === GENERAL_CHAT_ROOM
      ? teamRoomName("general")
      : teamRoomName("dm", dmMeetRoomSuffix(roomKey));

  return (
    <ChatShell
      team={team}
      currentUserId={userId}
      roomKey={roomKey}
      roomTitle={roomTitle}
      displayName={displayName}
      meetRoom={meetRoom}
      initialCallOpen={params.call === "1"}
    />
  );
}
