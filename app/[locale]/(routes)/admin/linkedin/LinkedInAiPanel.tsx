"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";

import { analyzeLinkedInOrganization, saveLinkedInIcpProfile } from "./actions-ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Brief = {
  synopsis: string;
  themes: string[];
  opportunitiesForOutreach: string[];
  risksOrCompetitorSignals: string[];
};

export function LinkedInIcpPanel({ defaultIcp }: { defaultIcp?: string }) {
  const [icp, setIcp] = React.useState(defaultIcp ?? "");
  const [icpBusy, setIcpBusy] = React.useState(false);
  const [icpMsg, setIcpMsg] = React.useState<string | null>(null);

  async function saveIcp() {
    setIcpBusy(true);
    setIcpMsg(null);
    const res = await saveLinkedInIcpProfile(icp);
    setIcpBusy(false);
    setIcpMsg(res.ok ? "ICP saved to Mem0 for AI lead scoring." : res.error);
  }

  return (
    <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">AI funnel — ICP</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Used when LinkedIn leads arrive and when summarizing company posts. Set{" "}
        <code className="text-xs">MEM0_API_KEY</code> for persistent ICP memory.
      </p>
      <Textarea
        className="mt-3 min-h-[100px]"
        value={icp}
        onChange={(e) => setIcp(e.target.value)}
        placeholder="Ideal titles, industries, company size, geos, disqualifiers…"
      />
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" size="sm" disabled={icpBusy} onClick={saveIcp}>
          {icpBusy ? <Loader2 className="size-4 animate-spin" /> : "Save ICP to Mem0"}
        </Button>
        {icpMsg ? <span className="text-xs text-muted-foreground">{icpMsg}</span> : null}
      </div>
    </div>
  );
}

export function LinkedInOrgAiBrief({ organizationId }: { organizationId: string }) {
  const [busy, setBusy] = React.useState(false);
  const [brief, setBrief] = React.useState<Brief | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function runAnalysis() {
    setBusy(true);
    setError(null);
    const res = await analyzeLinkedInOrganization(organizationId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setBrief(res.brief);
  }

  return (
    <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">AI org pulse</p>
          <p className="text-sm text-muted-foreground">Synopsis from your company&apos;s recent LinkedIn posts (official API).</p>
        </div>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={runAnalysis}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          <span className="ml-2">Generate brief</span>
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {brief ? (
        <div className="mt-4 space-y-3 text-sm">
          <p>{brief.synopsis}</p>
          {brief.themes.length ? (
            <div>
              <p className="font-medium">Themes</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {brief.themes.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {brief.opportunitiesForOutreach.length ? (
            <div>
              <p className="font-medium">Outreach angles</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {brief.opportunitiesForOutreach.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
