"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { VentureOption } from "@/lib/vensai/venture-catalog";

type Props = {
  ventures: VentureOption[];
  ventureSlugs: string[];
  crmEnabled: boolean;
  onVentureSlugsChange: (slugs: string[]) => void;
  onCrmEnabledChange: (enabled: boolean) => void;
};

export function VentureAccessFields({
  ventures,
  ventureSlugs,
  crmEnabled,
  onVentureSlugsChange,
  onCrmEnabledChange,
}: Props) {
  function toggle(slug: string, checked: boolean) {
    if (checked) onVentureSlugsChange([...new Set([...ventureSlugs, slug])]);
    else onVentureSlugsChange(ventureSlugs.filter((s) => s !== slug));
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium">VenSai ventures</p>
        <p className="text-xs text-muted-foreground">
          Opens the Admin Portal venture workspace for this user (synced via lightweight API).
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {ventures.map((v) => (
          <label key={v.slug} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={ventureSlugs.includes(v.slug)}
              onCheckedChange={(c) => toggle(v.slug, c === true)}
            />
            <span>{v.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{v.slug}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t pt-3">
        <Checkbox checked={crmEnabled} onCheckedChange={(c) => onCrmEnabledChange(c === true)} id="crm-enabled" />
        <Label htmlFor="crm-enabled" className="text-sm font-normal">
          CRM access (leads, accounts, projects, email, etc.)
        </Label>
      </div>
    </div>
  );
}
