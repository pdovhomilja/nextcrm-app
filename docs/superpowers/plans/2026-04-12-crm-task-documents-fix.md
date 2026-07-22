# CRM Task Documents Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the CRM task documents feature so read/assign/disconnect all use the correct `DocumentsToCrmAccountsTasks` junction table instead of the Projects-only `DocumentsToTasks`, and switch from broken axios API calls to server actions.

**Architecture:** CRM-dedicated server actions (`actions/crm/tasks/assign-document.ts`) write to `DocumentsToCrmAccountsTasks`. The CRM page extracts documents from `getCrMTask().documents` (already fetched via the correct junction table) instead of calling `getTaskDocuments()`. The CRM row-action components switch from `axios.post` to server actions, matching the Projects pattern.

**Tech Stack:** Next.js server actions, Prisma ORM, `DocumentsToCrmAccountsTasks` junction table, `extractDocuments` helper from `lib/junction-helpers.ts`.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `actions/crm/tasks/assign-document.ts` | Server actions: assign + disconnect document from CRM task |
| Modify | `actions/crm/account/get-task.ts` | Expand document select to include `assigned_to_user` (needed by columns-task) |
| Modify | `actions/crm/tasks/delete-task.ts` | Clean up document junction rows on CRM task deletion |
| Modify | `app/[locale]/(routes)/crm/tasks/viewtask/[taskId]/page.tsx` | Use `task.documents` via `extractDocuments` instead of `getTaskDocuments` |
| Modify | `app/[locale]/(routes)/crm/tasks/viewtask/[taskId]/components/data-table-row-actions.tsx` | Switch from axios to `assignDocumentToCrmTask` server action |
| Modify | `app/[locale]/(routes)/crm/tasks/viewtask/[taskId]/components/data-table-row-actions-tasks.tsx` | Switch from axios to `disconnectDocumentFromCrmTask` server action |
| Modify | `app/[locale]/(routes)/crm/tasks/viewtask/[taskId]/data/schema.tsx` | Uncomment `assigned_to_user` field (optional) so Zod validates it |
| Modify | `app/[locale]/(routes)/crm/tasks/viewtask/[taskId]/components/columns-task.tsx` | Remove `@ts-ignore` now that schema includes `assigned_to_user` |

---

### Task 1: Create CRM assign/disconnect server actions

**Files:**
- Create: `actions/crm/tasks/assign-document.ts`

- [ ] **Step 1: Create the server action file**

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const assignDocumentToCrmTask = async (data: {
  documentId: string;
  taskId: string;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { documentId, taskId } = data;
  if (!documentId) return { error: "Missing document ID" };
  if (!taskId) return { error: "Missing task ID" };

  try {
    const task = await prismadb.crm_Accounts_Tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return { error: "CRM task not found" };

    await prismadb.documentsToCrmAccountsTasks.create({
      data: {
        document_id: documentId,
        crm_accounts_task_id: taskId,
      },
    });

    revalidatePath("/[locale]/(routes)/crm", "page");
    return { success: true };
  } catch (error) {
    console.log("[ASSIGN_DOCUMENT_TO_CRM_TASK]", error);
    return { error: "Failed to assign document to CRM task" };
  }
};

export const disconnectDocumentFromCrmTask = async (data: {
  documentId: string;
  taskId: string;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { documentId, taskId } = data;
  if (!documentId) return { error: "Missing document ID" };
  if (!taskId) return { error: "Missing task ID" };

  try {
    const task = await prismadb.crm_Accounts_Tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return { error: "CRM task not found" };

    await prismadb.documentsToCrmAccountsTasks.delete({
      where: {
        document_id_crm_accounts_task_id: {
          document_id: documentId,
          crm_accounts_task_id: taskId,
        },
      },
    });

    revalidatePath("/[locale]/(routes)/crm", "page");
    return { success: true };
  } catch (error) {
    console.log("[DISCONNECT_DOCUMENT_FROM_CRM_TASK]", error);
    return { error: "Failed to disconnect document from CRM task" };
  }
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/pdovhomilja/development/Next.js/nextcrm-app && npx tsc --noEmit actions/crm/tasks/assign-document.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add actions/crm/tasks/assign-document.ts
git commit -m "feat(crm): add assign/disconnect document server actions for CRM tasks"
```

---

### Task 2: Expand getCrMTask document select & clean up delete-task

**Files:**
- Modify: `actions/crm/account/get-task.ts` — add `assigned_to_user` and `created_by` to document select (required by `columns-task.tsx`)
- Modify: `actions/crm/tasks/delete-task.ts` — delete document junction rows before deleting CRM task

- [ ] **Step 1: Update getCrMTask document include**

In `actions/crm/account/get-task.ts`, change the documents include block to:

```typescript
documents: {
  include: {
    document: {
      select: {
        id: true,
        document_name: true,
        document_file_url: true,
        document_file_mimeType: true,
        assigned_to_user: {
          select: {
            name: true,
          },
        },
        created_by: {
          select: {
            name: true,
          },
        },
      },
    },
  },
},
```

- [ ] **Step 2: Read delete-task.ts and add document junction cleanup**

In `actions/crm/tasks/delete-task.ts`, before deleting the task, add:

```typescript
await prismadb.documentsToCrmAccountsTasks.deleteMany({
  where: { crm_accounts_task_id: taskId },
});
```

This ensures orphaned junction rows don't remain when a CRM task is deleted. (The schema has `onDelete: Cascade` on the relation, so this is belt-and-suspenders — but explicit is better since it matches the comment cleanup pattern already in the file.)

- [ ] **Step 3: Commit**

```bash
git add actions/crm/account/get-task.ts actions/crm/tasks/delete-task.ts
git commit -m "fix(crm): expand getCrMTask document select and clean up junction on delete"
```

---

### Task 3: Update CRM task page to use task.documents instead of getTaskDocuments

**Files:**
- Modify: `app/[locale]/(routes)/crm/tasks/viewtask/[taskId]/page.tsx`

- [ ] **Step 1: Replace the import and data flow**

Remove:
```typescript
import { getTaskDocuments } from "@/actions/projects/get-task-documents";
```

Add:
```typescript
import { extractDocuments } from "@/lib/junction-helpers";
```

Replace:
```typescript
const taskDocuments: any = await getTaskDocuments(taskId);
```

With:
```typescript
const taskDocuments = extractDocuments(task?.documents ?? []);
```

The `getCrMTask` already fetches documents through `DocumentsToCrmAccountsTasks` — we just need to unwrap the junction table shape using the existing `extractDocuments` helper.

- [ ] **Step 2: Verify no remaining imports from projects module**

Run: `grep -n 'actions/projects' app/\[locale\]/\(routes\)/crm/tasks/viewtask/\[taskId\]/page.tsx`

Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/tasks/viewtask/\[taskId\]/page.tsx
git commit -m "refactor(crm): stop routing CRM task documents through the projects module"
```

---

### Task 4: Fix Zod schema and remove @ts-ignore from columns-task

**Files:**
- Modify: `app/[locale]/(routes)/crm/tasks/viewtask/[taskId]/data/schema.tsx`
- Modify: `app/[locale]/(routes)/crm/tasks/viewtask/[taskId]/components/columns-task.tsx`

- [ ] **Step 1: Uncomment assigned_to_user in Zod schema (make it optional)**

In `schema.tsx`, replace:
```typescript
export const taskSchema = z.object({
  id: z.string(),
  document_name: z.string(),
  document_file_url: z.string(),
  document_file_mimeType: z.string(),
  /*   assigned_to_user: z.object({
    name: z.string(),
  }), */
});
```

With:
```typescript
export const taskSchema = z.object({
  id: z.string(),
  document_name: z.string(),
  document_file_url: z.string(),
  document_file_mimeType: z.string(),
  assigned_to_user: z.object({
    name: z.string().nullable(),
  }).nullable().optional(),
});
```

- [ ] **Step 2: Remove @ts-ignore from columns-task.tsx**

In `columns-task.tsx`, replace:
```typescript
    cell: ({ row }) => (
      <div className="w-[150px]">
        {
          //@ts-ignore
          //TODO: fix this - must change schema but problem is if value is null now. You must change db
          row.original.assigned_to_user.name ?? "Unassigned"
        }
      </div>
    ),
```

With:
```typescript
    cell: ({ row }) => (
      <div className="w-[150px]">
        {row.original.assigned_to_user?.name ?? "Unassigned"}
      </div>
    ),
```

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/tasks/viewtask/\[taskId\]/data/schema.tsx \
       app/\[locale\]/\(routes\)/crm/tasks/viewtask/\[taskId\]/components/columns-task.tsx
git commit -m "fix(crm): uncomment assigned_to_user in task document schema and remove ts-ignore"
```

---

### Task 5: Switch CRM row actions from axios to server actions

**Files:**
- Modify: `app/[locale]/(routes)/crm/tasks/viewtask/[taskId]/components/data-table-row-actions.tsx`
- Modify: `app/[locale]/(routes)/crm/tasks/viewtask/[taskId]/components/data-table-row-actions-tasks.tsx`

- [ ] **Step 1: Update data-table-row-actions.tsx (assign)**

Replace:
```typescript
import axios from "axios";
```

With:
```typescript
import { assignDocumentToCrmTask } from "@/actions/crm/tasks/assign-document";
```

Replace the `onAssign` function body:
```typescript
const onAssign = async () => {
  setLoading(true);
  try {
    const result = await assignDocumentToCrmTask({
      documentId: document.id,
      taskId: params?.taskId as string,
    });
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Document was assigned to task");
    }
  } catch (error) {
    console.error(error);
    toast.error("Something went wrong, while assigning document to task");
  } finally {
    router.refresh();
    setLoading(false);
  }
};
```

Note: also fix `toast.success` -> `toast.error` for error cases (pre-existing bug in original code).

- [ ] **Step 2: Update data-table-row-actions-tasks.tsx (disconnect)**

Replace:
```typescript
import axios from "axios";
```

With:
```typescript
import { disconnectDocumentFromCrmTask } from "@/actions/crm/tasks/assign-document";
```

Replace the `onDisconnect` function body:
```typescript
const onDisconnect = async () => {
  setLoading(true);
  try {
    const result = await disconnectDocumentFromCrmTask({
      documentId: document.id,
      taskId: params?.taskId as string,
    });
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Document was disconnected from task");
    }
  } catch (error) {
    console.error(error);
    toast.error("Something went wrong, while disconnecting document from task");
  } finally {
    router.refresh();
    setLoading(false);
  }
};
```

- [ ] **Step 3: Verify no remaining axios imports in CRM task view components**

Run: `grep -rn 'axios\|/api/projects' app/\[locale\]/\(routes\)/crm/tasks/viewtask/`

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/tasks/viewtask/\[taskId\]/components/data-table-row-actions.tsx \
       app/\[locale\]/\(routes\)/crm/tasks/viewtask/\[taskId\]/components/data-table-row-actions-tasks.tsx
git commit -m "fix(crm): switch CRM task document actions from broken axios calls to server actions"
```

---

### Task 6: Build verification

- [ ] **Step 1: Run TypeScript check**

Run: `cd /Users/pdovhomilja/development/Next.js/nextcrm-app && pnpm build 2>&1 | tail -30`

Expected: build succeeds with no errors in the modified files.

- [ ] **Step 2: Manual smoke test**

1. Navigate to a CRM task view page (e.g. via CRM > Accounts > [account] > Tasks > [task])
2. Verify "Task documents" section shows documents linked via CRM junction table (was empty before)
3. Click "Connect to task" on an available document — verify it appears in task documents
4. Click "Disconnect from task" — verify it disappears
5. Navigate to Documents module — verify the document still appears there (single storage)

- [ ] **Step 3: Final commit if any fixups needed**
