"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { EnrichmentField } from "@/lib/enrichment/types";

const PRESET_FIELDS: EnrichmentField[] = [
  { name: "position",         displayName: "Position / Job Title",  description: "The contact's job title or role at their company", type: "string", required: false },
  { name: "website",          displayName: "Company Website",        description: "The company's official website URL", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn URL",           description: "The contact's or company's LinkedIn profile URL", type: "string", required: false },
  { name: "social_twitter",   displayName: "Twitter / X URL",        description: "The contact's or company's Twitter/X profile URL", type: "string", required: false },
  { name: "social_facebook",  displayName: "Facebook URL",           description: "The contact's or company's Facebook page URL", type: "string", required: false },
  { name: "social_instagram", displayName: "Instagram URL",          description: "The contact's or company's Instagram profile URL", type: "string", required: false },
  { name: "description",      displayName: "Company Description",    description: "A brief description of what the company does", type: "string", required: false },
  { name: "office_phone",     displayName: "Office Phone",           description: "The company or contact's office phone number", type: "string", required: false },
  { name: "mobile_phone",     displayName: "Mobile Phone",           description: "The contact's mobile phone number", type: "string", required: false },
];

interface EnrichFieldSelectorProps {
  onStart: (fields: EnrichmentField[]) => void;
  loading?: boolean;
}

export function EnrichFieldSelector({ onStart, loading }: EnrichFieldSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["position", "social_linkedin", "website", "description"])
  );
  const [customFields, setCustomFields] = useState<EnrichmentField[]>([]);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    const field: EnrichmentField = {
      name: customName.toLowerCase().replace(/\s+/g, "_"),
      displayName: customName.trim(),
      description: customDesc.trim() || `Find the ${customName.trim()} for this contact`,
      type: "string",
      required: false,
    };
    setCustomFields((prev) => [...prev, field]);
    setSelected((prev) => new Set(Array.from(prev).concat(field.name)));
    setCustomName("");
    setCustomDesc("");
  };

  const removeCustom = (name: string) => {
    setCustomFields((prev) => prev.filter((f) => f.name !== name));
    setSelected((prev) => { const next = new Set(prev); next.delete(name); return next; });
  };

  const allFields = [...PRESET_FIELDS, ...customFields];
  const selectedFields = allFields.filter((f) => selected.has(f.name));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the data points to enrich. Firecrawl will search the web to find them.
      </p>

      <div className="space-y-2">
        {PRESET_FIELDS.map((field) => (
          <div key={field.name} className="flex items-center gap-2">
            <Checkbox
              id={field.name}
              checked={selected.has(field.name)}
              onCheckedChange={() => toggle(field.name)}
            />
            <Label htmlFor={field.name} className="cursor-pointer font-normal">
              {field.displayName}
            </Label>
          </div>
        ))}

        {customFields.map((field) => (
          <div key={field.name} className="flex items-center gap-2">
            <Checkbox
              id={field.name}
              checked={selected.has(field.name)}
              onCheckedChange={() => toggle(field.name)}
            />
            <Label htmlFor={field.name} className="cursor-pointer font-normal flex-1">
              {field.displayName}
            </Label>
            <Button variant="ghost" size="sm" onClick={() => removeCustom(field.name)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="border rounded-md p-3 space-y-2 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground">Add custom field</p>
        <Input
          placeholder="Field name (e.g. Number of employees)"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Description (optional)"
          value={customDesc}
          onChange={(e) => setCustomDesc(e.target.value)}
          className="h-8 text-sm"
        />
        <Button variant="outline" size="sm" onClick={addCustom} disabled={!customName.trim()}>
          <Plus className="h-3 w-3 mr-1" /> Add field
        </Button>
      </div>

      <Button
        className="w-full"
        disabled={selectedFields.length === 0 || loading}
        onClick={() => onStart(selectedFields)}
      >
        {loading ? "Starting…" : `Start Enrichment (${selectedFields.length} fields)`}
      </Button>
    </div>
  );
}
