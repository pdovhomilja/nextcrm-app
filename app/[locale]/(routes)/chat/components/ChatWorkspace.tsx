"use client";

import * as React from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
  Hash,
  MonitorUp,
  Phone,
  SendHorizontal,
  Sparkles,
  Video,
  VideoOff,
} from "lucide-react";
import {
  getChatMessages,
  sendChatMessage,
  type ChatMessageDTO,
} from "@/actions/chat/messages";
import { JitsiMeetEmbed } from "@/components/meet/JitsiMeetEmbed";
import { EmailComposeEditor } from "@/app/[locale]/(routes)/emails/components/EmailComposeEditor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { avatarGradientClass, initials } from "@/lib/chat/avatar-style";
import { cn } from "@/lib/utils";

type Props = {
  roomKey: string;
  roomTitle: string;
  displayName: string;
  meetRoom: string;
  currentUserId: string;
  initialCallOpen?: boolean;
  isGeneral?: boolean;
  peerName?: string;
};

function formatMessageTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

export function ChatWorkspace({
  roomKey,
  roomTitle,
  displayName,
  meetRoom,
  currentUserId,
  initialCallOpen = false,
  isGeneral = false,
  peerName,
}: Props) {
  const [messages, setMessages] = React.useState<ChatMessageDTO[]>([]);
  const [draftHtml, setDraftHtml] = React.useState("<p></p>");
  const [draftPlain, setDraftPlain] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [callOpen, setCallOpen] = React.useState(initialCallOpen);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;

  React.useEffect(() => {
    setCallOpen(initialCallOpen);
  }, [initialCallOpen, roomKey]);

  React.useEffect(() => {
    void getChatMessages(roomKey).then(setMessages);
  }, [roomKey]);

  React.useEffect(() => {
    const t = setInterval(async () => {
      const lastAt = messagesRef.current.at(-1)?.createdAt;
      const data = await getChatMessages(roomKey, lastAt);
      if (!data.length) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...data.filter((m) => !ids.has(m.id))];
      });
    }, 4000);
    return () => clearInterval(t);
  }, [roomKey]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, roomKey]);

  async function handleSend() {
    if (!draftPlain.trim()) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(roomKey, draftHtml);
      setMessages((prev) => [...prev, msg]);
      setDraftHtml("<p></p>");
      setDraftPlain("");
    } finally {
      setSending(false);
    }
  }

  const subtitle = isGeneral
    ? "Everyone on your team can see this channel"
    : peerName
      ? `Private chat with ${peerName}`
      : "Direct message";

  let lastDay: string | null = null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/40 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {isGeneral ? (
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
                <Hash className="h-5 w-5" />
              </span>
            ) : (
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-semibold text-white shadow-md",
                  avatarGradientClass(roomKey)
                )}
              >
                {initials(roomTitle)}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-tight">{roomTitle}</h2>
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={callOpen ? "secondary" : "outline"}
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => setCallOpen((v) => !v)}
                >
                  {callOpen ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{callOpen ? "End meeting view" : "Start video meeting"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => setCallOpen(true)}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Voice call</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="hidden h-9 w-9 rounded-xl sm:inline-flex"
                  onClick={() => setCallOpen(true)}
                >
                  <MonitorUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Screen share (in meeting toolbar)</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {callOpen && (
          <div className="shrink-0 border-b border-border/40 bg-zinc-950/95 px-4 py-3 sm:px-5">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-zinc-300">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Meeting room · mic, camera & screen share in the bar below
              </span>
              <button
                type="button"
                className="text-zinc-400 underline-offset-2 hover:text-white hover:underline"
                onClick={() => setCallOpen(false)}
              >
                Close
              </button>
            </div>
            <JitsiMeetEmbed
              roomName={meetRoom}
              displayName={displayName}
              className="h-[min(42vh,380px)] w-full overflow-hidden rounded-xl border border-white/10 shadow-2xl"
            />
          </div>
        )}

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-1 px-4 py-4 sm:px-6">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-foreground">No messages yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Say hello, share an update, or start a video call from the icons above.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.user.id === currentUserId;
                const day = dayLabel(m.createdAt);
                const showDay = day !== lastDay;
                if (showDay) lastDay = day;

                return (
                  <React.Fragment key={m.id}>
                    {showDay && (
                      <div className="my-4 flex justify-center">
                        <span className="rounded-full bg-muted/80 px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {day}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "mb-2 flex gap-2.5",
                        mine ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {!mine && (
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white",
                            avatarGradientClass(m.user.id)
                          )}
                        >
                          {initials(m.user.name)}
                        </span>
                      )}
                      <div
                        className={cn(
                          "max-w-[min(100%,520px)] space-y-0.5",
                          mine ? "items-end text-right" : "items-start"
                        )}
                      >
                        {!mine && (
                          <p className="px-1 text-[11px] font-medium text-muted-foreground">{m.user.name}</p>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                            mine
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md border border-border/50 bg-background"
                          )}
                        >
                          {m.htmlBody ? (
                            <div
                              className={cn(
                                "prose prose-sm max-w-none text-left [&_a]:underline",
                                mine ? "prose-invert [&_a]:text-primary-foreground" : "[&_a]:text-primary"
                              )}
                              dangerouslySetInnerHTML={{ __html: m.htmlBody }}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap text-left">{m.body}</p>
                          )}
                        </div>
                        <p
                          className={cn(
                            "px-1 text-[10px] text-muted-foreground",
                            mine && "text-right"
                          )}
                          title={formatMessageTime(m.createdAt)}
                        >
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={bottomRef} className="h-1" />
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t border-border/40 bg-background/90 p-3 sm:p-4">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.03]">
            <EmailComposeEditor
              variant="chat"
              content={draftHtml}
              onChange={(html, plain) => {
                setDraftHtml(html);
                setDraftPlain(plain);
              }}
            />
            <div className="flex items-center justify-end gap-2 border-t border-border/40 bg-muted/20 px-3 py-2">
              <Button
                size="sm"
                className="gap-1.5 rounded-xl px-4 shadow-sm"
                disabled={sending || !draftPlain.trim()}
                onClick={() => void handleSend()}
              >
                <SendHorizontal className="h-4 w-4" />
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
