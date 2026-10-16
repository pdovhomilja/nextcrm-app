const HTTPS_GIT_RE =
  /^https:\/\/(?:[a-z0-9-]+\.)*(?:github|gitlab|bitbucket)\.(?:com|org)\/[a-z0-9_.-]+\/[a-z0-9_.-]+(?:\.git)?\/?$/i;

const SSH_GIT_RE =
  /^git@[a-z0-9.-]+:(?:[a-z0-9_.-]+\/)+[a-z0-9_.-]+(?:\.git)?$/i;

/** Normalize common Git hosting URLs for display and deduplication. */
export function normalizeGitRepositoryUrl(raw: string): string {
  const trimmed = raw.trim();
  if (SSH_GIT_RE.test(trimmed)) {
    const m = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/i);
    if (m) {
      const host = m[1].toLowerCase();
      const path = m[2].replace(/\.git$/i, "");
      return `https://${host}/${path}`;
    }
  }
  return trimmed.replace(/\.git\/?$/i, "").replace(/\/+$/, "");
}

export function isValidGitRepositoryUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return HTTPS_GIT_RE.test(trimmed) || SSH_GIT_RE.test(trimmed);
}

export function parseGitRepositoryUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  if (!raw.trim()) {
    return { ok: false, error: "Git repository URL is required." };
  }
  if (!isValidGitRepositoryUrl(raw)) {
    return {
      ok: false,
      error: "Use a valid GitHub, GitLab, or Bitbucket HTTPS or git@ SSH URL.",
    };
  }
  return { ok: true, url: normalizeGitRepositoryUrl(raw) };
}
