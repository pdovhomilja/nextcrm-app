"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify as proposeSlug } from "@/lib/homepage/slug-shape";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MAX_UPLOAD_BYTES } from "@/lib/homepage/upload-limits";
import { getHomepageStatus } from "@/actions/crm/homepage/get-homepage-status";
import { refineHomepage } from "@/actions/crm/homepage/refine-homepage";
import { revertHomepageVersion } from "@/actions/crm/homepage/revert-homepage-version";
import { updateHomepageSlug } from "@/actions/crm/homepage/update-homepage-slug";
import { getHomepageIndustry } from "@/actions/crm/targets/get-homepage-industry";
import { setHomepageIndustry } from "@/actions/crm/targets/set-homepage-industry";

type PromptOption = { id: string; name: string; body: string };
type HomepageStatus = "PENDING" | "RUNNING" | "READY" | "FAILED";

type HomepageVersion = {
  id: string;
  pass_kind: string;
  agent_critique: string | null;
  created_at: Date | string;
};

// Everything the drawer renders about the homepage row. `id` is null until the
// first status fetch resolves (props from the server component don't carry it).
type HomepageState = {
  id: string | null;
  status: HomepageStatus;
  error: string | null;
  slug: string;
  preview_url: string | null;
  screenshot_url: string | null;
  current_version_id: string | null;
  current_pass_kind?: string | null;
  versions: HomepageVersion[];
};

const DEFAULT_ERROR = "Something went wrong. Please try again.";
// Client pre-check for uploads, below the server's MAX_UPLOAD_BYTES: JSON
// escaping plus Vercel's ~4.5MB body limit can 413 a near-cap file before the
// route handler runs. The server route remains the real guard.
const CLIENT_UPLOAD_LIMIT_BYTES = Math.min(3_500_000, MAX_UPLOAD_BYTES);
const POLL_INTERVAL_MS = 2500;
// A refine/revert only queues an event; the row stays in its old state until the
// job starts. If we never see a change within this window the job never started.
const START_GRACE_MS = 30_000;
// Hard stop so a lost job can never leave the drawer polling forever.
const POLL_MAX_MS = 6 * 60_000;

const isActive = (s: HomepageStatus | undefined) =>
  s === "PENDING" || s === "RUNNING";

// `proposeSlug` is the shared, prisma-free slugify() (lib/homepage/slug-shape),
// so the client preview matches exactly what the server persists. Display/proposal
// only; the server still re-slugifies and uniquifies whatever we send.

// The slug may only change while nothing is published: renaming a published
// page would 404 the (possibly emailed) live link. FAILED-with-a-live-page is
// therefore locked too, even though the action would allow it.
const slugEditable = (hp: HomepageState | null) =>
  !hp || (hp.status === "FAILED" && !hp.preview_url && !hp.current_version_id);

export function GenerateHomepageDrawer(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetId: string;
  company: string;
  companyWebsite: string | null;
  prompts: PromptOption[];
  hasHomepage: boolean;
  initialSlug: string | null;
  initialStatus: HomepageStatus | null;
  initialPreviewUrl?: string | null;
  initialScreenshotUrl?: string | null;
}) {
  const {
    open,
    onOpenChange,
    targetId,
    company,
    initialSlug,
    initialStatus,
    initialPreviewUrl,
    initialScreenshotUrl,
    hasHomepage,
  } = props;

  const router = useRouter();
  const [hp, setHp] = useState<HomepageState | null>(null);
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState("");
  const [promptId, setPromptId] = useState("");
  const [prompt, setPrompt] = useState("");
  // Industry layer: options are the active HOMEPAGE_INDUSTRY prompts; the value
  // shown is the target's saved pick, else the Generic default. Persisted on change.
  const [industryOptions, setIndustryOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [industryId, setIndustryId] = useState("");
  const [savingIndustry, setSavingIndustry] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [busy, setBusy] = useState<
    "gen" | "slug" | "refine" | "revert" | "upload" | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // True from the moment a job is queued until polling observes it finish.
  const [awaiting, setAwaiting] = useState(false);

  // Request-generation guard: bumped on close/unmount and at the start of every
  // generate/refine/revert/load. An in-flight request or poll tick whose id is
  // stale drops its results instead of writing state for a closed/superseded drawer.
  const reqIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Deliberately reads the LATEST counter (not a snapshot), so cleanup goes
  // through this helper rather than touching the ref inside the effect.
  const invalidateRequests = useCallback(() => {
    reqIdRef.current++;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setAwaiting(false);
  }, []);

  // Folds a fresh server snapshot into state. While the slug is locked the row's
  // slug is authoritative (the server may have suffixed it); while editable we
  // keep whatever the operator typed.
  const applySnapshot = useCallback((data: HomepageState) => {
    setHp(data);
    if (!slugEditable(data)) setSlug(data.slug);
  }, []);

  // Polls getHomepageStatus until the job reaches READY/FAILED.
  // `baseline` (refine/revert): the pre-queue snapshot. Those actions don't flip
  // the row to PENDING, so the first ticks can still read the OLD terminal state;
  // we only accept a terminal state once we've seen the job active, seen the
  // snapshot change, or waited out START_GRACE_MS.
  const startPolling = useCallback(
    (myReq: number, baseline: HomepageState | null) => {
      stopPolling();
      setAwaiting(true);
      const startedAt = Date.now();
      let sawActive = false;
      let inFlight = false;

      pollRef.current = setInterval(async () => {
        if (reqIdRef.current !== myReq) {
          stopPolling();
          return;
        }
        if (inFlight) return;
        inFlight = true;
        try {
          const res = await getHomepageStatus({ targetId });
          if (reqIdRef.current !== myReq) return;
          if ("error" in res) {
            toast.error(res.error);
            stopPolling();
            return;
          }
          if (!res.data) return;
          const next = res.data as HomepageState;
          applySnapshot(next);

          const active = isActive(next.status);
          if (active) sawActive = true;
          const changed =
            !!baseline &&
            (next.status !== baseline.status ||
              next.current_version_id !== baseline.current_version_id ||
              next.versions.length !== baseline.versions.length ||
              next.error !== baseline.error);
          const elapsed = Date.now() - startedAt;
          const settled =
            !active &&
            (!baseline || sawActive || changed || elapsed > START_GRACE_MS);

          if (settled) {
            stopPolling();
            if (next.status === "READY") {
              toast.success("Homepage ready");
              // Refresh the server component so the email drawer's "include
              // homepage" gate (hasHomepage, computed server-side) picks up the
              // now-published page without a manual reload. The open-effect
              // re-seeds from the fresh props and re-fetches — converges to READY.
              router.refresh();
            } else if (next.status === "FAILED")
              toast.error(next.error ?? "Homepage generation failed");
          } else if (elapsed > POLL_MAX_MS) {
            stopPolling();
            toast.info("Still working — reopen this drawer to check progress");
          }
        } catch {
          // Transient fetch/action failure: keep polling until POLL_MAX_MS.
          if (
            reqIdRef.current === myReq &&
            Date.now() - startedAt > POLL_MAX_MS
          ) {
            stopPolling();
            toast.error(DEFAULT_ERROR);
          }
        } finally {
          inFlight = false;
        }
      }, POLL_INTERVAL_MS);
    },
    [targetId, stopPolling, applySnapshot, router],
  );

  // On open: seed from the server-component props (so the preview shows
  // immediately), then fetch the authoritative row (adds id + version list) and
  // resume polling if a job is already in flight. Cleanup runs on close AND on
  // unmount: it bumps the request id and clears the interval, so no timer or
  // late response can outlive the drawer.
  useEffect(() => {
    if (!open) return;
    const myReq = ++reqIdRef.current;

    if (initialSlug && initialStatus) {
      setHp({
        id: null,
        status: initialStatus,
        error: null,
        slug: initialSlug,
        preview_url: initialPreviewUrl ?? null,
        screenshot_url: initialScreenshotUrl ?? null,
        current_version_id: null,
        versions: [],
      });
      setSlug(initialSlug);
    } else {
      setHp(null);
      setSlug(proposeSlug(company));
    }

    setLoading(true);
    (async () => {
      try {
        const res = await getHomepageStatus({ targetId });
        if (reqIdRef.current !== myReq) return;
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        if (res.data) {
          const data = res.data as HomepageState;
          applySnapshot(data);
          if (isActive(data.status)) startPolling(myReq, null);
        }
      } catch {
        if (reqIdRef.current === myReq) toast.error(DEFAULT_ERROR);
      } finally {
        if (reqIdRef.current === myReq) setLoading(false);
      }
    })();

    return () => {
      invalidateRequests();
      stopPolling();
    };
  }, [
    open,
    targetId,
    company,
    initialSlug,
    initialStatus,
    initialPreviewUrl,
    initialScreenshotUrl,
    applySnapshot,
    startPolling,
    stopPolling,
    invalidateRequests,
  ]);

  // Load the Industry options + saved selection each time the drawer opens. Its
  // own cancel flag (not reqIdRef) so generate/refine bumping the request id
  // never drops this one-shot fetch.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getHomepageIndustry({ targetId });
        if (cancelled) return;
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        setIndustryOptions(res.data.options);
        setIndustryId(res.data.selectedId ?? res.data.defaultId ?? "");
      } catch {
        if (!cancelled) toast.error(DEFAULT_ERROR);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, targetId]);

  async function onPickIndustry(id: string) {
    const previous = industryId;
    setIndustryId(id);
    setSavingIndustry(true);
    try {
      const res = await setHomepageIndustry({ targetId, promptId: id });
      if ("error" in res) {
        setIndustryId(previous);
        toast.error(res.error);
      }
    } catch {
      setIndustryId(previous);
      toast.error(DEFAULT_ERROR);
    } finally {
      setSavingIndustry(false);
    }
  }

  // Picking a library prompt just copies its body (passed in as props) into the
  // guidance box; no server round-trip.
  function onPickPrompt(id: string) {
    setPromptId(id);
    setPrompt(props.prompts.find((p) => p.id === id)?.body ?? "");
  }

  const locked = busy !== null || awaiting || loading || isActive(hp?.status);

  async function onGenerate() {
    const myReq = ++reqIdRef.current;
    stopPolling();
    setBusy("gen");
    try {
      let effectiveSlug = slug.trim();

      // Existing unpublished/FAILED row: rename through the action (it rejects
      // published pages). No row yet: the slug rides along in the POST body.
      if (hp?.id && slugEditable(hp) && proposeSlug(slug) !== hp.slug) {
        setBusy("slug");
        const renamed = await updateHomepageSlug({
          homepageId: hp.id,
          slug: effectiveSlug,
        });
        if (reqIdRef.current !== myReq) return;
        if ("error" in renamed) {
          toast.error(renamed.error);
          return;
        }
        effectiveSlug = renamed.data.slug;
        setSlug(effectiveSlug);
        setBusy("gen");
      } else if (hp && !slugEditable(hp)) {
        // Published page: never ask the route to move it.
        effectiveSlug = hp.slug;
      }

      const res = await fetch(
        `/api/crm/targets/${targetId}/generate-homepage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: effectiveSlug || undefined,
            prompt: prompt.trim() || undefined,
          }),
        },
      );
      if (reqIdRef.current !== myReq) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (reqIdRef.current !== myReq) return;
        toast.error(
          typeof body?.error === "string" ? body.error : DEFAULT_ERROR,
        );
        return;
      }
      // The route flips the row to PENDING before responding, so the first
      // poll already sees the in-flight state (no baseline needed).
      setHp((prev) =>
        prev
          ? { ...prev, status: "PENDING", error: null }
          : {
              id: null,
              status: "PENDING",
              error: null,
              slug: proposeSlug(effectiveSlug) || effectiveSlug,
              preview_url: null,
              screenshot_url: null,
              current_version_id: null,
              versions: [],
            },
      );
      startPolling(myReq, null);
    } catch {
      if (reqIdRef.current === myReq) toast.error(DEFAULT_ERROR);
    } finally {
      if (reqIdRef.current === myReq) setBusy(null);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    // Clear so picking the same file again re-fires onChange.
    const reset = () => {
      input.value = "";
    };
    if (file.size > CLIENT_UPLOAD_LIMIT_BYTES) {
      toast.error("File too large (max 3.5 MB)");
      reset();
      return;
    }
    const myReq = ++reqIdRef.current;
    stopPolling();
    setBusy("upload");
    try {
      const html = await file.text();
      if (reqIdRef.current !== myReq) return;
      if (new Blob([html]).size > CLIENT_UPLOAD_LIMIT_BYTES) {
        toast.error("File too large (max 3.5 MB)");
        return;
      }
      const res = await fetch(`/api/crm/targets/${targetId}/upload-homepage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (reqIdRef.current !== myReq) return;
      // A 413 from the platform may not carry a JSON body.
      const body = await res.json().catch(() => ({}));
      if (reqIdRef.current !== myReq) return;
      if (!res.ok) {
        toast.error(
          typeof body?.error === "string"
            ? body.error
            : res.status === 413
              ? "File too large or upload failed"
              : DEFAULT_ERROR,
        );
        return;
      }
      const uploadedSlug =
        typeof body?.slug === "string" && body.slug ? body.slug : null;
      setHp((prev) =>
        prev
          ? { ...prev, status: "PENDING", error: null }
          : {
              id: null,
              status: "PENDING",
              error: null,
              slug: uploadedSlug ?? (proposeSlug(slug) || slug),
              preview_url: null,
              screenshot_url: null,
              current_version_id: null,
              versions: [],
            },
      );
      startPolling(myReq, null);
    } catch {
      if (reqIdRef.current === myReq) toast.error(DEFAULT_ERROR);
    } finally {
      reset();
      if (reqIdRef.current === myReq) setBusy(null);
    }
  }

  async function onRefine() {
    if (!hp?.id) return;
    const myReq = ++reqIdRef.current;
    stopPolling();
    setBusy("refine");
    try {
      const res = await refineHomepage({
        homepageId: hp.id,
        prompt: refineText,
      });
      if (reqIdRef.current !== myReq) return;
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setRefineText("");
      startPolling(myReq, hp);
    } catch {
      if (reqIdRef.current === myReq) toast.error(DEFAULT_ERROR);
    } finally {
      if (reqIdRef.current === myReq) setBusy(null);
    }
  }

  async function onRevert(versionId: string) {
    if (!hp?.id) return;
    const myReq = ++reqIdRef.current;
    stopPolling();
    setBusy("revert");
    try {
      const res = await revertHomepageVersion({
        homepageId: hp.id,
        versionId,
      });
      if (reqIdRef.current !== myReq) return;
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      startPolling(myReq, hp);
    } catch {
      if (reqIdRef.current === myReq) toast.error(DEFAULT_ERROR);
    } finally {
      if (reqIdRef.current === myReq) setBusy(null);
    }
  }

  // Reset ALL draft state on close so reopening never shows a stale prompt /
  // change request. (The effect cleanup also stops polling.)
  function handleOpenChange(v: boolean) {
    if (!v) {
      reqIdRef.current++;
      stopPolling();
      setHp(null);
      setLoading(false);
      setSlug("");
      setPromptId("");
      setPrompt("");
      setRefineText("");
      setBusy(null);
      setIndustryOptions([]);
      setIndustryId("");
    }
    onOpenChange(v);
  }

  const status = hp?.status;
  const hasPage =
    !!hp && (hp.status === "READY" || !!hp.preview_url || !!hp.current_version_id);
  // Public serving route; /p/ is reachable on the CRM host too, so fall back to
  // a relative path when the absolute preview base isn't configured. The version
  // id busts the 5-minute public cache after a refine/revert.
  const cacheKey = hp?.current_version_id ?? "";
  const previewSrc = hp
    ? `${hp.preview_url ?? `/p/${hp.slug}`}${cacheKey ? `?v=${cacheKey}` : ""}`
    : "";
  const screenshotSrc = hp
    ? `${hp.screenshot_url ?? `/p/${hp.slug}/screenshot.png`}${cacheKey ? `?v=${cacheKey}` : ""}`
    : "";
  const versions = hp?.versions ?? [];
  const isUpload = hp?.current_pass_kind === "UPLOAD";
  const canRefine = !!hp?.id && !!hp.current_version_id && !isUpload;
  const generateLabel =
    busy === "gen" || busy === "slug"
      ? "Working…"
      : isActive(status) || awaiting
        ? status === "RUNNING"
          ? "Generating…"
          : "Queued…"
        : hp
          ? "Regenerate"
          : "Generate";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="w-full sm:max-w-3xl overflow-y-auto"
        data-testid="generate-homepage-drawer"
      >
        <SheetHeader>
          <SheetTitle>Generate homepage</SheetTitle>
          <SheetDescription>
            Build a redesigned homepage mockup for {company || "this target"}
            {props.companyWebsite ? ` from ${props.companyWebsite}` : ""}, then
            refine it with change requests.
            {hasHomepage && !hp ? " A published page already exists." : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-1">
            <label htmlFor="homepage-slug" className="text-sm font-medium">
              Preview URL slug
            </label>
            <Input
              id="homepage-slug"
              data-testid="homepage-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={locked || !slugEditable(hp)}
              placeholder="acme-plumbing"
            />
            <p className="text-xs text-muted-foreground">
              {slugEditable(hp)
                ? `Will publish at /p/${proposeSlug(slug) || "…"}. Can't be changed once published.`
                : `Published at /p/${hp?.slug}. Regenerating keeps this URL.`}
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="homepage-industry" className="text-sm font-medium">
              Industry
            </label>
            <Select
              value={industryId}
              onValueChange={onPickIndustry}
              disabled={locked || savingIndustry || industryOptions.length === 0}
            >
              <SelectTrigger
                id="homepage-industry"
                data-testid="homepage-industry-select"
                aria-label="Industry"
              >
                <SelectValue placeholder="Generic" />
              </SelectTrigger>
              <SelectContent>
                {industryOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Shapes the page&apos;s sections and tone. Defaults to Generic.
            </p>
          </div>

          <Select value={promptId} onValueChange={onPickPrompt}>
            <SelectTrigger
              data-testid="homepage-prompt-select"
              aria-label="Prompt"
              disabled={locked}
            >
              <SelectValue placeholder="Choose a prompt (optional)" />
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
            data-testid="homepage-prompt-text"
            aria-label="Guidance for the AI"
            placeholder="Guidance for the AI…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            disabled={locked}
          />

          <div className="flex items-center gap-3">
            <Button
              onClick={onGenerate}
              disabled={locked}
              data-testid="homepage-generate-btn"
            >
              {generateLabel}
            </Button>
            {status && (
              <Badge
                variant={status === "FAILED" ? "destructive" : "secondary"}
                data-testid="homepage-status"
                role="status"
                aria-live="polite"
              >
                {status}
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="homepage-upload-input" className="text-sm font-medium">
              Upload your own HTML
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                id="homepage-upload-input"
                data-testid="homepage-upload-input"
                type="file"
                accept="text/html,.html"
                onChange={onUpload}
                disabled={locked}
                className="sr-only"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={locked}
                data-testid="homepage-upload-btn"
              >
                {busy === "upload" ? "Uploading…" : "Upload HTML"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Overrides the generated design with your own self-contained HTML.
            </p>
          </div>

          {status === "FAILED" && (
            <div
              role="alert"
              className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm"
              data-testid="homepage-error"
            >
              <p className="font-medium">
                {hasPage
                  ? "The last change failed. The live page below is unchanged."
                  : "Generation failed."}
              </p>
              {hp?.error && (
                <p className="mt-1 text-muted-foreground break-words">
                  {hp.error}
                </p>
              )}
            </div>
          )}

          {isActive(status) && (
            <p
              className="text-sm text-muted-foreground"
              data-testid="homepage-progress"
              role="status"
              aria-live="polite"
            >
              {hasPage
                ? "Updating the page — the preview below is the previous version."
                : "Generating the homepage — this can take a minute or two."}
            </p>
          )}

          {hasPage && hp && (
            <div className="space-y-2">
              {/* Sandboxed WITHOUT allow-same-origin: the served page is LLM-generated
                  and self-contained (inline CSS/JS only); allow-scripts lets its own
                  inline scripts run while the opaque origin blocks CRM cookies.
                  Matches the route's CSP. */}
              <iframe
                title="Homepage preview"
                src={previewSrc}
                className="w-full h-[28rem] border rounded"
                sandbox="allow-scripts"
                data-testid="homepage-preview"
              />
              <div className="flex items-center gap-3 text-sm">
                <a
                  href={previewSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Open in new tab
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotSrc}
                alt="Homepage screenshot"
                className="w-full max-w-sm border rounded"
                data-testid="homepage-screenshot"
              />
            </div>
          )}

          {canRefine && (
            <div className="space-y-2">
              <label
                htmlFor="homepage-refine-input"
                className="text-sm font-medium"
              >
                Change request
              </label>
              <Textarea
                id="homepage-refine-input"
                data-testid="homepage-refine-input"
                placeholder="e.g. Make the hero darker and add a testimonials section"
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                rows={3}
                disabled={locked}
              />
              <Button
                variant="outline"
                onClick={onRefine}
                disabled={locked || !refineText.trim()}
                data-testid="homepage-refine-btn"
              >
                {busy === "refine" ? "Queuing…" : "Refine"}
              </Button>
            </div>
          )}

          {isUpload && !!hp?.id && (
            <p
              className="text-sm text-muted-foreground"
              data-testid="homepage-upload-refine-hint"
            >
              This page was uploaded — regenerate to use AI refine.
            </p>
          )}

          {versions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Versions</h3>
              <ul className="space-y-2">
                {versions
                  .map((v, i) => ({ v, n: i + 1 }))
                  .reverse()
                  .map(({ v, n }) => {
                    const isCurrent = v.id === hp?.current_version_id;
                    return (
                      <li
                        key={v.id}
                        className="flex items-start justify-between gap-3 rounded border p-2 text-sm"
                        data-testid={`homepage-version-${n}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">v{n}</span>
                            <Badge variant="outline">{v.pass_kind}</Badge>
                            {isCurrent && <Badge>Current</Badge>}
                            <span className="text-xs text-muted-foreground">
                              {new Date(v.created_at).toLocaleString()}
                            </span>
                          </div>
                          {v.agent_critique && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 break-words">
                              {v.agent_critique}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRevert(v.id)}
                          disabled={locked || isCurrent}
                          data-testid={`homepage-revert-${n}`}
                          aria-label={`Revert to v${n}`}
                        >
                          Revert
                        </Button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
