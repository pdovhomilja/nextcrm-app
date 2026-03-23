"use client";

import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { EnrichFieldSelector } from "../../../contacts/components/EnrichFieldSelector";
import type { EnrichmentField } from "@/lib/enrichment/types";
import type { StoredEnrichmentResult } from "@/lib/enrichment/types/stored-result";
import { NoApiKeyDialog } from "@/app/components/NoApiKeyDialog";

type Step = "select" | "progress" | "diff";

interface AgentMessage {
  message: string;
  type: string;
  sourceUrl?: string;
}

interface TargetCurrentData {
  position?: string | null;
  company?: string | null;
  company_website?: string | null;
  personal_website?: string | null;
  mobile_phone?: string | null;
  office_phone?: string | null;
  social_linkedin?: string | null;
  social_x?: string | null;
  social_instagram?: string | null;
  social_facebook?: string | null;
}

interface EnrichTargetDrawerProps {
  targetId: string;
  targetEmail: string | null;
  targetCurrentData: TargetCurrentData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}

const TARGET_PRESET_FIELDS: EnrichmentField[] = [
  { name: "position",         displayName: "Position / Job Title",  description: "The target's job title or role", type: "string", required: false },
  { name: "company",          displayName: "Company Name",           description: "The target's company name", type: "string", required: false },
  { name: "company_website",  displayName: "Company Website",        description: "The company's official website URL", type: "string", required: false },
  { name: "personal_website", displayName: "Personal Website",       description: "The target's personal website URL", type: "string", required: false },
  { name: "mobile_phone",     displayName: "Mobile Phone",           description: "The target's mobile phone number", type: "string", required: false },
  { name: "office_phone",     displayName: "Office Phone",           description: "The target's office phone number", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn URL",           description: "The target's LinkedIn profile URL", type: "string", required: false },
  { name: "social_x",         displayName: "Twitter / X URL",        description: "The target's Twitter/X profile URL", type: "string", required: false },
  { name: "social_instagram", displayName: "Instagram URL",          description: "The target's Instagram profile URL", type: "string", required: false },
  { name: "social_facebook",  displayName: "Facebook URL",           description: "The target's Facebook profile URL", type: "string", required: false },
];

export function EnrichTargetDrawer({
  targetId,
  targetEmail,
  targetCurrentData,
  open,
  onOpenChange,
  onApplied,
}: EnrichTargetDrawerProps) {
  const [step, setStep] = useState<Step>("select");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [result, setResult] = useState<StoredEnrichmentResult | null>(null);
  const [enrichmentId, setEnrichmentId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedApply, setSelectedApply] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [showNoApiKeyDialog, setShowNoApiKeyDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setStep("select");
    setMessages([]);
    setResult(null);
    setEnrichmentId(null);
    setSessionId(null);
    setSelectedApply(new Set());
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleStart = async (fields: EnrichmentField[]) => {
    setStep("progress");
    setMessages([]);

    const response = await fetch("/api/crm/targets/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, fields }),
    });

    if (!response.ok) {
      const err = await response.json();
      if (response.status === 402 || err.error === "NO_API_KEY") {
        setShowNoApiKeyDialog(true);
        setStep("select");
        return;
      }
      toast.error(err.error ?? "Failed to start enrichment");
      setStep("select");
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const event = JSON.parse(line.slice(6));

        if (event.type === "session") {
          setSessionId(event.sessionId);
        } else if (event.type === "agent_progress") {
          setMessages((prev) => [...prev, { message: event.message, type: event.messageType, sourceUrl: event.sourceUrl }]);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        } else if (event.type === "result") {
          setResult(event.result);
          setEnrichmentId(event.enrichmentId);
          setSelectedApply(new Set(Object.keys(event.result.enrichments)));
        } else if (event.type === "complete") {
          setStep("diff");
        } else if (event.type === "error") {
          toast.error(event.error);
          setStep("select");
        }
      }
    }
  };

  const handleCancel = async () => {
    if (sessionId) {
      await fetch(`/api/crm/targets/enrich?sessionId=${sessionId}`, { method: "DELETE" });
    }
    reset();
  };

  const handleApply = async () => {
    if (!result || !enrichmentId) return;
    setApplying(true);

    const updates: Record<string, string> = {};
    for (const [fieldName, enrichment] of Object.entries(result.enrichments)) {
      if (selectedApply.has(fieldName) && enrichment.value) {
        updates[fieldName] = String(enrichment.value);
      }
    }

    const res = await fetch(`/api/crm/targets/${targetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrichmentFields: updates }),
    });

    if (res.ok) {
      toast.success("Target enriched successfully");
      onApplied();
      handleClose(false);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to apply enrichment");
    }
    setApplying(false);
  };

  const noEmail = !targetEmail;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[420px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            Enrich with AI
          </SheetTitle>
          <SheetDescription>
            {noEmail
              ? "Add an email to this target to enable enrichment."
              : "Firecrawl searches the web to fill in missing target details."}
          </SheetDescription>
        </SheetHeader>

        {noEmail && (
          <div className="mt-4 text-sm text-muted-foreground">
            No email address found on this target.
          </div>
        )}

        {!noEmail && step === "select" && (
          <div className="mt-4">
            <EnrichFieldSelector
              onStart={handleStart}
              presetFields={TARGET_PRESET_FIELDS}
              defaultSelected={["position", "company", "social_linkedin", "company_website"]}
            />
          </div>
        )}

        {step === "progress" && (
          <div className="mt-4 space-y-3">
            <ScrollArea className="h-[400px] pr-4">
              {messages.map((m, i) => (
                <div key={i} className="flex gap-2 text-sm py-1">
                  <span className="text-muted-foreground shrink-0">
                    {m.type === "success" ? "✓" : m.type === "agent" ? "🤖" : "›"}
                  </span>
                  <span className={m.type === "agent" ? "font-medium" : ""}>
                    {m.message}
                    {m.sourceUrl && (
                      <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="ml-1 text-blue-500 inline-flex items-center gap-0.5">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </span>
                </div>
              ))}
              <div ref={scrollRef} />
            </ScrollArea>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        )}

        {step === "diff" && result && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Review enriched data. Uncheck any fields you don&apos;t want to apply.
            </p>
            <ScrollArea className="h-[380px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs">
                    <th className="text-left pb-2 w-6"></th>
                    <th className="text-left pb-2">Field</th>
                    <th className="text-left pb-2">Current</th>
                    <th className="text-left pb-2">Enriched</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.enrichments).map(([fieldName, enrichment]) => {
                    const currentValue = (targetCurrentData as Record<string, string | null | undefined>)[fieldName];
                    return (
                      <tr key={fieldName} className="border-t">
                        <td className="py-2">
                          <Checkbox
                            checked={selectedApply.has(fieldName)}
                            onCheckedChange={(checked) => {
                              setSelectedApply((prev) => {
                                const next = new Set(prev);
                                checked ? next.add(fieldName) : next.delete(fieldName);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="py-2 pr-2 font-medium capitalize whitespace-nowrap">
                          {fieldName.replace(/_/g, " ")}
                          <div className="text-xs text-muted-foreground font-normal">
                            {Math.round(enrichment.confidence * 100)}% confident
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground max-w-[100px] truncate">
                          {currentValue ?? <span className="italic text-xs">empty</span>}
                        </td>
                        <td className="py-2">
                          <div className="font-medium">{String(enrichment.value)}</div>
                          {enrichment.source && (
                            <a href={enrichment.source} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-500 inline-flex items-center gap-0.5 mt-0.5">
                              <ExternalLink className="h-3 w-3" />
                              Source
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={selectedApply.size === 0 || applying}
                onClick={handleApply}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {applying ? "Applying…" : `Apply ${selectedApply.size} fields`}
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                <XCircle className="h-4 w-4 mr-1" />
                Discard
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
    <NoApiKeyDialog open={showNoApiKeyDialog} onClose={() => setShowNoApiKeyDialog(false)} />
  );
}
