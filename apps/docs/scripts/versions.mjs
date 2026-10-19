// Pure logic behind the docs version switcher. Used by fetch-versions.mjs at
// build time; kept free of I/O so it can be tested with `node --test`.

const TAG = /^v(\d+)\.(\d+)\.(\d+)$/;
// apps/docs/content/docs first shipped in v0.24.0; older minors only have
// their CHANGELOG.md entries.
const FIRST_DOCS_MINOR = 24;

/**
 * Release tags → one entry per minor version, newest minor first. Each entry
 * points at the newest patch tag of its minor.
 */
export function pickVersions(tags) {
  const newest = new Map();
  for (const tag of tags) {
    const m = TAG.exec(tag);
    if (!m) continue;
    const [major, minor, patch] = m.slice(1).map(Number);
    const key = `${major}.${minor}`;
    const prev = newest.get(key);
    if (!prev || patch > prev.patch) newest.set(key, { major, minor, patch, tag });
  }
  return [...newest.values()]
    .sort((a, b) => b.major - a.major || b.minor - a.minor)
    .map(({ major, minor, tag }) => ({
      slug: `v${major}.${minor}`,
      minor: `${major}.${minor}`,
      tag,
      kind: major > 0 || minor >= FIRST_DOCS_MINOR ? 'docs' : 'notes',
    }));
}

/**
 * The CHANGELOG.md sections of every release in one minor (e.g. "0.12" →
 * 0.12.1 and 0.12.0), verbatim, in file order (newest first).
 */
export function releaseNotesFor(changelog, minor) {
  const sections = changelog.split(/^(?=## \[)/m).slice(1);
  return sections
    .filter((section) => /^## \[(\d+\.\d+)\.\d+\]/.exec(section)?.[1] === minor)
    .map((section) => section.trim().replace(/\n+---$/, ''))
    .join('\n\n');
}

/** Point absolute `/docs/...` links (markdown and href) at the version's own pages. */
export function pinDocLinks(mdx, slug) {
  return mdx.replace(/(\]\(|href=")\/docs(?=[/)#"])/g, `$1/docs/${slug}`);
}
