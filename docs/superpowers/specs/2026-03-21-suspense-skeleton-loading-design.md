# Suspense Skeleton Loading — Design Spec

**Date**: 2026-03-21
**Status**: Approved

## Goal

Remove all spinner-based loading states from the app. Replace with skeleton components that match each route's actual UI layout, consistent with the pattern already used on the dashboard.

---

## Current State

**Already correct (not changed):**
- `app/[locale]/(routes)/loading.tsx` — dashboard skeleton, already uses `StatCardSkeleton` / `StorageCardSkeleton`. Leave as-is.
- `loading-box.tsx` — dashboard inner Suspense skeleton. Leave as-is.

**Spinner files to eliminate:**
- `components/loadings/suspense.tsx` — spinner (`<SuspenseLoading />`), used as Suspense fallbacks and inline in forms.
- `components/LoadingComponent.tsx` — spinner, used in `loading.tsx` files and inline in forms/dialogs.

**Spinner usages:**

*Route-level `loading.tsx` (spinner) — only these 7 files exist with spinner content:*
- `app/[locale]/loading.tsx`
- `app/[locale]/(routes)/admin/loading.tsx`
- `app/[locale]/(routes)/projects/loading.tsx`
- `app/[locale]/(routes)/documents/loading.tsx`
- `app/[locale]/(routes)/profile/loading.tsx`
- `app/[locale]/(routes)/reports/loading.tsx`
- `app/[locale]/(routes)/crm/accounts/loading.tsx`

Note: other CRM sub-routes (contacts, leads, etc.) do not have their own `loading.tsx` files — they use inner Suspense boundaries inside the page instead.

*Inner `<Suspense>` fallbacks (spinner):*
- `app/[locale]/(routes)/crm/page.tsx`
- `app/[locale]/(routes)/crm/contacts/page.tsx`
- `app/[locale]/(routes)/crm/leads/page.tsx`
- `app/[locale]/(routes)/crm/opportunities/page.tsx`
- `app/[locale]/(routes)/crm/contracts/page.tsx`
- `app/[locale]/(routes)/crm/targets/page.tsx`
- `app/[locale]/(routes)/crm/target-lists/page.tsx`
- `app/[locale]/(routes)/emails/page.tsx`
- `app/[locale]/(routes)/fulltext-search/page.tsx`
- `app/[locale]/(routes)/projects/page.tsx`

*Inline spinners in forms/dialogs (conditional render during async state):*
- `components/modals/loading-modal.tsx`
- `app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx`
- `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx`
- `app/[locale]/(routes)/crm/accounts/[accountId]/components/NewTaskForm.tsx`
- `app/[locale]/(routes)/projects/dialogs/NewTask.tsx`
- `app/[locale]/(routes)/projects/dialogs/NewProject.tsx`
- `app/[locale]/(routes)/projects/dialogs/NewSection.tsx`
- `app/[locale]/(routes)/projects/dialogs/NewTaskInProject.tsx`
- `app/[locale]/(routes)/projects/boards/[boardId]/components/Kanban.tsx`
- `app/[locale]/(auth)/sign-in/components/LoginComponent.tsx`

---

## Approach

**Route skeletons (Suspense fallbacks):** Create `components/skeletons/` with one file per route. Both `loading.tsx` and `<Suspense fallback={...}>` inside pages import from here.

**Inline form/dialog spinners:** Replace with 3 pulsing `<Skeleton>` rows. These represent async processing state (form submission, data loading in a dialog) — a skeleton-style pulse communicates "working" without a spinner. This applies to all inline uses including `LoadingModal`.

---

## New Files: Route Skeletons

### `components/skeletons/table-skeleton.tsx`
Shared sub-component for data tables:
- Toolbar: search input skeleton + button skeleton
- Header: 5 column skeletons
- 8 body rows × 5 cell skeletons
- Pagination row

### `components/skeletons/app-shell-skeleton.tsx`
For `app/[locale]/loading.tsx` (locale wrapper). Full-screen app shell:
- Left sidebar: nav logo + 8 nav item skeletons
- Main content: top bar skeleton + large content block

### `components/skeletons/admin-skeleton.tsx`
- Container header
- 2-button row
- 3 horizontal cards (title + description + field skeleton each)

### `components/skeletons/projects-skeleton.tsx`
- Container header
- 5-button row
- Section title skeleton
- `<TableSkeleton />`

### `components/skeletons/documents-skeleton.tsx`
- Container header
- 3-button row
- `<TableSkeleton />`

### `components/skeletons/profile-skeleton.tsx`
- Gradient hero: avatar circle + name + email + role badge
- Two-column layout: 4 sidebar tab skeletons + 2 form section skeletons

### `components/skeletons/reports-skeleton.tsx`
- 6 stacked cards × (title skeleton + h-72 chart area skeleton)

### `components/skeletons/crm-accounts-skeleton.tsx`
- Card header (title + button)
- Separator
- `<TableSkeleton />`

### `components/skeletons/crm-table-skeleton.tsx`
Reused by all CRM sub-routes and CRM dashboard:
- Container header
- `<TableSkeleton />`

### `components/skeletons/emails-skeleton.tsx`
Matches resizable mail client layout:
- Left panel: account header + 8 email row skeletons
- Right panel: email header skeleton + 3 paragraph skeletons

### `components/skeletons/search-skeleton.tsx`
- Search input skeleton
- 6 result item skeletons (title + description line)

---

## Files Modified

### Route-level `loading.tsx`

| File | Change |
|------|--------|
| `app/[locale]/loading.tsx` | → `<AppShellSkeleton />` |
| `app/[locale]/(routes)/admin/loading.tsx` | → `<AdminSkeleton />` |
| `app/[locale]/(routes)/projects/loading.tsx` | → `<ProjectsSkeleton />` |
| `app/[locale]/(routes)/documents/loading.tsx` | → `<DocumentsSkeleton />` |
| `app/[locale]/(routes)/profile/loading.tsx` | → `<ProfileSkeleton />` |
| `app/[locale]/(routes)/reports/loading.tsx` | → `<ReportsSkeleton />` |
| `app/[locale]/(routes)/crm/accounts/loading.tsx` | → `<CrmAccountsSkeleton />` |

### Inner Suspense fallbacks

| File | Change |
|------|--------|
| `app/[locale]/(routes)/projects/page.tsx` | `<SuspenseLoading />` → `<ProjectsSkeleton />` |
| `app/[locale]/(routes)/crm/page.tsx` | `<SuspenseLoading />` → `<CrmTableSkeleton />` |
| `app/[locale]/(routes)/crm/contacts/page.tsx` | `<SuspenseLoading />` → `<CrmTableSkeleton />` |
| `app/[locale]/(routes)/crm/leads/page.tsx` | `<SuspenseLoading />` → `<CrmTableSkeleton />` |
| `app/[locale]/(routes)/crm/opportunities/page.tsx` | `<SuspenseLoading />` → `<CrmTableSkeleton />` |
| `app/[locale]/(routes)/crm/contracts/page.tsx` | `<SuspenseLoading />` → `<CrmTableSkeleton />` |
| `app/[locale]/(routes)/crm/targets/page.tsx` | `<SuspenseLoading />` → `<CrmTableSkeleton />` |
| `app/[locale]/(routes)/crm/target-lists/page.tsx` | `<SuspenseLoading />` → `<CrmTableSkeleton />` |
| `app/[locale]/(routes)/emails/page.tsx` | `<SuspenseLoading />` → `<EmailsSkeleton />` |
| `app/[locale]/(routes)/fulltext-search/page.tsx` | `<SuspenseLoading />` → `<SearchSkeleton />` |

### Inline form/dialog spinners (replace with 3 Skeleton rows)

| File | Change |
|------|--------|
| `components/modals/loading-modal.tsx` | Replace `<SuspenseLoading />` with a centered block of 3 stacked `<Skeleton>` rows (h-4 w-full each, gap-2) inside the existing Dialog content area |
| `app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx` | Replace conditional spinner with 3 `<Skeleton>` rows |
| `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx` | Replace conditional spinner with 3 `<Skeleton>` rows |
| `app/[locale]/(routes)/crm/accounts/[accountId]/components/NewTaskForm.tsx` | Replace conditional spinner with 3 `<Skeleton>` rows |
| `app/[locale]/(routes)/projects/dialogs/NewTask.tsx` | Replace conditional spinner with 3 `<Skeleton>` rows |
| `app/[locale]/(routes)/projects/dialogs/NewProject.tsx` | Replace conditional spinner with 3 `<Skeleton>` rows |
| `app/[locale]/(routes)/projects/dialogs/NewSection.tsx` | Replace conditional spinner with 3 `<Skeleton>` rows |
| `app/[locale]/(routes)/projects/dialogs/NewTaskInProject.tsx` | Replace conditional spinner with 3 `<Skeleton>` rows |
| `app/[locale]/(routes)/projects/boards/[boardId]/components/Kanban.tsx` | Replace conditional spinner with 3 `<Skeleton>` rows |
| `app/[locale]/(auth)/sign-in/components/LoginComponent.tsx` | Replace conditional spinner with 3 `<Skeleton>` rows |

---

## Files Deleted

| File | Reason |
|------|--------|
| `components/loadings/suspense.tsx` | No longer imported anywhere |
| `components/LoadingComponent.tsx` | No longer imported anywhere |

**Safety rule:** Delete these files only after all replacements above are applied. Grep for remaining imports of both files before deleting.

---

## Skeleton Implementation Rules

- Use `<Skeleton>` from `@/components/ui/skeleton` for all skeleton elements.
- Match the real layout's spacing, grid columns, and card structure.
- No hardcoded colors — use `bg-muted` via the Skeleton component.
- Skeleton files are server components (no `"use client"`). They can be safely imported by client components.

---

## Out of Scope

- `app/[locale]/(routes)/loading.tsx` — already uses correct skeleton (dashboard). Not changed.
- `loading-box.tsx` — already uses correct skeleton. Not changed.
- Adding new Suspense boundaries beyond what already exists.
- CRM detail pages (individual record views) — separate task.
