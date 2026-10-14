"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AI_QUALITY_MODES,
  QUALITY_MODE_CONFIG,
  type AiQualityMode,
} from "@/lib/llm/quality-modes";

type Props = {
  mode: AiQualityMode;
  onModeChange: (mode: AiQualityMode) => void;
  includeHeroImage: boolean;
  onIncludeHeroImageChange: (value: boolean) => void;
};

export function AiGenerateControls({
  mode,
  onModeChange,
  includeHeroImage,
  onIncludeHeroImageChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
      <div className="flex flex-col gap-2 min-w-[200px]">
        <Label>Quality</Label>
        <Select value={mode} onValueChange={(v) => onModeChange(v as AiQualityMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_QUALITY_MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {QUALITY_MODE_CONFIG[m].label} — {QUALITY_MODE_CONFIG[m].description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 pb-1">
        <Checkbox
          id="ai-hero-image"
          checked={includeHeroImage}
          onCheckedChange={(c) => onIncludeHeroImageChange(c === true)}
          disabled={mode === "fast"}
        />
        <Label htmlFor="ai-hero-image" className="font-normal cursor-pointer">
          Hero image (OpenRouter — use Good+ for best results)
        </Label>
      </div>
    </div>
  );
}
