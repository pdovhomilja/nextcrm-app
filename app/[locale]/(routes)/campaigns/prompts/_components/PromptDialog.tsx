"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AiPromptKind } from "@/actions/crm/prompts/kinds";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createPrompt } from "@/actions/crm/prompts/create-prompt";
import { updatePrompt } from "@/actions/crm/prompts/update-prompt";

type Prompt = {
  id: string;
  name: string;
  body: string;
  kind: AiPromptKind;
  scope: "ORG" | "USER";
};

export function PromptDialog({
  prompt,
  isAdmin,
  onClose,
}: {
  prompt?: Prompt;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(prompt?.name ?? "");
  const [body, setBody] = useState(prompt?.body ?? "");
  const [kind, setKind] = useState<AiPromptKind>(prompt?.kind ?? "EMAIL");
  const [scope, setScope] = useState<"ORG" | "USER">(prompt?.scope ?? "USER");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = prompt
        ? await updatePrompt({ id: prompt.id, name, body })
        : await createPrompt({ name, body, kind, scope });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(prompt ? "Prompt updated" : "Prompt created");
      onClose();
    } catch {
      toast.error("Failed to save prompt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-testid="prompt-dialog">
        <DialogHeader>
          <DialogTitle>{prompt ? "Edit prompt" : "New prompt"}</DialogTitle>
          <DialogDescription>
            Reusable guidance the AI follows when drafting outreach.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Name"
            aria-label="Prompt name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="prompt-name"
          />
          <Textarea
            placeholder="Prompt body"
            aria-label="Prompt body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            data-testid="prompt-body"
          />
          {!prompt && (
            <div className="flex gap-2">
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as AiPromptKind)}
              >
                <SelectTrigger aria-label="Prompt kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="HOMEPAGE">Homepage</SelectItem>
                  {isAdmin && (
                    <SelectItem value="HOMEPAGE_BASE">Homepage base (designer)</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as "ORG" | "USER")}
              >
                <SelectTrigger aria-label="Prompt scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Personal</SelectItem>
                  <SelectItem value="ORG">Org-wide (admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            onClick={save}
            disabled={busy || !name || !body}
            data-testid="prompt-save"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
