// Deterministic URL dedup for the prospecting skill. Normalizes a site URL to a
// bare host key so the same site in different forms (http/https, www, path,
// case, trailing slash) collapses to one, then filters a candidate batch to the
// net-new set (not already in the CRM, and unique within the batch).

export function normalizeSiteUrl(url) {
  let s = String(url || "").trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, ""); // strip scheme
  s = s.replace(/^www\./, ""); // strip leading www.
  s = s.split(/[/?#]/)[0]; // keep host only
  return s;
}

export function filterNewByWebsite(candidates, existingUrls) {
  const seen = new Set((existingUrls || []).map(normalizeSiteUrl));
  const kept = [];
  const skipped = [];
  for (const c of candidates) {
    const key = normalizeSiteUrl(c.company_website);
    if (!key || seen.has(key)) {
      skipped.push(c);
      continue;
    }
    seen.add(key);
    kept.push(c);
  }
  return { kept, skipped };
}

// Normalize a company name to a comparison key: lowercase, drop common legal
// suffixes, strip punctuation, collapse whitespace. Secondary dedup key — catches
// existing CRM rows that have a blank/different website (e.g. pre-parity rows).
const LEGAL_SUFFIXES = new Set([
  "llc", "l.l.c", "inc", "incorporated", "co", "corp", "corporation",
  "ltd", "limited", "pllc", "pc", "pa", "llp", "lp",
]);

export function normalizeCompanyName(name) {
  const words = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // strip punctuation (incl. & , . -)
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !LEGAL_SUFFIXES.has(w));
  return words.join(" ");
}

// Dedup candidates against existing CRM records by normalized website OR company
// name (and within the candidate batch). `existing` is an array of records that
// have company_website and/or company. Spec §5.4/§6: match by website, then name.
export function filterNewProspects(candidates, existing) {
  const seenUrls = new Set();
  const seenNames = new Set();
  for (const e of existing || []) {
    const u = normalizeSiteUrl(e.company_website);
    if (u) seenUrls.add(u);
    const n = normalizeCompanyName(e.company);
    if (n) seenNames.add(n);
  }
  const kept = [];
  const skipped = [];
  for (const c of candidates) {
    const u = normalizeSiteUrl(c.company_website);
    const n = normalizeCompanyName(c.company);
    if ((u && seenUrls.has(u)) || (n && seenNames.has(n))) {
      skipped.push(c);
      continue;
    }
    if (u) seenUrls.add(u);
    if (n) seenNames.add(n);
    kept.push(c);
  }
  return { kept, skipped };
}
