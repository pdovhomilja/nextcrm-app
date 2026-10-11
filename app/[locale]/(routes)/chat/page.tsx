import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth-server";
import { getTeamDirectory } from "@/actions/team/get-team-directory";
import { dmRoomKey, GENERAL_CHAT_ROOM, parseRoomKey } from "@/lib/chat/room-keys";
import { teamRoomName } from "@/lib/jitsi/meet-url";
import { ChatWorkspace } from "./components/ChatWorkspace";
import { Button } from "@/components/ui/button";

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
      ? "Team · General"
      : team.find((m) => roomKey.includes(m.id))?.name ?? "Direct message";

  const meetRoom =
    roomKey === GENERAL_CHAT_ROOM
      ? teamRoomName("general")
      : teamRoomName("dm", roomKey.replace(/[^a-zA-Z0-9]/g, "-"));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team chat & calls</h1>
        <p className="text-sm text-muted-foreground">
          Free text chat (your Postgres) · voice, video, and screen share via Jitsi Meet (no extra cost).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant={roomKey === GENERAL_CHAT_ROOM ? "default" : "outline"} size="sm">
          <Link href="/chat">General</Link>
        </Button>
        {team
          .filter((m) => m.id !== userId)
          .slice(0, 12)
          .map((m) => (
            <Button
              key={m.id}
              asChild
              variant={roomKey === dmRoomKey(userId, m.id) ? "default" : "outline"}
              size="sm"
            >
              <Link href={`/chat?userId=${m.id}`}>{m.name}</Link>
            </Button>
          ))}
      </div>

      <ChatWorkspace
        roomKey={roomKey}
        roomTitle={roomTitle}
        displayName={displayName}
        meetRoom={meetRoom}
        initialCallOpen={params.call === "1"}
      />
    </div>
  );
}
