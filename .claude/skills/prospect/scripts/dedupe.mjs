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
