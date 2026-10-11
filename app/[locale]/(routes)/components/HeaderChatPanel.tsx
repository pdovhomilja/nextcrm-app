"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle, Mail, Search, Video, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { TeamMember } from "@/actions/team/get-team-directory";
import { getTeamDirectory } from "@/actions/team/get-team-directory";

export function HeaderChatPanel() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [team, setTeam] = React.useState<TeamMember[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || team.length > 0) return;
    setLoading(true);
    getTeamDirectory()
      .then(setTeam)
      .finally(() => setLoading(false));
  }, [open, team.length]);

  const filtered = team.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.workEmail?.toLowerCase().includes(q) ?? false)
    );
  });

  function emailHref(member: TeamMember) {
    const to = encodeURIComponent(member.workEmail || member.email);
    return `/emails?composeTo=${to}`;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Team chat and calls"
          title="Team chat, video, and email"
        >
          <MessageCircle className="h-[1.15rem] w-[1.15rem]" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Team chat & calls</SheetTitle>
          <SheetDescription>
            Free in-app chat (Postgres) and Jitsi voice, video, and screen share — no paid add-ons.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-3 flex gap-2">
          <Button className="flex-1 gap-1.5" asChild>
            <Link href="/chat" onClick={() => setOpen(false)}>
              <MessagesSquare className="h-4 w-4" />
              Open chat
            </Link>
          </Button>
          <Button variant="outline" className="flex-1 gap-1.5" asChild>
            <Link href="/chat?call=1" onClick={() => setOpen(false)}>
              <Video className="h-4 w-4" />
              Team call
            </Link>
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            className="pl-8"
          />
        </div>
        <ScrollArea className="mt-4 min-h-0 flex-1">
          {loading ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">Loading team…</p>
          ) : filtered.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">No people match.</p>
          ) : (
            <ul className="flex flex-col gap-1 pr-3">
              {filtered.map((member) => (
                <li key={member.id}>
                  <div className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{member.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {member.workEmail || member.email}
                      </span>
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild title="Chat">
                      <Link href={`/chat?userId=${member.id}`} onClick={() => setOpen(false)}>
                        <MessageCircle className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild title="Video call">
                      <Link
                        href={`/chat?userId=${member.id}&call=1`}
                        onClick={() => setOpen(false)}
                      >
                        <Video className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild title="Email">
                      <Link href={emailHref(member)} onClick={() => setOpen(false)}>
                        <Mail className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
