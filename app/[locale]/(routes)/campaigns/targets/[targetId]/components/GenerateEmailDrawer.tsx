"use client";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
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
import { listPromptBodies } from "@/actions/crm/prompts/list-prompt-bodies";
import { generateTargetEmail } from "@/actions/crm/targets/generate-target-email";
import { previewTargetEmail } from "@/actions/crm/targets/preview-target-email";
import { sendTargetEmail } from "@/actions/crm/targets/send-target-email";

type Option = { id: string; name: string };

export function GenerateEmailDrawer(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetId: string;
  templates: Option[];
  prompts: Option[];
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

  async function onPickPrompt(id: string) {
    setPromptId(id);
    const bodies = await listPromptBodies({ kind: "EMAIL" });
    setPrompt(bodies.find((p) => p.id === id)?.body ?? "");
  }

  async function onGenerate() {
    setBusy("gen");
    const res = await generateTargetEmail({ targetId: props.targetId, prompt });
    if ("error" in res) {
      toast.error(res.error);
      setBusy(null);
      return;
    }
    setSubject(res.data.subject);
    setBodyHtml(res.data.body_html);
    const prev = await previewTargetEmail({
      targetId: props.targetId,
      templateId,
      subject: res.data.subject,
      bodyHtml: res.data.body_html,
      includeHomepage,
    });
    if ("error" in prev) toast.error(prev.error);
    else setPreviewHtml(prev.data.html);
    setBusy(null);
  }

  async function onSend() {
    setBusy("send");
    const res = await sendTargetEmail({
      targetId: props.targetId,
      templateId,
      subject,
      bodyHtml,
      includeHomepage,
      promptUsed: prompt,
    });
    setBusy(null);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("Email sent");
    handleOpenChange(false);
  }

  function handleOpenChange(v: boolean) {
    if (!v) setPreviewHtml("");
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
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <Select value={promptId} onValueChange={onPickPrompt}>
            <SelectTrigger data-testid="email-prompt-select">
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
            placeholder="Guidance for the AI…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />

          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger data-testid="email-template-select">
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
              onCheckedChange={(v) => setIncludeHomepage(Boolean(v))}
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
                onChange={(e) => setSubject(e.target.value)}
                data-testid="email-subject"
              />
              <iframe
                title="preview"
                srcDoc={previewHtml}
                className="w-full h-96 border rounded"
                data-testid="email-preview"
              />
              <Button
                onClick={onSend}
                disabled={busy !== null}
                data-testid="email-send-btn"
              >
                {busy === "send" ? "Sending…" : "Send email"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
