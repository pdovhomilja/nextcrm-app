# Suspense Skeleton Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every spinner-based loading state in the app with skeleton components that match each route's actual UI layout.

**Architecture:** A shared `components/skeletons/` library holds one skeleton per route plus a shared `TableSkeleton`. Route-level `loading.tsx` files and inner `<Suspense fallback={...}>` boundaries import from this library. Inline form/dialog spinners are replaced with 3 pulsing `<Skeleton>` rows. Spinner source files are deleted last, after all imports are gone.

**Tech Stack:** Next.js 15 App Router, React 19, `@/components/ui/skeleton` (shadcn/ui), TypeScript 5, Tailwind CSS.

---

## File Map

**Create (new):**
- `components/skeletons/table-skeleton.tsx` — shared table skeleton used by 4+ route skeletons
- `components/skeletons/app-shell-skeleton.tsx` — full app shell for locale-level loading
- `components/skeletons/admin-skeleton.tsx`
- `components/skeletons/projects-skeleton.tsx`
- `components/skeletons/documents-skeleton.tsx`
- `components/skeletons/profile-skeleton.tsx`
- `components/skeletons/reports-skeleton.tsx`
- `components/skeletons/crm-accounts-skeleton.tsx`
- `components/skeletons/crm-table-skeleton.tsx` — shared by all CRM sub-routes
- `components/skeletons/emails-skeleton.tsx`
- `components/skeletons/search-skeleton.tsx`

**Modify (loading.tsx files):**
- `app/[locale]/loading.tsx`
- `app/[locale]/(routes)/admin/loading.tsx`
- `app/[locale]/(routes)/projects/loading.tsx`
- `app/[locale]/(routes)/documents/loading.tsx`
- `app/[locale]/(routes)/profile/loading.tsx`
- `app/[locale]/(routes)/reports/loading.tsx`
- `app/[locale]/(routes)/crm/accounts/loading.tsx`

**Modify (inner Suspense fallbacks):**
- `app/[locale]/(routes)/projects/page.tsx`
- `app/[locale]/(routes)/crm/page.tsx`
- `app/[locale]/(routes)/crm/contacts/page.tsx`
- `app/[locale]/(routes)/crm/leads/page.tsx`
- `app/[locale]/(routes)/crm/opportunities/page.tsx`
- `app/[locale]/(routes)/crm/contracts/page.tsx`
- `app/[locale]/(routes)/crm/targets/page.tsx`
- `app/[locale]/(routes)/crm/target-lists/page.tsx`
- `app/[locale]/(routes)/emails/page.tsx`
- `app/[locale]/(routes)/fulltext-search/page.tsx`

**Modify (inline spinners):**
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

**Delete (last step):**
- `components/loadings/suspense.tsx`
- `components/LoadingComponent.tsx`

---

## Task 1: Shared skeleton infrastructure

**Files:**
- Create: `components/skeletons/table-skeleton.tsx`
- Create: `components/skeletons/app-shell-skeleton.tsx`

- [ ] **Step 1: Create `table-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

const TableSkeleton = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-9 w-24" />
    </div>
    <div className="flex gap-4 py-3 border-b">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex gap-4 py-3 border-b last:border-0">
        {Array.from({ length: 5 }).map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
    <div className="flex items-center justify-end gap-2 pt-2">
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
    </div>
  </div>
);

export default TableSkeleton;
```

- [ ] **Step 2: Create `app-shell-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

const AppShellSkeleton = () => (
  <div className="flex h-screen w-full">
    <div className="w-64 border-r p-4 space-y-4 flex-shrink-0">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
    <div className="flex-1 flex flex-col">
      <div className="border-b p-4">
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="flex-1 p-8 space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  </div>
);

export default AppShellSkeleton;
```

- [ ] **Step 3: Verify TypeScript**

Run from `nextcrm-app/` directory:
```bash
pnpm tsc --noEmit
```
Expected: no errors for the new files.

- [ ] **Step 4: Commit**

```bash
git add components/skeletons/table-skeleton.tsx components/skeletons/app-shell-skeleton.tsx
git commit -m "feat: add shared TableSkeleton and AppShellSkeleton components"
```

---

## Task 2: Route skeletons — admin, projects, documents

**Files:**
- Create: `components/skeletons/admin-skeleton.tsx`
- Create: `components/skeletons/projects-skeleton.tsx`
- Create: `components/skeletons/documents-skeleton.tsx`

- [ ] **Step 1: Create `admin-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const AdminSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72 mt-2" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-9 w-32" />
    </div>
    <div className="flex flex-row flex-wrap gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="w-72">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default AdminSkeleton;
```

- [ ] **Step 2: Create `projects-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import TableSkeleton from "./table-skeleton";

const ProjectsSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72 mt-2" />
    </div>
    <div className="flex gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-28" />
      ))}
    </div>
    <Skeleton className="h-7 w-24" />
    <TableSkeleton />
  </div>
);

export default ProjectsSkeleton;
```

- [ ] **Step 3: Create `documents-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import TableSkeleton from "./table-skeleton";

const DocumentsSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72 mt-2" />
    </div>
    <div className="flex gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-32" />
      ))}
    </div>
    <TableSkeleton />
  </div>
);

export default DocumentsSkeleton;
```

- [ ] **Step 4: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/skeletons/admin-skeleton.tsx components/skeletons/projects-skeleton.tsx components/skeletons/documents-skeleton.tsx
git commit -m "feat: add AdminSkeleton, ProjectsSkeleton, DocumentsSkeleton components"
```

---

## Task 3: Route skeletons — profile, reports, CRM

**Files:**
- Create: `components/skeletons/profile-skeleton.tsx`
- Create: `components/skeletons/reports-skeleton.tsx`
- Create: `components/skeletons/crm-accounts-skeleton.tsx`
- Create: `components/skeletons/crm-table-skeleton.tsx`

- [ ] **Step 1: Create `profile-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

const ProfileSkeleton = () => (
  <div className="flex-1 space-y-6 p-8 pt-6">
    <div className="w-full h-40 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 flex items-center px-8 gap-6">
      <Skeleton className="h-20 w-20 rounded-full bg-white/30" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-40 bg-white/30" />
        <Skeleton className="h-4 w-56 bg-white/30" />
        <Skeleton className="h-5 w-20 rounded-full bg-white/30" />
      </div>
    </div>
    <div className="flex gap-6">
      <div className="w-48 space-y-1 flex-shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      <div className="flex-1 space-y-4">
        <div className="space-y-3 p-4 border rounded-lg">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-3 p-4 border rounded-lg">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  </div>
);

export default ProfileSkeleton;
```

- [ ] **Step 2: Create `reports-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const ReportsSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72 mt-2" />
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export default ReportsSkeleton;
```

- [ ] **Step 3: Create `crm-accounts-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import TableSkeleton from "./table-skeleton";

const CrmAccountsSkeleton = () => (
  <div className="flex-1 p-8 pt-6">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8" />
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <TableSkeleton />
      </CardContent>
    </Card>
  </div>
);

export default CrmAccountsSkeleton;
```

- [ ] **Step 4: Create `crm-table-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import TableSkeleton from "./table-skeleton";

const CrmTableSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72 mt-2" />
    </div>
    <TableSkeleton />
  </div>
);

export default CrmTableSkeleton;
```

- [ ] **Step 5: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/skeletons/profile-skeleton.tsx components/skeletons/reports-skeleton.tsx components/skeletons/crm-accounts-skeleton.tsx components/skeletons/crm-table-skeleton.tsx
git commit -m "feat: add ProfileSkeleton, ReportsSkeleton, CrmAccountsSkeleton, CrmTableSkeleton"
```

---

## Task 4: Route skeletons — emails, search

**Files:**
- Create: `components/skeletons/emails-skeleton.tsx`
- Create: `components/skeletons/search-skeleton.tsx`

- [ ] **Step 1: Create `emails-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

const EmailsSkeleton = () => (
  <div className="flex h-full">
    <div className="w-64 border-r flex flex-col flex-shrink-0">
      <div className="p-3 border-b">
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex-1 p-2 space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-2 space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
    <div className="flex-1 p-6 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-96" />
        <div className="flex gap-2 items-center">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  </div>
);

export default EmailsSkeleton;
```

- [ ] **Step 2: Create `search-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

const SearchSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <Skeleton className="h-10 w-full max-w-xl" />
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1 p-4 border rounded-lg">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  </div>
);

export default SearchSkeleton;
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/skeletons/emails-skeleton.tsx components/skeletons/search-skeleton.tsx
git commit -m "feat: add EmailsSkeleton and SearchSkeleton components"
```

---

## Task 5: Update route-level `loading.tsx` files

**Files:** 7 existing `loading.tsx` files.

- [ ] **Step 1: Update `app/[locale]/loading.tsx`**

Replace entire content with:
```tsx
import AppShellSkeleton from "@/components/skeletons/app-shell-skeleton";

export default function Loading() {
  return <AppShellSkeleton />;
}
```

- [ ] **Step 2: Update `app/[locale]/(routes)/admin/loading.tsx`**

Replace entire content with:
```tsx
import AdminSkeleton from "@/components/skeletons/admin-skeleton";

export default function Loading() {
  return <AdminSkeleton />;
}
```

- [ ] **Step 3: Update `app/[locale]/(routes)/projects/loading.tsx`**

Replace entire content with:
```tsx
import ProjectsSkeleton from "@/components/skeletons/projects-skeleton";

export default function Loading() {
  return <ProjectsSkeleton />;
}
```

- [ ] **Step 4: Update `app/[locale]/(routes)/documents/loading.tsx`**

Replace entire content with:
```tsx
import DocumentsSkeleton from "@/components/skeletons/documents-skeleton";

export default function Loading() {
  return <DocumentsSkeleton />;
}
```

- [ ] **Step 5: Update `app/[locale]/(routes)/profile/loading.tsx`**

Replace entire content with:
```tsx
import ProfileSkeleton from "@/components/skeletons/profile-skeleton";

export default function Loading() {
  return <ProfileSkeleton />;
}
```

- [ ] **Step 6: Update `app/[locale]/(routes)/reports/loading.tsx`**

Replace entire content with:
```tsx
import ReportsSkeleton from "@/components/skeletons/reports-skeleton";

export default function Loading() {
  return <ReportsSkeleton />;
}
```

- [ ] **Step 7: Update `app/[locale]/(routes)/crm/accounts/loading.tsx`**

Replace entire content with:
```tsx
import CrmAccountsSkeleton from "@/components/skeletons/crm-accounts-skeleton";

export default function Loading() {
  return <CrmAccountsSkeleton />;
}
```

- [ ] **Step 8: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add app/\[locale\]/loading.tsx \
  "app/[locale]/(routes)/admin/loading.tsx" \
  "app/[locale]/(routes)/projects/loading.tsx" \
  "app/[locale]/(routes)/documents/loading.tsx" \
  "app/[locale]/(routes)/profile/loading.tsx" \
  "app/[locale]/(routes)/reports/loading.tsx" \
  "app/[locale]/(routes)/crm/accounts/loading.tsx"
git commit -m "feat: replace spinner loading.tsx files with skeleton components"
```

---

## Task 6: Update inner Suspense fallbacks

**Files:** 10 page files. In each, find the `import SuspenseLoading` line and the `<SuspenseLoading />` usage inside `<Suspense fallback={...}>`, and replace both.

- [ ] **Step 1: Update `app/[locale]/(routes)/projects/page.tsx`**

Remove: `import SuspenseLoading from "@/components/loadings/suspense";`
Add: `import ProjectsSkeleton from "@/components/skeletons/projects-skeleton";`
Replace: `fallback={<SuspenseLoading />}` → `fallback={<ProjectsSkeleton />}`

- [ ] **Step 2: Update `app/[locale]/(routes)/crm/page.tsx`**

Remove: `import SuspenseLoading from "@/components/loadings/suspense";`
Add: `import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";`
Replace: `fallback={<SuspenseLoading />}` → `fallback={<CrmTableSkeleton />}`

- [ ] **Step 3: Update `app/[locale]/(routes)/crm/contacts/page.tsx`**

Remove: `import SuspenseLoading from "@/components/loadings/suspense";`
Add: `import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";`
Replace: `fallback={<SuspenseLoading />}` → `fallback={<CrmTableSkeleton />}`

- [ ] **Step 4: Update `app/[locale]/(routes)/crm/leads/page.tsx`**

Same pattern as contacts — replace import and fallback with `CrmTableSkeleton`.

- [ ] **Step 5: Update `app/[locale]/(routes)/crm/opportunities/page.tsx`**

Same pattern — replace import and fallback with `CrmTableSkeleton`.

- [ ] **Step 6: Update `app/[locale]/(routes)/crm/contracts/page.tsx`**

Same pattern — replace import and fallback with `CrmTableSkeleton`.

- [ ] **Step 7: Update `app/[locale]/(routes)/crm/targets/page.tsx`**

Same pattern — replace import and fallback with `CrmTableSkeleton`.

- [ ] **Step 8: Update `app/[locale]/(routes)/crm/target-lists/page.tsx`**

Same pattern — replace import and fallback with `CrmTableSkeleton`.

- [ ] **Step 9: Update `app/[locale]/(routes)/emails/page.tsx`**

Remove: `import SuspenseLoading from "@/components/loadings/suspense";`
Add: `import EmailsSkeleton from "@/components/skeletons/emails-skeleton";`
Replace: `fallback={<SuspenseLoading />}` → `fallback={<EmailsSkeleton />}`

- [ ] **Step 10: Update `app/[locale]/(routes)/fulltext-search/page.tsx`**

Remove: `import SuspenseLoading from "@/components/loadings/suspense";`
Add: `import SearchSkeleton from "@/components/skeletons/search-skeleton";`
Replace: `fallback={<SuspenseLoading />}` → `fallback={<SearchSkeleton />}`

- [ ] **Step 11: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 12: Commit**

```bash
git add "app/[locale]/(routes)/projects/page.tsx" \
  "app/[locale]/(routes)/crm/page.tsx" \
  "app/[locale]/(routes)/crm/contacts/page.tsx" \
  "app/[locale]/(routes)/crm/leads/page.tsx" \
  "app/[locale]/(routes)/crm/opportunities/page.tsx" \
  "app/[locale]/(routes)/crm/contracts/page.tsx" \
  "app/[locale]/(routes)/crm/targets/page.tsx" \
  "app/[locale]/(routes)/crm/target-lists/page.tsx" \
  "app/[locale]/(routes)/emails/page.tsx" \
  "app/[locale]/(routes)/fulltext-search/page.tsx"
git commit -m "feat: replace SuspenseLoading spinner with skeleton fallbacks in Suspense boundaries"
```

---

## Task 7: Replace inline form/dialog spinners

**Context:** These components conditionally render a spinner while async state is in progress (form submission, data loading in a sheet/dialog). Read each file first, locate the spinner usage, and replace with 3 skeleton rows. The replacement block to use is:

```tsx
<div className="flex flex-col gap-2 py-4">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
</div>
```

Add `import { Skeleton } from "@/components/ui/skeleton";` to the file if not already present. Remove the spinner import.

- [ ] **Step 1: Update `components/modals/loading-modal.tsx`**

Read the file. Remove `import SuspenseLoading from "../loadings/suspense";`.
Add `import { Skeleton } from "@/components/ui/skeleton";`.
Replace the `<SuspenseLoading />` inside the `<div className="flex justify-center py-6">` with:

```tsx
<div className="flex flex-col gap-2 w-full">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
</div>
```

- [ ] **Step 2: Update `app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx`**

Read the file. Locate the spinner import and conditional render. Remove the import, add `import { Skeleton } from "@/components/ui/skeleton";`. Replace the spinner render with the 3-skeleton-row block.

- [ ] **Step 3: Update `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx`**

Same approach as Step 2.

- [ ] **Step 4: Update `app/[locale]/(routes)/crm/accounts/[accountId]/components/NewTaskForm.tsx`**

Same approach. Remove `LoadingComponent` import, add `Skeleton` import, replace render.

- [ ] **Step 5: Update `app/[locale]/(routes)/projects/dialogs/NewTask.tsx`**

Same approach.

- [ ] **Step 6: Update `app/[locale]/(routes)/projects/dialogs/NewProject.tsx`**

Same approach.

- [ ] **Step 7: Update `app/[locale]/(routes)/projects/dialogs/NewSection.tsx`**

Same approach.

- [ ] **Step 8: Update `app/[locale]/(routes)/projects/dialogs/NewTaskInProject.tsx`**

Same approach.

- [ ] **Step 9: Update `app/[locale]/(routes)/projects/boards/[boardId]/components/Kanban.tsx`**

Read the file. The spinner is used during a data-loading conditional state. Replace with 3 skeleton rows.

- [ ] **Step 10: Update `app/[locale]/(auth)/sign-in/components/LoginComponent.tsx`**

Read the file. Replace the inline spinner with 3 skeleton rows.

- [ ] **Step 11: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 12: Commit**

```bash
git add components/modals/loading-modal.tsx \
  "app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx" \
  "app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx" \
  "app/[locale]/(routes)/crm/accounts/[accountId]/components/NewTaskForm.tsx" \
  "app/[locale]/(routes)/projects/dialogs/NewTask.tsx" \
  "app/[locale]/(routes)/projects/dialogs/NewProject.tsx" \
  "app/[locale]/(routes)/projects/dialogs/NewSection.tsx" \
  "app/[locale]/(routes)/projects/dialogs/NewTaskInProject.tsx" \
  "app/[locale]/(routes)/projects/boards/[boardId]/components/Kanban.tsx" \
  "app/[locale]/(auth)/sign-in/components/LoginComponent.tsx"
git commit -m "feat: replace inline spinners with skeleton rows in forms and dialogs"
```

---

## Task 8: Delete spinner files

**Prerequisite:** All previous tasks must be complete. Verify zero remaining imports before deleting.

- [ ] **Step 1: Verify no remaining imports of `SuspenseLoading`**

```bash
grep -r "loadings/suspense" app components --include="*.tsx" --include="*.ts"
```

Expected output: empty (no matches).

- [ ] **Step 2: Verify no remaining imports of `LoadingComponent`**

```bash
grep -r "LoadingComponent" app components --include="*.tsx" --include="*.ts"
```

Expected output: empty (no matches).

- [ ] **Step 3: Delete the spinner files**

Only proceed if both greps above returned empty.

```bash
rm components/loadings/suspense.tsx
rm components/LoadingComponent.tsx
```

Check if `components/loadings/` directory is now empty and can be removed:
```bash
ls components/loadings/
```
If empty:
```bash
rmdir components/loadings/
```

- [ ] **Step 4: Verify TypeScript one final time**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete SuspenseLoading and LoadingComponent spinner files"
```

---

## Verification

After all tasks are complete, start the dev server and manually verify:

```bash
pnpm dev
```

- Navigate to each route with a slow network (DevTools → Network → Slow 3G) and confirm no spinners appear — only skeleton layouts.
- Check: `/admin`, `/projects`, `/documents`, `/profile`, `/reports`, `/crm/accounts`, `/crm/contacts`, `/crm/leads`, `/crm/opportunities`, `/crm`, `/emails`, `/search`.
- Trigger a form submission on a project dialog or CRM form and confirm the skeleton rows appear instead of a spinner.
- Sign out and sign in to verify the login form shows skeleton rows during submission.
