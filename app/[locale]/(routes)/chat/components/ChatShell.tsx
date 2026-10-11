"use client";

import * as React from "react";
import Link from "next/link";
import { Hash, Search, Users } from "lucide-react";
import type { TeamMember } from "@/actions/team/get-team-directory";
import { dmRoomKey, GENERAL_CHAT_ROOM } from "@/lib/chat/room-keys";
import { avatarGradientClass, initials } from "@/lib/chat/avatar-style";
import { ChatWorkspace } from "./ChatWorkspace";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = {
  team: TeamMember[];
  currentUserId: string;
  roomKey: string;
  roomTitle: string;
  displayName: string;
  meetRoom: string;
  initialCallOpen?: boolean;
};

function MemberAvatar({ name, id, size = "md" }: { name: string; id: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm",
        avatarGradientClass(id),
        sz
      )}
    >
      {initials(name)}
    </span>
  );
}

export function ChatShell({
  team,
  currentUserId,
  roomKey,
  roomTitle,
  displayName,
  meetRoom,
  initialCallOpen,
}: Props) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const dms = team.filter((m) => m.id !== currentUserId);
  const filtered = dms.filter(
    (m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  );

  const isGeneral = roomKey === GENERAL_CHAT_ROOM;
  const activeMember = dms.find((m) => roomKey === dmRoomKey(currentUserId, m.id));

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] min-h-[520px] flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary/80">Collaboration</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Messages & meetings</h1>
          <p className="text-sm text-muted-foreground">
            Chat with your team, start a call, or share your screen — all in one place.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] backdrop-blur-sm md:flex-row">
        <div className="flex gap-2 overflow-x-auto border-b border-border/40 p-2 md:hidden">
          <Link
            href="/chat"
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
              isGeneral ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            General
          </Link>
          {dms.slice(0, 8).map((m) => {
            const active = roomKey === dmRoomKey(currentUserId, m.id);
            return (
              <Link
                key={m.id}
                href={`/chat?userId=${m.id}`}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {m.name.split(" ")[0]}
              </Link>
            );
          })}
        </div>

        <aside className="hidden w-[280px] shrink-0 flex-col border-r border-border/50 bg-muted/15 md:flex">
          <div className="border-b border-border/40 px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" />
              Conversations
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people…"
                className="h-9 border-border/50 bg-background/80 pl-8 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 p-2">
              <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Channels
              </p>
              <Link
                href="/chat"
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  isGeneral
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Hash className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">General</span>
                  <span className="block truncate text-xs opacity-70">Whole team</span>
                </span>
              </Link>

              <p className="px-2 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Direct messages
              </p>
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">No matches</p>
              ) : (
                filtered.map((m) => {
                  const active = roomKey === dmRoomKey(currentUserId, m.id);
                  return (
                    <Link
                      key={m.id}
                      href={`/chat?userId=${m.id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <MemberAvatar name={m.name} id={m.id} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{m.name}</span>
                        <span className="block truncate text-xs opacity-70">{m.workEmail || m.email}</span>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-background to-muted/10">
          <ChatWorkspace
            roomKey={roomKey}
            roomTitle={roomTitle}
            displayName={displayName}
            meetRoom={meetRoom}
            currentUserId={currentUserId}
            initialCallOpen={initialCallOpen}
            peerName={activeMember?.name}
            isGeneral={isGeneral}
          />
        </main>
      </div>
    </div>
  );
}
