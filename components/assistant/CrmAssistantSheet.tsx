"use client";

import * as React from "react";
import { Bot, ImagePlus, Loader2, Send, Sparkles, X } from "lucide-react";

import {
  handleAssistantImage,
  handleAssistantMessage,
  type AssistantAction,
} from "@/actions/assistant/handle-assistant-message";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ChatLine = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "vensai-assistant-thread-v1";

const QUICK_PROMPTS = [
  "Send a proposal email to client@example.com",
  "Message Jayandra about tomorrow's demo",
  "Open emails",
  "Open projects",
  "Open schedule",
];

function loadStoredLines(): ChatLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatLine[];
    return Array.isArray(parsed) ? parsed.slice(-24) : [];
  } catch {
    return [];
  }
}

const WELCOME: ChatLine = {
  role: "assistant",
  content:
    "I can open compose with a full AI draft, start a team DM, or navigate the app. Try a quick action below, or attach a screenshot for Gemini to analyze (free tier).",
};

export function CrmAssistantSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [lines, setLines] = React.useState<ChatLine[]>([WELCOME]);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      const stored = loadStoredLines();
      if (stored.length) setLines([WELCOME, ...stored]);
    }
  }, [open]);

  React.useEffect(() => {
    if (lines.length <= 1) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines.filter((l) => l !== WELCOME)));
    } catch {
      /* ignore quota */
    }
  }, [lines]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, open, busy]);

  function applyAction(action: AssistantAction) {
    if (action.type === "open_compose") {
      setLines((prev) => [...prev, { role: "assistant", content: action.summary }]);
      setOpen(false);
      router.push(`/emails?${action.emailsQuery}`);
      return;
    }
    if (action.type === "open_chat_dm") {
      setLines((prev) => [...prev, { role: "assistant", content: action.summary }]);
      setOpen(false);
      router.push(`/chat?${action.chatQuery}`);
      return;
    }
    if (action.type === "open_chat") {
      setLines((prev) => [...prev, { role: "assistant", content: action.summary }]);
      setOpen(false);
      router.push("/chat");
      return;
    }
    if (action.type === "navigate") {
      setLines((prev) => [...prev, { role: "assistant", content: action.summary }]);
      setOpen(false);
      router.push(action.path);
      return;
    }
    setLines((prev) => [...prev, { role: "assistant", content: action.message }]);
  }

  async function submit(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;
    if (!overrideText) setInput("");
    setLines((prev) => [...prev, { role: "user", content: text }]);
    setBusy(true);
    try {
      const result = await handleAssistantMessage({
        message: text,
        pageContext: pathname,
      });
      if (!result.ok) {
        setLines((prev) => [...prev, { role: "assistant", content: result.error }]);
        return;
      }
      applyAction(result.action);
    } finally {
      setBusy(false);
    }
  }

  async function submitWithImage() {
    if (!imagePreview || busy) return;
    const note = input.trim();
    setInput("");
    setLines((prev) => [
      ...prev,
      { role: "user", content: note ? `[Image] ${note}` : "[Uploaded image for analysis]" },
    ]);
    setBusy(true);
    try {
      const result = await handleAssistantImage({
        imageDataUrl: imagePreview,
        userNote: note,
        pageContext: pathname,
      });
      setImagePreview(null);
      if (!result.ok) {
        setLines((prev) => [...prev, { role: "assistant", content: result.error }]);
        return;
      }
      applyAction(result.action);
    } finally {
      setBusy(false);
    }
  }

  function onPickImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2_500_000) {
      setLines((prev) => [
        ...prev,
        { role: "assistant", content: "Please use an image under 2.5 MB." },
      ]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function clearThread() {
    setLines([WELCOME]);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="header-icon-btn"
          aria-label="VenSai AI assistant"
          title="AI assistant — email, chat, images"
        >
          <Sparkles className="h-[1.15rem] w-[1.15rem]" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="text-left">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                VenSai Assistant
              </SheetTitle>
              <SheetDescription className="mt-1">
                Email compose, team chat, navigation, image analysis — free Groq / Gemini / OpenRouter.
              </SheetDescription>
            </div>
            <Button type="button" variant="ghost" size="sm" className="shrink-0 text-xs" onClick={clearThread}>
              Clear
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              onClick={() => void submit(q)}
            >
              {q.length > 42 ? `${q.slice(0, 40)}…` : q}
            </button>
          ))}
        </div>

        <ScrollArea className="mt-3 min-h-0 flex-1 pr-3">
          <div className="space-y-3 pb-2">
            {lines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed",
                  line.role === "user"
                    ? "ml-6 bg-primary text-primary-foreground"
                    : "mr-2 bg-muted/80 text-foreground"
                )}
              >
                {line.content}
              </div>
            ))}
            {busy && (
              <div className="mr-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Working…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="mt-auto space-y-2 border-t pt-3">
          {imagePreview && (
            <div className="relative overflow-hidden rounded-lg border bg-muted/30 p-2">
              <button
                type="button"
                className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow"
                onClick={() => setImagePreview(null)}
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Upload preview" className="max-h-28 rounded object-contain" />
            </div>
          )}
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything, or describe an attached screenshot…"
            rows={3}
            className="resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (imagePreview) void submitWithImage();
                else void submit();
              }
            }}
          />
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              title="Attach image (Gemini vision)"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              className="min-w-0 flex-1 gap-2"
              disabled={busy || (!input.trim() && !imagePreview)}
              onClick={() => (imagePreview ? void submitWithImage() : void submit())}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {imagePreview ? "Analyze & act" : "Send"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
