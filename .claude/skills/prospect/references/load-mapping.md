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

Guard against it: create the **first** target with `company_website` set, then read
the returned record. **If `company_website` came back `null`, the fields are being
stripped — ABORT THE LOAD.** Tell the user to re-run `/prospect` in a session
started after the parity deploy (or import the CSV via the app), delete the stray
first target (`crm_delete_target`), and stop. Do not create the rest.

## 3. Create (or reuse) the target list

Via `crm_create_target_list`:

- **name:** `"<geography> — <criteria label> — <YYYY-MM>"` (criteria label = a short
  tag for the website criteria, e.g. "Dated WP" or "WordPress+WPBakery"; use "Redesign
  candidates" when no criteria was given).
- **description:** record the **exact build criteria** — the verticals swept, the
  website-criteria string verbatim, the geography, the requested quantity, and the
  run date — so anyone reading the list knows how it was built.

If a list with the same name already exists (`crm_list_target_lists`), reuse it.

## 4. Create each target

Via `crm_create_target`, using the mapping:

| Field | Value |
|---|---|
| `company` | business name |
| `last_name` | business name (the model requires last_name) |
| `company_website` | root URL |
| `industry` | vertical / category |
| `city` | city · `country` = region/country when broad |
| `email` (and/or `company_email`) | contact email found |
| `description` | the enrichment write-up + opener hook |

`triage_status` defaults to `NEW` — do not set it.

## 5. Attach all to the list

Collect the created target ids and attach them in **one** `crm_add_to_target_list`
call (`target_ids` array, plus `target_list_id`).

## 6. Dedup note

The set handed here is already net-new — it was filtered with `filterNewByWebsite`
(`scripts/dedupe.mjs`) against the CRM and within-batch in `SKILL.md` step 6. Do not
re-load anything in the skipped list.
