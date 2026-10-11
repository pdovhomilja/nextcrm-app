"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Phone, Video } from "lucide-react";
import Link from "next/link";
import {
  getChatMessages,
  sendChatMessage,
  type ChatMessageDTO,
} from "@/actions/chat/messages";
import { teamRoomName } from "@/lib/jitsi/meet-url";
import { JitsiMeetEmbed } from "@/components/meet/JitsiMeetEmbed";
import { EmailComposeEditor } from "@/app/[locale]/(routes)/emails/components/EmailComposeEditor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Props = {
  roomKey: string;
  roomTitle: string;
  displayName: string;
  meetRoom: string;
  initialCallOpen?: boolean;
};

export function ChatWorkspace({
  roomKey,
  roomTitle,
  displayName,
  meetRoom,
  initialCallOpen = false,
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
  }, [messages.length]);

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

  return (
    <div className="flex h-[min(75vh,720px)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <h2 className="font-semibold">{roomTitle}</h2>
          <p className="text-xs text-muted-foreground">Team chat · polls every 4s · free on your database</p>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setCallOpen((v) => !v)}>
            <Video className="h-4 w-4" />
            {callOpen ? "Hide call" : "Video"}
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1" asChild>
            <Link href={`/chat?room=${encodeURIComponent(roomKey)}&call=1`} onClick={() => setCallOpen(true)}>
              <Phone className="h-4 w-4" />
              Call
            </Link>
          </Button>
        </div>
      </div>

      {callOpen && (
        <div className="border-b border-border/50 p-3 bg-muted/20">
          <p className="mb-2 text-xs text-muted-foreground">
            Powered by free Jitsi Meet — use the toolbar for screen share, mic, and camera.
          </p>
          <JitsiMeetEmbed roomName={meetRoom} displayName={displayName} />
        </div>
      )}

      <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-2 w-fit">
          <TabsTrigger value="chat">Messages</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1 px-4 py-3">
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    "bg-muted/50 border border-border/40"
                  )}
                >
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground">{m.user.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {m.htmlBody ? (
                    <div
                      className="prose prose-sm max-w-none text-foreground/90 [&_a]:text-primary"
                      dangerouslySetInnerHTML={{ __html: m.htmlBody }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
          <div className="space-y-2 border-t border-border/50 p-3">
            <EmailComposeEditor
              content={draftHtml}
              onChange={(html, plain) => {
                setDraftHtml(html);
                setDraftPlain(plain);
              }}
            />
            <Button className="w-full" disabled={sending || !draftPlain.trim()} onClick={() => void handleSend()}>
              {sending ? "Sending…" : "Send message"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
