"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";

import { generateComposeEmail } from "@/actions/emails/generate-compose-email";
import {
  type AiQualityMode,
  type ComposeAiAction,
  type MailboxComposeMode,
  AI_QUALITY_MODES,
  QUALITY_MODE_CONFIG,
} from "@/lib/llm/quality-modes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type EmailAiWriterContext = {
  composeMode: MailboxComposeMode;
  to?: string;
  subject?: string;
  existingBodyPlain?: string;
  threadFrom?: string;
  threadSubject?: string;
  threadBodySnippet?: string;
};

type Props = {
  context: EmailAiWriterContext;
  onGenerated: (result: { subject: string; html: string }) => void;
  className?: string;
  defaultPrompt?: string;
  /** When true with a defaultPrompt, runs Generate once on mount (assistant → compose). */
  autoGenerate?: boolean;
};

const QUICK_PROMPTS: { label: string; action: ComposeAiAction; prompt: string; modes?: MailboxComposeMode[] }[] = [
  {
    label: "Draft reply",
    action: "draft",
    prompt: "Write a professional, helpful reply.",
    modes: ["reply", "reply-all"],
  },
  {
    label: "Thank them",
    action: "draft",
    prompt: "Write a short thank-you email.",
  },
  {
    label: "Follow up",
    action: "draft",
    prompt: "Write a polite follow-up email.",
    modes: ["new"],
  },
  {
    label: "Improve",
    action: "improve",
    prompt: "",
  },
  {
    label: "Shorter",
    action: "shorten",
    prompt: "",
  },
  {
    label: "More formal",
    action: "formal",
    prompt: "",
  },
  {
    label: "Friendlier",
    action: "friendly",
    prompt: "",
  },
];

export function EmailAiWriter({
  context,
  onGenerated,
  className,
  defaultPrompt = "",
  autoGenerate = false,
}: Props) {
  const [prompt, setPrompt] = React.useState(defaultPrompt);
  const [quality, setQuality] = React.useState<AiQualityMode>("good");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(Boolean(defaultPrompt.trim()));
  const autoRanRef = React.useRef(false);

  React.useEffect(() => {
    if (defaultPrompt.trim()) setPrompt(defaultPrompt);
  }, [defaultPrompt]);

  React.useEffect(() => {
    autoRanRef.current = false;
  }, [defaultPrompt, autoGenerate]);

  async function run(action: ComposeAiAction, promptOverride?: string) {
    setBusy(true);
    setError(null);
    try {
      const userPrompt = prompt.trim();
      const combinedPrompt = promptOverride
        ? userPrompt
          ? `${promptOverride} ${userPrompt}`
          : promptOverride
        : userPrompt;

      const result = await generateComposeEmail({
        prompt: combinedPrompt,
        action,
        mode: context.composeMode,
        qualityMode: quality,
        to: context.to,
        subject: context.subject,
        existingBodyPlain: context.existingBodyPlain,
        threadFrom: context.threadFrom,
        threadSubject: context.threadSubject,
        threadBodySnippet: context.threadBodySnippet,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onGenerated({ subject: result.subject, html: result.html });
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    if (!autoGenerate || !defaultPrompt.trim() || autoRanRef.current) return;
    autoRanRef.current = true;
    setOpen(true);
    void run("draft", defaultPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot on assistant open
  }, [autoGenerate, defaultPrompt]);

  const chips = QUICK_PROMPTS.filter(
    (c) => !c.modes || c.modes.includes(context.composeMode)
  );

  return (
    <div className={cn("rounded-lg border border-primary/20 bg-primary/[0.04] p-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-primary"
          onClick={() => setOpen((v) => !v)}
        >
          <Sparkles className="h-4 w-4" />
          Write with AI
        </button>
        <Select value={quality} onValueChange={(v) => setQuality(v as AiQualityMode)}>
          <SelectTrigger className="h-8 w-[min(100%,11rem)] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_QUALITY_MODES.map((m) => (
              <SelectItem key={m} value={m} className="text-xs">
                {QUALITY_MODE_CONFIG[m].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <Button
                key={chip.label}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 text-xs"
                disabled={busy}
                onClick={() => run(chip.action, chip.prompt || undefined)}
              >
                {chip.label}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Instructions</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Invite them to a demo next Tuesday, mention our CRM…"
              rows={3}
              className="min-h-[72px] resize-y text-sm"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            type="button"
            className="w-full gap-2 sm:w-auto"
            disabled={busy || (!prompt.trim() && !context.existingBodyPlain?.trim())}
            onClick={() => run("draft")}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </Button>
        </div>
      )}
    </div>
  );
}
