# Manual testing — Target Lists UX & active-list filter

Covers the Target Lists page controls and the Targets "List" filter. Each step
has a matching Playwright spec (parity is bidirectional — keep them in sync).

## 1. Target Lists page

**E2E:** `tests/e2e/target-lists.spec.ts`

1. Open **Campaigns → Target Lists**.
2. **Created by** — a "Created by" column is shown; a list you created shows your
   name (or `—` if your profile has no name set).
3. **Row click** — click anywhere on a list row (not the ⋯ menu). It opens that
   list's detail page and shows the list name.
4. **Activate / Deactivate** — open a row's ⋯ menu. On an **Active** list it reads
   **Deactivate**; click it → success toast, and the row's Status flips to
   **Inactive** and the menu now reads **Activate**. Click **Activate** → back to
   **Active**.

## 2. Targets — filter by active list

**E2E:** `tests/e2e/targets-list-filter.spec.ts`

1. Have at least one **active** list with a target in it, and (to see the
   exclusion) an **inactive** list with a target in it.
2. Open **Campaigns → Targets** and open the **List** filter (next to
   Triage/Type/Industry).
3. **Verify:** the **active** list appears as an option; the **inactive** list
   does **not** (only active lists are offered).
4. Select the active list.
5. **Verify:** the table shows only targets in that list — targets in no list, or
   only in an inactive list, drop out.
