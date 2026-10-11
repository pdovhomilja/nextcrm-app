"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle, Mail, Search } from "lucide-react";
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

  function messageHref(member: TeamMember) {
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
          aria-label="Team chat"
          title="Message a teammate"
        >
          <MessageCircle className="h-[1.15rem] w-[1.15rem]" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Team chat</SheetTitle>
          <SheetDescription>
            Quick messages to coworkers use your work mailbox — pick someone and compose.
          </SheetDescription>
        </SheetHeader>
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
                  <Link
                    href={messageHref(member)}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{member.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {member.workEmail || member.email}
                      </span>
                    </span>
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <Button variant="outline" className="mt-4 w-full" asChild>
          <Link href="/emails" onClick={() => setOpen(false)}>
            Open full inbox
          </Link>
        </Button>
      </SheetContent>
    </Sheet>
  );
}
