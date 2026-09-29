# Research recipe — per candidate (each research subagent follows this exactly)

You are researching one **vertical** in one **geography** against a **website
criteria** string (may be empty). Return a structured list of **verified,
enriched** candidate records. Quality over quantity — a dropped candidate is fine;
a fabricated one is a failure.

## 1. Discover real candidates

Find real local businesses in the vertical + geography (web search). Never invent a
business, URL, or metric. Prefer independent local operators over national chains.

## 2. Fetch & verify — HARD GATE

For each candidate URL:

```bash
curl -sSL -A "Mozilla/5.0" --max-time 20 <url>
```

- The site **must return HTTP 200 with real HTML**. Drop anything unreachable
  (403, blank, DNS failure, timeout).
- Confirm it **meets the website criteria**. If the criteria string is empty, use
  the default **"redesign candidate" heuristic**: visibly dated design, weak UX, or
  poor performance. Drop candidates that don't match.
- Confirm it's a real business in the target geography (on-page city references,
  address schema).

**Never fabricate.** If you can't verify a field, leave it empty — don't guess.

## 3. Always-collect enrichment (record every field you can verify)

- **If WordPress:**
  - core **version** — `<meta name="generator" content="WordPress X.Y.Z">` or
    fingerprints (`wp-includes` script `?ver=`, jquery-migrate version).
  - **page builder(s)** — WPBakery / Elementor / Beaver Builder / Divi / Oxygen /
    Salient etc. (generator meta, `wp-content/plugins/<builder>`, body classes).
  - **theme** — `wp-content/themes/<slug>` (note child themes).
  - notable **plugins** — `wp-content/plugins/<slug>` (sliders, form plugins,
    WooCommerce, security shims, analytics).
- **All sites:**
  - **sitemap(s)** — fetch `robots.txt` and `/sitemap.xml` (follow nested sitemap
    indexes). **Count total URLs.**
  - **homepage links** — count links on the homepage and in its nav menus.
  - **most recent update** — newest sitemap `lastmod`, or the `Last-Modified`
    response header.
  - **signals** — concrete, redesign-motivating issues:
    - *security:* stale core/plugins, discontinued trackers (e.g. Omniture),
      abandoned plugins.
    - *performance:* heavy page weight, many render-blocking scripts, legacy jQuery.
    - *UI/UX:* unreadable / overlapping / broken elements. **Confirm any visual
      claim with a real browser screenshot** before stating it.
- **Contact email** — a generic inbox (`info@`, `contact@`, `hello@`) or, where
  findable, an **owner/president name + email** (contact/about pages, footer,
  `mailto:` links, PostalAddress/Person schema JSON).

## 4. Return record per kept candidate

For each candidate that cleared the gate, return:

- `company` — business name
- `company_website` — the **root** URL (scheme + host, no path)
- `city` — the business's city (and region if broad geography)
- `industry` — the vertical / category
- `email` — the contact email found (or empty)
- `description` — a single field concatenating the enrichment findings from step 3,
  ending with a **one-line opener hook** naming the single strongest redesign
  motivator (e.g. "Homepage hero renders white-on-light-gray — unreadable.").

## 5. Note drops

List candidates you dropped and why (not WP / not dated / 403 / not local), so a
later top-up pass doesn't recheck them.
