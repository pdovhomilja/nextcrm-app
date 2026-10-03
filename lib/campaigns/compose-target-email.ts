import { resolveMergeTags, type MergeTagTarget } from "./merge-tags";

export class TemplateBodyError extends Error {
  constructor(message = "Template must contain a {{body}} placeholder") {
    super(message);
    this.name = "TemplateBodyError";
  }
}

type TargetLike = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company_email?: string | null;
  personal_email?: string | null;
  company?: string | null;
  position?: string | null;
};

type HomepageLike = {
  status: string;
  preview_url?: string | null;
  screenshot_url?: string | null;
  /** The currently-published version. Used to cache-bust the stable slug URLs. */
  current_version_id?: string | null;
} | null;

/**
 * Append `?v=<versionId>` to a homepage URL so each published/reverted version is
 * a DISTINCT, cache-clean URL.
 *
 * The homepage lives at a stable per-target slug (`/p/<slug>` + `.../screenshot.png`)
 * whose bytes are overwritten in place on every publish/revert. Without a per-version
 * query the CDN (and, far worse, email-client image proxies like Gmail/Outlook) keep
 * serving the previously-generated page/screenshot after a revert — so an email sent
 * after reverting still shows the old design. Stamping the active version id makes the
 * URL change with the content, which defeats that caching. No-ops when there is no
 * version id or no URL.
 */
export function withVersionParam(url: string, versionId?: string | null): string {
  if (!url || !versionId) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(versionId)}`;
}

/**
 * The single recipient-resolution chain: email -> company_email -> personal_email.
 * Blank/whitespace values are treated as ABSENT (the target forms store cleared
 * fields as "", and `??` would not fall through an empty string), and the winner
 * is trimmed.
 */
export function resolveTargetRecipient(target: {
  email?: string | null;
  company_email?: string | null;
  personal_email?: string | null;
}): string | null {
  const pick = (v?: string | null): string | null => {
    const t = v?.trim();
    return t ? t : null;
  };
  return pick(target.email) ?? pick(target.company_email) ?? pick(target.personal_email);
}

export function buildTargetMergeSource(target: TargetLike, homepage: HomepageLike): MergeTagTarget {
  const ready = homepage?.status === "READY";
  return {
    first_name: target.first_name ?? "",
    last_name: target.last_name ?? "",
    email: resolveTargetRecipient(target) ?? "",
    company: target.company ?? "",
    position: target.position ?? "",
    homepage_url: ready
      ? withVersionParam(homepage?.preview_url ?? "", homepage?.current_version_id)
      : "",
    homepage_screenshot: ready
      ? withVersionParam(homepage?.screenshot_url ?? "", homepage?.current_version_id)
      : "",
  };
}

export function composeTargetEmailContent(params: {
  templateHtml: string;
  bodyHtml: string;
  mergeSource: MergeTagTarget;
}): string {
  if (!params.templateHtml.includes("{{body}}")) {
    throw new TemplateBodyError();
  }
  // Insert the AI body raw (it is HTML and will be sanitized by renderCampaignEmail);
  // {{body}} is consumed here so resolveMergeTags never sees it.
  const withBody = params.templateHtml.split("{{body}}").join(params.bodyHtml);
  // Resolve remaining personalization tags with HTML escaping on values.
  return resolveMergeTags(withBody, params.mergeSource, true);
}
