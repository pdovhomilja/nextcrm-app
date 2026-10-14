"use client";

import * as React from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Hash, Paperclip, SendHorizontal, Video, X } from "lucide-react";
import { sendChatMessage, type ChatAttachmentDTO } from "@/actions/chat/messages";
import {
  chatMessagesKey,
  useAppendChatMessage,
  useChatMessagesLive,
} from "@/hooks/use-chat-messages-live";
import { useQueryClient } from "@tanstack/react-query";
import { openJitsiMeetInNewTab } from "@/components/meet/JitsiMeetEmbed";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { markChatRoomRead } from "@/actions/chat/unread";
import { avatarGradientClass, initials } from "@/lib/chat/avatar-style";
import { uploadChatFile } from "@/lib/chat/upload-file";
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

function plainToHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
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
  const qc = useQueryClient();
  const { data: messages = [] } = useChatMessagesLive(roomKey);
  const appendMessage = useAppendChatMessage(roomKey);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<ChatAttachmentDTO>(null);
  const [uploading, setUploading] = React.useState(false);
  const [meetHint, setMeetHint] = React.useState(initialCallOpen);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMeetHint(initialCallOpen);
    setDraft("");
    setPendingFile(null);
  }, [initialCallOpen, roomKey]);

  React.useEffect(() => {
    void markChatRoomRead(roomKey);
  }, [roomKey, messages.length]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, roomKey]);

  React.useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  function joinMeeting() {
    openJitsiMeetInNewTab(meetRoom, displayName);
    setMeetHint(true);
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text && !pendingFile) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(roomKey, text ? plainToHtml(text) : "<p></p>", pendingFile);
      appendMessage(msg);
      void qc.invalidateQueries({ queryKey: chatMessagesKey(roomKey) });
      void qc.invalidateQueries({ queryKey: ["live-summary"] });
      setDraft("");
      setPendingFile(null);
      void markChatRoomRead(roomKey);
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      setPendingFile(await uploadChatFile(file));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const subtitle = isGeneral
    ? "Whole team"
    : peerName
      ? peerName
      : "Direct message";

  let lastDay: string | null = null;
  const canSend = !sending && !uploading && (draft.trim().length > 0 || Boolean(pendingFile));

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {isGeneral ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Hash className="h-5 w-5" />
            </span>
          ) : (
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white",
                avatarGradientClass(roomKey)
              )}
            >
              {initials(roomTitle)}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold">{roomTitle}</h2>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Button type="button" variant="outline" className="h-9 shrink-0 gap-2 rounded-full px-3.5" onClick={joinMeeting}>
          <Video className="h-4 w-4" />
          Meet
        </Button>
      </header>

      {meetHint && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-4 py-2 text-sm sm:px-5">
          <p className="text-muted-foreground">Meeting opens in its own window, so this chat stays put.</p>
          <button type="button" className="shrink-0 text-xs font-medium text-foreground underline-offset-2 hover:underline" onClick={() => setMeetHint(false)}>
            Dismiss
          </button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
              <p className="text-base font-medium">No messages yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {isGeneral
                  ? "Write something for the whole team, or start a meeting."
                  : `This is the start of your conversation with ${peerName ?? roomTitle}.`}
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
                    <div className="flex justify-center py-1">
                      <span className="text-[11px] font-medium text-muted-foreground">{day}</span>
                    </div>
                  )}
                  <div className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "flex-row")}>
                    {!mine && (
                      <span
                        className={cn(
                          "mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white",
                          avatarGradientClass(m.user.id)
                        )}
                      >
                        {initials(m.user.name)}
                      </span>
                    )}
                    <div className={cn("max-w-[min(100%,32rem)]", mine && "items-end")}>
                      <p className={cn("mb-1 px-1 text-[11px] text-muted-foreground", mine && "text-right")}>
                        {!mine && <span className="font-medium text-foreground/80">{m.user.name} · </span>}
                        <span title={formatMessageTime(m.createdAt)}>
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </span>
                      </p>
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          mine
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md bg-muted text-foreground"
                        )}
                      >
                        {m.htmlBody ? (
                          <div
                            className={cn(
                              "prose prose-sm max-w-none text-left [&_p]:my-0 [&_a]:underline",
                              mine ? "prose-invert" : ""
                            )}
                            dangerouslySetInnerHTML={{ __html: m.htmlBody }}
                          />
                        ) : m.body ? (
                          <p className="whitespace-pre-wrap text-left">{m.body}</p>
                        ) : null}
                        {m.attachment && (
                          <div className="mt-2 text-left">
                            {m.attachment.mime.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={m.attachment.url}
                                alt={m.attachment.name}
                                className="max-h-56 rounded-lg"
                              />
                            ) : m.attachment.mime.startsWith("video/") ? (
                              <video src={m.attachment.url} controls className="max-h-56 max-w-full rounded-lg" />
                            ) : (
                              <a
                                href={m.attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "text-sm underline underline-offset-2",
                                  mine ? "text-primary-foreground" : "text-primary"
                                )}
                              >
                                {m.attachment.name}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/60 bg-background px-4 py-3 sm:px-5">
        <div className="mx-auto w-full max-w-3xl">
          {pendingFile && (
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{pendingFile.name}</span>
              <button type="button" className="rounded-full p-0.5 hover:bg-muted" onClick={() => setPendingFile(null)} aria-label="Remove attachment">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted/30 px-2 py-1.5">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-0.5 h-9 w-9 shrink-0 rounded-full"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              title="Attach a file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <textarea
              ref={composerRef}
              value={draft}
              rows={1}
              placeholder={`Message ${isGeneral ? "General" : roomTitle}`}
              className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 outline-none placeholder:text-muted-foreground"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="mb-0.5 h-9 w-9 shrink-0 rounded-full"
              disabled={!canSend}
              onClick={() => void handleSend()}
              title="Send"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
        </div>
      </div>
    </div>
  );
}
