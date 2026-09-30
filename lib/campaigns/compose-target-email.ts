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
} | null;

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
    homepage_url: ready ? homepage?.preview_url ?? "" : "",
    homepage_screenshot: ready ? homepage?.screenshot_url ?? "" : "",
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
