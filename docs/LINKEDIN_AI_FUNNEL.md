# LinkedIn + AI funnel (VenSai CRM)

## What is automated today

| Flow | Trigger | AI / automation | CRM outcome |
| ---- | ------- | ----------------- | ----------- |
| **Lead Gen → CRM** | LinkedIn Lead Sync webhook | Inngest `linkedin/lead.imported` → score, synopsis, status | Lead row + description + optional **Qualified** status |
| **Lead notify** | After AI qualify | Email to admin/manager | Link to `/crm/leads/{id}` |
| **Hot lead → targets** | `LINKEDIN_AUTO_CAMPAIGN_TARGET=1` + score ≥ 78 | Prisma create | Row in **Campaign targets** |
| **Company posts** | Admin → LinkedIn → org ID → Load | On-demand **AI org pulse** | Themes + outreach angles (no auto-DM) |
| **ICP memory** | Admin ICP textarea → Mem0 | Recall on qualify + org pulse | Better lead scores over time |
| **Funnel timers** | Existing Inngest CRM jobs | Rule-based (not LinkedIn-specific) | Cadence, care, recycle, renewals — see `/admin/funnel-settings` |
| **Target enrichment** | Campaign targets bulk enrich | Firecrawl + agents | Fills LinkedIn URL, company data from public web |

Env reference: `.env.local.example` (`LINKEDIN_*`, `MEM0_API_KEY`).

## What LinkedIn’s API does **not** allow (important)

LinkedIn does **not** offer a general “search all clients” or “scrape job posts” API for typical CRM apps. You cannot legally or reliably:

- Run automated **people search** or **Sales Navigator–style** prospecting through standard OAuth
- Pull **arbitrary members’** posts or **global job boards** without approved products (Talent, Marketing, etc.)
- Replace human prospecting with unsanctioned scraping (ToS risk; not implemented here)

**Supported paths:**

1. **Lead Gen forms** → your webhook (implemented + AI qualified)
2. **Your org’s posts** → Community Management API + org ID (implemented + AI brief)
3. **Public URLs already in CRM** → enrichment / Firecrawl on `social_linkedin` (existing campaigns module)

For **job posts**, use approved LinkedIn Talent APIs or third-party job feeds—not built into this repo until you have API access.

## Recommended operating model

1. Connect LinkedIn (Admin → LinkedIn), configure Lead Sync webhook + secret.
2. Set **ICP** in Admin UI (Mem0) or `LINKEDIN_ICP_BRIEF`.
3. Turn on `MEM0_API_KEY` + LLM keys (`docs/AI_SETUP.md`).
4. High-score leads: review AI synopsis → **Campaigns → Targets** → sequence (existing module).
5. Use **funnel settings** for post-quote cadence on opportunities (separate from LinkedIn).

## Future extensions (when you have API products)

- Scheduled org post digest (cron + Inngest) → Slack/email
- LinkedIn Ads / Campaign Manager performance → CRM attribution
- Talent API job requisitions → internal “hiring signal” leads for agencies
