# Permission-Driven Authorization — Phase E2 (Campaigns + Templates) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Close the campaign-action audit findings: all 8 campaign actions are currently unguarded (or only have a nullable session check). Add `requireAuthenticated` + role-aware send/schedule gating + creator-or-manager-or-admin mutation rules.

**Campaign delivery policy decision (spec §15.3):** This plan applies the spec's recommended default — **send/schedule operations are manager/admin only** (they trigger external email delivery and consume quota). Users can create/update/delete their own draft campaigns and templates. If the product owner wants users to send their own campaigns, swap the role check on `schedule-campaign.ts` and `send-campaign-now.ts` for ownership-only gating.

**Architecture:**
1. New helpers in `lib/authz/scopes/crm.ts`: `campaignReadScopeWhere`, `campaignTemplateReadScopeWhere`, `assertCanReadCampaign`, `assertCanWriteCampaign`, `assertCanReadTemplate`, `assertCanWriteTemplate`. All use the same shape as target-list (creator-only for users; bare for manager/admin).
2. Reads (`get-campaign`, `get-campaigns`, `get-template`, `get-templates`) → scope by role.
3. Mutations (`create/update/delete/pause-campaign`, template create/update/delete, `generate-template`) → ownership-or-privileged.
4. Send/schedule (`schedule-campaign`, `send-campaign-now`) → manager/admin only.
5. **Critical fix:** `create-campaign.ts` currently sets `created_by: session?.user?.id ?? null` — **fail-closed** so unauthenticated calls reject and `created_by` is never null.

**Spec source:** §6.9 (Campaigns), §8.11, §12 Phase 5.
**Audit source:** "Critical: Campaign Actions Without Session Checks", "Critical: Unauthenticated Campaign Creation".

**Depends on:** D-phase merged.

---

## File Structure

**New tests:** one per action (~14 files) under `actions/campaigns/__tests__/` and `actions/campaigns/templates/__tests__/`.

**Modified:**
- `lib/authz/scopes/crm.ts` — 6 new helpers
- `lib/authz/index.ts`
- `actions/campaigns/{create,update,delete,pause,schedule,send-campaign-now,get-campaign,get-campaigns}-campaign*.ts`
- `actions/campaigns/templates/{create,update,delete,generate,get-template,get-templates}.ts`

---

## Task 1: Campaign + template scope helpers

**Files:**
- Modify: `lib/authz/scopes/crm.ts`
- Create: `lib/authz/__tests__/scopes-crm-campaign-read.test.ts`

```ts
// crm_campaigns has soft-delete via status="deleted" (not deletedAt). Use status filter.
export function campaignReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { status: { not: "deleted" } };
  }
  return { status: { not: "deleted" }, created_by: user.id };
}

// crm_campaign_templates has deletedAt soft-delete.
export function campaignTemplateReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return { deletedAt: null, created_by: user.id };
}

export async function assertCanReadCampaign(user: AuthzUser, id: string) {
  const row = await prismadb.crm_campaigns.findFirst({
    where: { id, ...campaignReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteCampaign(user: AuthzUser, id: string) {
  // Same as read for now — campaigns aren't shared cross-user.
  // Manager/admin override applies in helpers.
  return assertCanReadCampaign(user, id);
}

export async function assertCanReadTemplate(user: AuthzUser, id: string) {
  const row = await prismadb.crm_campaign_templates.findFirst({
    where: { id, ...campaignTemplateReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteTemplate(user: AuthzUser, id: string) {
  return assertCanReadTemplate(user, id);
}
```

- [ ] Test (admin/manager/user shape per helper, 200/404 on each assert), implement, barrel export, commit:

```bash
git commit -m "feat(authz): add campaign and template read/write scope helpers"
```

---

## Task 2: Campaign read actions

**Files:** `actions/campaigns/get-campaign.ts`, `get-campaigns.ts`.

- [ ] Test files (`actions/campaigns/__tests__/`): 4 cases per file (401, out-of-scope, in-scope user, manager).
- [ ] Patch:
  - `get-campaigns.ts`: `requireAuthenticated` + spread `campaignReadScopeWhere(user)` into existing where (replace existing `status: { not: "deleted" }` since the helper includes it).
  - `get-campaign.ts`: `requireAuthenticated` + `assertCanReadCampaign(user, id)` → existing detail query.
- [ ] Commit: `fix(campaigns): scope campaign reads by role`

---

## Task 3: Campaign mutation actions (creator-or-privileged)

**Files:** `create-campaign.ts`, `update-campaign.ts`, `delete-campaign.ts`, `pause-campaign.ts`.

For `create-campaign.ts`:
- **Critical:** require auth, fail-closed. `created_by: user.id` (never null).
- Validate `target_list_ids` and `template_id` are readable by the user (use `assertCanReadTemplate` + a bulk filter on target lists — could use `targetListReadScopeWhere` + `findMany` to check).

For `update/delete/pause-campaign.ts`:
- `requireAuthenticated` + `assertCanWriteCampaign(user, id)` → existing mutation.

- [ ] Test files (4 per action), patch, commit:

```bash
git commit -m "fix(campaigns): require auth + ownership on create/update/delete/pause"
```

---

## Task 4: Schedule + send-now (manager/admin only)

**Files:** `schedule-campaign.ts`, `send-campaign-now.ts`.

These trigger external email delivery → manager/admin only per spec §15.3 default. After role check, also verify the campaign is readable (defense in depth) and not already in a terminal state (existing logic).

- [ ] Test files: 4 cases (401, user → forbidden, manager → success, admin → success).
- [ ] Patch:
  ```ts
  let user;
  try { user = await requireRole(["manager", "admin"]); }
  catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
  try { await assertCanReadCampaign(user, id); }
  catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not found" };
    throw e;
  }
  // existing schedule/send logic
  ```
- [ ] Commit: `fix(campaigns): require manager/admin role on schedule and send-now`

---

## Task 5: Template actions

**Files:**
- Reads: `get-template.ts`, `get-templates.ts` — same pattern as Task 2 with `campaignTemplateReadScopeWhere` / `assertCanReadTemplate`.
- Mutations: `create-template.ts` (fail-closed auth + `created_by = user.id`), `update-template.ts` + `delete-template.ts` (`assertCanWriteTemplate`).
- `generate-template.ts` (AI generation, also a write op): `requireAuthenticated` (any role can generate templates for themselves; `created_by = user.id`).

- [ ] Test files (4 per action), patch, commit:

```bash
git commit -m "fix(campaign-templates): scope template reads/mutations by role and ownership"
```

---

## Task 6: Verification + PR

- [ ] **Step 1**: Full suite + grep:
  ```bash
  grep -rn "session?.user?.id ?? null\|created_by: null" actions/campaigns/ --include="*.ts" | head
  ```
  Expected: empty.

- [ ] **Step 2**: Manual checklist:
  - As `bob` (user), `sendCampaignNow(<id>)` → forbidden
  - As `bob`, `createCampaign` → succeeds with `created_by = bob.id`, never null
  - As `bob`, `updateCampaign(<alice-campaign>)` → not-found
  - As `manager`, all the above → succeed
  - As `bob`, `getCampaigns()` → only `bob`'s campaigns

- [ ] **Step 3**: Push + PR:
  ```bash
  gh pr create --base dev --head feat/authz-phase-e2 --title "fix(security): scope campaigns + templates (Phase E2)"
  ```

---

## Acceptance Criteria

- No campaign or template action accepts an unauthenticated session.
- `created_by` is never null for newly created campaigns or templates.
- `schedule-campaign` and `send-campaign-now` reject `user` role with 403.
- `update/delete/pause-campaign` reject non-creator non-manager-non-admin attempts.
- Read actions filter by ownership for users; bare for manager/admin.

## Out of E2 scope

- **E3**: documents
- **E4**: projects
- Inngest worker hardening (workers still trust `triggeredBy` from event payload — separate pass)
- Campaign-target-list scope validation on create-campaign — basic check covered (target lists must be readable), but composite restrictions (e.g., user can only attach lists they own) should be re-confirmed in B1's bulk-id filter pattern. Plan default: assert `targetListReadScopeWhere` against the input list IDs.
