"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  approveLeave,
  createScheduleEntry,
  listScheduleEntries,
  type ScheduleEntryDTO,
  type ScheduleKind,
} from "@/actions/schedule/entries";
import { getTeamDirectory, type TeamMember } from "@/actions/team/get-team-directory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Plane, Users, Video } from "lucide-react";
import { TeamMemberInvitePicker } from "./TeamMemberInvitePicker";

const KIND_META: Record<
  ScheduleKind,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  MEETING: { label: "Meeting", icon: Users, color: "bg-sky-500/10 text-sky-700" },
  CONFERENCE: { label: "Conference", icon: Video, color: "bg-violet-500/10 text-violet-700" },
  EVENT: { label: "Event", icon: Calendar, color: "bg-amber-500/10 text-amber-800" },
  LEAVE: { label: "Leave", icon: Plane, color: "bg-emerald-500/10 text-emerald-700" },
};

export function ScheduleHub({ isManager }: { isManager: boolean }) {
  const [entries, setEntries] = React.useState<ScheduleEntryDTO[]>([]);
  const [team, setTeam] = React.useState<TeamMember[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [e, t] = await Promise.all([listScheduleEntries(), getTeamDirectory()]);
      setEntries(e);
      setTeam(t);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      interval = setInterval(() => void refresh(), 120_000);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = undefined;
    };
    start();
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        void refresh();
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <CreateScheduleDialog kind="MEETING" team={team} onCreated={refresh} />
        <CreateScheduleDialog kind="CONFERENCE" team={team} onCreated={refresh} />
        <CreateScheduleDialog kind="EVENT" team={team} onCreated={refresh} />
        <CreateScheduleDialog kind="LEAVE" team={team} onCreated={refresh} />
        <Button variant="outline" asChild>
          <Link href="/profile?tab=calendar">Connect Google Calendar</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading schedule…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming items. Create a meeting, conference, event, or leave request.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => {
            const meta = KIND_META[e.kind];
            const Icon = meta.icon;
            return (
              <li
                key={e.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 gap-3">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.color)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{e.title}</span>
                      <Badge variant="secondary">{meta.label}</Badge>
                      {e.leaveStatus && (
                        <Badge variant={e.leaveStatus === "APPROVED" ? "default" : "outline"}>{e.leaveStatus}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(e.startAt), "PPp")} → {format(new Date(e.endAt), "PPp")} · {e.organizerName}
                    </p>
                    {e.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {e.chatRoomKey && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/chat?room=${encodeURIComponent(e.chatRoomKey)}${e.meetRoom ? "&call=1" : ""}`}>
                        Chat / call
                      </Link>
                    </Button>
                  )}
                  {e.kind === "LEAVE" && e.leaveStatus === "PENDING" && isManager && (
                    <>
                      <Button size="sm" onClick={() => void approveLeave(e.id, true).then(refresh)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void approveLeave(e.id, false).then(refresh)}>
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CreateScheduleDialog({
  kind,
  team,
  onCreated,
}: {
  kind: ScheduleKind;
  team: TeamMember[];
  onCreated: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  const meta = KIND_META[kind];

  React.useEffect(() => {
    if (!open) {
      setSelected([]);
      setTitle("");
      setDescription("");
      setStart("");
      setEnd("");
    }
  }, [open]);

  async function submit() {
    setBusy(true);
    try {
      await createScheduleEntry({
        kind,
        title,
        description,
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        attendeeIds: kind === "LEAVE" ? [] : selected,
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      onCreated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={kind === "CONFERENCE" ? "default" : "outline"} size="sm">
          {meta.label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {meta.label.toLowerCase()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {kind !== "LEAVE" && (
            <div>
              <Label>Invite teammates</Label>
              <TeamMemberInvitePicker
                className="mt-1"
                team={team}
                selected={selected}
                onChange={setSelected}
              />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <Button className="w-full" disabled={busy || !title.trim() || !start || !end} onClick={() => void submit()}>
            {busy ? "Saving…" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
