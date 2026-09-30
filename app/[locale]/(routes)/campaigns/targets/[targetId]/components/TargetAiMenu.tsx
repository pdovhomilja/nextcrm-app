"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GenerateEmailDrawer } from "./GenerateEmailDrawer";
import { GenerateHomepageDrawer } from "./GenerateHomepageDrawer";

type Option = { id: string; name: string };
type PromptOption = { id: string; name: string; body: string };
type HomepageInfo = {
  slug: string;
  status: "PENDING" | "RUNNING" | "READY" | "FAILED";
  preview_url: string | null;
  screenshot_url: string | null;
};

export function TargetAiMenu(props: {
  targetId: string;
  triageStatus: "NEW" | "APPROVED" | "PASSED";
  templates: Option[];
  prompts: PromptOption[];
  hasHomepage: boolean;
  company: string;
  companyWebsite: string | null;
  homepagePrompts: PromptOption[];
  homepage: HomepageInfo | null;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [homepageOpen, setHomepageOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const approved = props.triageStatus === "APPROVED";

  async function enrich() {
    setEnriching(true);
    try {
      const res = await fetch(`/api/crm/targets/${props.targetId}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("Enrichment started — you'll be notified when done");
    } catch {
      toast.error("Failed to start enrichment");
    } finally {
      setEnriching(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid="target-ai-menu">
            <Sparkles className="h-4 w-4 mr-1 text-orange-500" />
            {enriching ? "Starting…" : "AI"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={enriching} onClick={enrich}>
            Enrich with AI
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!approved}
            data-testid="ai-generate-email"
            onClick={() => setEmailOpen(true)}
          >
            Generate email{!approved ? " (approve first)" : ""}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!approved}
            data-testid="ai-generate-homepage"
            onClick={() => setHomepageOpen(true)}
          >
            Generate homepage{!approved ? " (approve first)" : ""}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GenerateEmailDrawer
        open={emailOpen}
        onOpenChange={setEmailOpen}
        targetId={props.targetId}
        templates={props.templates}
        prompts={props.prompts}
        hasHomepage={props.hasHomepage}
      />

      <GenerateHomepageDrawer
        open={homepageOpen}
        onOpenChange={setHomepageOpen}
        targetId={props.targetId}
        company={props.company}
        companyWebsite={props.companyWebsite}
        prompts={props.homepagePrompts}
        hasHomepage={props.hasHomepage}
        initialSlug={props.homepage?.slug ?? null}
        initialStatus={props.homepage?.status ?? null}
        initialPreviewUrl={props.homepage?.preview_url ?? null}
        initialScreenshotUrl={props.homepage?.screenshot_url ?? null}
      />
    </>
  );
}
