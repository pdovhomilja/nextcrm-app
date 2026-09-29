# Load mapping — write the net-new set into the CRM

Runs after the top-up loop (`SKILL.md` step 6) has produced the **net-new,
qualified, deduped** set. Load it via the MCP tools for the chosen environment.

## 1. Choose the MCP server

- `qa` → `rade-crm-qa` tools.
- `prod` → `rade-crm-prod` tools (only after the explicit prod confirmation).

## 2. Parity-schema safety check — HARD GATE

The load needs `crm_create_target` to accept the full field set (`company_website`,
`industry`, `city`, `description`, …). A session that connected **before** the QA/
prod parity deploy advertises an old 7-field schema and silently **strips** those
fields.

Guard against it: create the **first** target of the ranked net-new set with
`company_website` set. Inspect the field on the **record `crm_create_target`
returns** (it returns the full row); if the response is only an id, fetch it with
`crm_get_target` and inspect that. **If `company_website` is `null`/absent, the
fields are being stripped — ABORT THE LOAD:** delete the stray target
(`crm_delete_target`), tell the user to re-run `/prospect` in a session started
after the parity deploy (or import the CSV via the app), and stop. Do not create the
rest.

If `company_website` is present, the check passed **and this first target counts as
loaded target #1** — continue from the second target in §4 (do not re-create #1).

## 3. Create (or reuse) the target list

Via `crm_create_target_list`:

- **name:** `"<geography> — <criteria label> — <YYYY-MM>"` (criteria label = a short
  tag for the website criteria, e.g. "Dated WP" or "WordPress+WPBakery"; use "Redesign
  candidates" when no criteria was given).
- **description:** record the **exact build criteria** — the verticals swept, the
  website-criteria string verbatim, the geography, the requested quantity, and the
  run date — so anyone reading the list knows how it was built.

If a list with the same name already exists (`crm_list_target_lists`), reuse it.

## 4. Create the remaining targets

The §2 parity-probe is already loaded as target #1 — create targets **#2..N** here
(don't re-create #1). Via `crm_create_target`, using the mapping:

| Field | Value |
|---|---|
| `company` | business name |
| `company_website` | root URL |
| `industry` | vertical / category |
| `city` · `country` | city · state/region when broad |
| `description` | the enrichment write-up + opener hook |
| **`company_email`** | the **generic/role-based** inbox (`info@`, `contact@`, …), if found |
| **`first_name` / `last_name` / `position`** | the **specific person** found (owner/president/etc.), if any |
| **`email`** | that **person's** email (leave empty if only a generic inbox was found) |
| **`social_x` / `social_linkedin` / `social_instagram` / `social_facebook`** | the profile URLs found |
| `last_name` (fallback) | if no person was found, the model needs an identity — leave `last_name` empty for a COMPANY-type target (recent schema makes it optional); only set it to the business name if the create is rejected for a missing identity field |

`triage_status` defaults to `NEW` — do not set it.

## 5. Add the people (target contacts)

For each **named person** found on a target, also call `crm_create_target_contact`
(`target_id`, `name`, `email`, `title`, `phone`, `linkedin_url`) — this adds them to
the target's own Contacts list (`crm_Target_Contact`), the same as the target
detail "Add Contact" button.

**Why also the target person fields in §4 (important):** target conversion
(`convertTarget`) builds the new `crm_Contact` **only from the target's own person
fields** — it does **not** promote `crm_Target_Contact` rows. So set the **primary
person** on the target's `first_name`/`last_name`/`position`/`email` (§4) so they
become a real CRM Contact on conversion, **and** add them (plus any additional
people) via `crm_create_target_contact` so they show in the target's Contacts list
and are enrichable. Generic role inboxes stay on `company_email` only (not a person).

## 6. Attach all to the list

Collect the created target ids and attach them in **one** `crm_add_to_target_list`
call (`target_ids` array, plus `target_list_id`).

## 7. Dedup note

The set handed here is already net-new — it was filtered with `filterNewProspects`
(`scripts/dedupe.mjs`), which dedups on normalized **website OR company name**
against the CRM and within-batch in `SKILL.md` step 6 (name dedup catches existing
rows with a blank/different website). Do not re-load anything in the skipped list.
