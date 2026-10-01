"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { saveHomepageSettings } from "@/actions/admin/homepage-settings";

interface Props {
  initial: {
    model: string;
    maxTokens: number;
    basePromptId: string | null;
    basePrompts: { id: string; name: string }[];
    imageModel: string;
    imageCount: number;
    imageProvider: string;
    imageProviders: { higgsfield: boolean; openai: boolean };
  };
  models: readonly string[];
  imageModels: readonly string[];
  imageProviders: readonly string[];
}

const PROVIDER_LABELS: Record<string, string> = {
  auto: "Auto (first configured)",
  higgsfield: "Higgsfield",
  openai: "OpenAI",
};

const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet-5-5": "Sonnet 5.5 (default)",
  "claude-opus-5-5": "Opus 5.5",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

// Radix Select items cannot have an empty-string value, so "Built-in default"
// uses a sentinel that is mapped back to null on save.
const DEFAULT_PROMPT = "__builtin__";

export function HomepageSettingsForm({
  initial,
  models,
  imageModels,
  imageProviders,
}: Props) {
  const [model, setModel] = useState(initial.model);
  const [maxTokens, setMaxTokens] = useState(String(initial.maxTokens));
  const [basePromptId, setBasePromptId] = useState(
    initial.basePromptId ?? DEFAULT_PROMPT
  );
  const [imageProvider, setImageProvider] = useState(initial.imageProvider);
  const [imageModel, setImageModel] = useState(initial.imageModel);
  const [imageCount, setImageCount] = useState(String(initial.imageCount));
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await saveHomepageSettings({
        model,
        maxTokens: Number(maxTokens),
        basePromptId: basePromptId === DEFAULT_PROMPT ? null : basePromptId,
        imageModel,
        // An emptied field must not save Number("") === 0 (silently disabling
        // images); keep the current value. The server clamp stays authoritative.
        imageCount: imageCount.trim() === "" ? initial.imageCount : Number(imageCount),
        imageProvider,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved");
      setModel(res.data.model);
      setMaxTokens(String(res.data.maxTokens));
      setBasePromptId(res.data.basePromptId ?? DEFAULT_PROMPT);
      setImageModel(res.data.imageModel);
      setImageCount(String(res.data.imageCount));
      setImageProvider(res.data.imageProvider);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-5">
      <div className="space-y-2">
        <Label htmlFor="homepage-model">Model</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger id="homepage-model">
            <SelectValue placeholder="Choose a model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m} value={m}>
                {MODEL_LABELS[m] ?? m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="homepage-max-tokens">Max tokens</Label>
        <Input
          id="homepage-max-tokens"
          type="number"
          inputMode="numeric"
          value={maxTokens}
          onChange={(e) => setMaxTokens(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Clamped to the model&apos;s limit on save.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="homepage-base-prompt">Base prompt</Label>
        <Select value={basePromptId} onValueChange={setBasePromptId}>
          <SelectTrigger id="homepage-base-prompt">
            <SelectValue placeholder="Built-in default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_PROMPT}>Built-in default</SelectItem>
            {initial.basePrompts.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="homepage-image-provider">Image provider</Label>
        <Select value={imageProvider} onValueChange={setImageProvider}>
          <SelectTrigger id="homepage-image-provider">
            <SelectValue placeholder="Choose a provider" />
          </SelectTrigger>
          <SelectContent>
            {imageProviders.map((p) => (
              <SelectItem key={p} value={p}>
                {PROVIDER_LABELS[p] ?? p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p
          className="text-xs text-muted-foreground"
          data-testid="image-provider-status"
        >
          Higgsfield:{" "}
          {initial.imageProviders.higgsfield ? "Connected" : "Not configured"}
          {" · "}
          OpenAI: {initial.imageProviders.openai ? "Connected" : "Not configured"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="homepage-image-model">Image model</Label>
        <Select value={imageModel} onValueChange={setImageModel}>
          <SelectTrigger id="homepage-image-model">
            <SelectValue placeholder="Choose an image model" />
          </SelectTrigger>
          <SelectContent>
            {imageModels.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          More models unlock as they are verified.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="homepage-image-count">Images per homepage</Label>
        <Input
          id="homepage-image-count"
          type="number"
          inputMode="numeric"
          min={0}
          max={6}
          value={imageCount}
          onChange={(e) => setImageCount(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          0–6. Set to 0 to disable image generation.
        </p>
      </div>

      <Button onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
