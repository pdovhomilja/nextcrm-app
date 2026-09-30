"use client";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { generateTargetEmail } from "@/actions/crm/targets/generate-target-email";
import { previewTargetEmail } from "@/actions/crm/targets/preview-target-email";
import { sendTargetEmail } from "@/actions/crm/targets/send-target-email";

type Option = { id: string; name: string };
type PromptOption = { id: string; name: string; body: string };

const DEFAULT_ERROR = "Something went wrong. Please try again.";

export function GenerateEmailDrawer(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetId: string;
  templates: Option[];
  prompts: PromptOption[];
  hasHomepage: boolean;
}) {
  const [promptId, setPromptId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [templateId, setTemplateId] = useState<string>(
    props.templates[0]?.id ?? "",
  );
  const [includeHomepage, setIncludeHomepage] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [busy, setBusy] = useState<"gen" | "send" | null>(null);

  // Picking a library prompt just copies its body (passed in as props) into the
  // guidance box; no server round-trip.
  function onPickPrompt(id: string) {
    setPromptId(id);
    setPrompt(props.prompts.find((p) => p.id === id)?.body ?? "");
  }

  // Preview drift guard: the preview must always reflect the exact template /
  // homepage / subject that Send will use. Any change after a preview exists
  // clears it (which also disables Send) until the operator re-previews.
  function onTemplateChange(id: string) {
    setTemplateId(id);
    setPreviewHtml("");
  }
  function onHomepageChange(v: boolean) {
    setIncludeHomepage(v);
    setPreviewHtml("");
  }
  function onSubjectChange(v: string) {
    setSubject(v);
    setPreviewHtml("");
  }

  async function refreshPreview(s: string, b: string) {
    const prev = await previewTargetEmail({
      targetId: props.targetId,
      templateId,
      subject: s,
      bodyHtml: b,
      includeHomepage,
    });
    if ("error" in prev) {
      toast.error(prev.error);
      return;
    }
    setPreviewHtml(prev.data.html);
  }

  async function onGenerate() {
    setBusy("gen");
    try {
      const res = await generateTargetEmail({
        targetId: props.targetId,
        prompt,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setSubject(res.data.subject);
      setBodyHtml(res.data.body_html);
      setPreviewHtml("");
      await refreshPreview(res.data.subject, res.data.body_html);
    } catch {
      toast.error(DEFAULT_ERROR);
    } finally {
      setBusy(null);
    }
  }

  async function onRefreshPreview() {
    setBusy("gen");
    try {
      await refreshPreview(subject, bodyHtml);
    } catch {
      toast.error(DEFAULT_ERROR);
    } finally {
      setBusy(null);
    }
  }

  async function onSend() {
    setBusy("send");
    try {
      const res = await sendTargetEmail({
        targetId: props.targetId,
        templateId,
        subject,
        bodyHtml,
        includeHomepage,
        promptUsed: prompt,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Email sent");
      handleOpenChange(false);
    } catch {
      toast.error(DEFAULT_ERROR);
    } finally {
      setBusy(null);
    }
  }

  // Reset ALL draft state on close so reopening never shows a stale subject /
  // enabled Send (one-click re-send of the previous email).
  function handleOpenChange(v: boolean) {
    if (!v) {
      setSubject("");
      setBodyHtml("");
      setPreviewHtml("");
      setPromptId("");
      setPrompt("");
      setIncludeHomepage(false);
      setBusy(null);
    }
    props.onOpenChange(v);
  }

  return (
    <Sheet open={props.open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="w-full sm:max-w-2xl overflow-y-auto"
        data-testid="generate-email-drawer"
      >
        <SheetHeader>
          <SheetTitle>Generate outreach email</SheetTitle>
          <SheetDescription>
            Pick a prompt and template, generate a draft, review the preview,
            then send it to this target.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <Select value={promptId} onValueChange={onPickPrompt}>
            <SelectTrigger
              data-testid="email-prompt-select"
              aria-label="Prompt"
            >
              <SelectValue placeholder="Choose a prompt" />
            </SelectTrigger>
            <SelectContent>
              {props.prompts.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            data-testid="email-prompt-text"
            aria-label="Guidance for the AI"
            placeholder="Guidance for the AI…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />

          <Select value={templateId} onValueChange={onTemplateChange}>
            <SelectTrigger
              data-testid="email-template-select"
              aria-label="Email template"
            >
              <SelectValue placeholder="Choose a template" />
            </SelectTrigger>
            <SelectContent>
              {props.templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeHomepage}
              disabled={!props.hasHomepage}
              onCheckedChange={(v) => onHomepageChange(Boolean(v))}
            />
            Include homepage preview link + screenshot
            {!props.hasHomepage ? " (none generated yet)" : ""}
          </label>

          <Button
            onClick={onGenerate}
            disabled={!prompt || !templateId || busy !== null}
            data-testid="email-generate-btn"
          >
            {busy === "gen" ? "Generating…" : "Generate"}
          </Button>

          {subject && (
            <div className="space-y-2">
              <Input
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                aria-label="Email subject"
                data-testid="email-subject"
              />
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                className="w-full h-96 border rounded"
                sandbox=""
                data-testid="email-preview"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onRefreshPreview}
                  disabled={busy !== null || !subject || !templateId}
                  data-testid="email-preview-btn"
                >
                  {previewHtml ? "Refresh preview" : "Update preview"}
                </Button>
                <Button
                  onClick={onSend}
                  disabled={busy !== null || !previewHtml}
                  data-testid="email-send-btn"
                >
                  {busy === "send" ? "Sending…" : "Send email"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
