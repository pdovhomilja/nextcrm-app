# AQUNAMA Phase-0 Setup Runbook (manual configuration, no code)

Perform these steps as an **admin** user after deploying Phase 1.

## 1. Sales stages (Admin → CRM settings → Sales stage)
Create in this order — the target→deal conversion enters deals at the
lowest-order stage, so Pre-Sale MUST have the lowest order:

| Order | Name           |
|-------|----------------|
| 0     | Pre-Sale       |
| 1     | Qualified Lead |
| 2     | Purchase Order |
| 3     | Delivery       |
| 4     | Care           |

Note: the admin UI edits stage names only; `order` is set at creation.

## 2. Lead statuses (optional, if inbound leads are triaged before targets)
Create: `New`, `In Sequence`, `Paused`, `Recycled`, `Unsubscribed`, `Lost`.

## 3. Target lists = batches
One list per import batch / AiLead campaign. Naming convention:
`[YYYY-MM] <campaign name> — <ICP>` (e.g. `[2026-07] Healthcare CallCenter — Hospitals CZ`).

## 4. Sequences = campaigns
Per AiLead campaign batch: create a campaign, attach the batch's target
list, add 4 email steps authored by the sales rep. Suggested delays
(delay_days): step 0 = 0, step 1 = 3, step 2 = 7, step 3 = 10.
Call touches are manual in v1 — the rep works from the campaign stats page.

## 5. AiLead tool access
Issue an MCP API token (profile → API tokens) for the AiLead generator.
It pushes leads with `crm_create_target` + `crm_create_target_list` and
assigns lists to campaigns with `campaigns_assign_target_list`.

## 6. Working the funnel
- Response received → open the target → **Convert to deal** (creates
  account + contact + opportunity at Pre-Sale with campaign attribution).
- PO won → move the deal to Purchase Order and fill **budget/expected
  revenue** and **delivery deadline** (both on the opportunity form).
- The 3-month recycle and 45-day kill rule are Phase 2 (automated);
  until then track them manually via the campaign stats and deal
  last-activity dates.
