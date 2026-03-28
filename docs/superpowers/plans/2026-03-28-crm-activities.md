# CRM Activities (Communication History) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete activity log (Calls, Meetings, Notes, Emails) to the NextCRM sales module, linked to all 5 CRM entities, with inline feeds on every entity detail page.

**Architecture:** Single `crm_Activities` table + `crm_ActivityLinks` junction table. Mutations go through server actions using `prismadb.$transaction`. UI follows the established Sheet-form pattern (TasksView) and cursor-paginated feed pattern (AuditTimeline).

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma ORM, PostgreSQL, shadcn/ui (Card, Sheet, Badge, Button, AlertDialog, Select, Textarea), date-fns (`formatDistanceToNow`), Lucide icons, next-auth v4, Sonner toasts.

---

## File Structure

**New files:**
```
actions/crm/activities/
  create-activity.ts
  update-activity.ts
  delete-activity.ts
  get-activities-by-entity.ts

components/crm/activities/
  ActivityEntry.tsx
  ActivityForm.tsx
  ActivitiesView.tsx

app/[locale]/(routes)/crm/accounts/[accountId]/components/
  ActivitiesSection.tsx

app/[locale]/(routes)/crm/contacts/[contactId]/components/
  ActivitiesSection.tsx

app/[locale]/(routes)/crm/leads/[leadId]/components/
  ActivitiesSection.tsx

app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/
  ActivitiesSection.tsx

app/[locale]/(routes)/crm/contracts/[contractId]/components/
  ActivitiesSection.tsx
```

**Modified files:**
```
prisma/schema.prisma                                           — new enums, models, Users relations
app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx       — add <ActivitiesSection>
app/[locale]/(routes)/crm/contacts/[contactId]/page.tsx       — add <ActivitiesSection>
app/[locale]/(routes)/crm/leads/[leadId]/page.tsx             — add <ActivitiesSection>
app/[locale]/(routes)/crm/opportunities/[opportunityId]/page.tsx — add <ActivitiesSection>
app/[locale]/(routes)/crm/contracts/[contractId]/page.tsx     — add <ActivitiesSection>
```

---

## Task 1: Database Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and models to schema**

Open `prisma/schema.prisma`. Add the following block BEFORE the `Users` model definition (or at the end of the CRM model section — after `crm_Contracts`):

```prisma
enum crm_Activity_Type {
  call
  meeting
  note
  email
}

enum crm_Activity_Status {
  scheduled
  completed
  cancelled
}

model crm_Activities {
  id          String               @id @default(uuid()) @db.Uuid
  type        crm_Activity_Type
  title       String
  description String?
  date        DateTime
  duration    Int?
  outcome     String?
  status      crm_Activity_Status  @default(scheduled)
  metadata    Json?                @db.JsonB
  createdBy   String?              @db.Uuid
  updatedBy   String?              @db.Uuid
  createdAt   DateTime             @default(now())
  updatedAt   DateTime?            @updatedAt

  created_by_user Users?              @relation("activity_created_by", fields: [createdBy], references: [id])
  updated_by_user Users?              @relation("activity_updated_by", fields: [updatedBy], references: [id])
  links       crm_ActivityLinks[]

  @@index([date])
  @@index([type])
  @@index([status])
  @@index([createdBy])
  @@index([createdAt])
}

model crm_ActivityLinks {
  id         String          @id @default(uuid()) @db.Uuid
  activityId String          @db.Uuid
  entityType String
  entityId   String          @db.Uuid

  activity crm_Activities @relation(fields: [activityId], references: [id], onDelete: Cascade)

  @@index([activityId])
  @@index([entityType, entityId])
  @@index([entityType, entityId, activityId])
}
```

- [ ] **Step 2: Add reverse relations to Users model**

Find the `Users` model in `prisma/schema.prisma`. Add these two lines inside it (after the existing relations):

```prisma
  activities_created crm_Activities[] @relation("activity_created_by")
  activities_updated crm_Activities[] @relation("activity_updated_by")
```

- [ ] **Step 3: Push schema and regenerate client**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
npx prisma db push
npx prisma generate
```

Expected: No errors. Both new tables visible in DB.

- [ ] **Step 4: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: 0 errors (or only pre-existing unrelated errors).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add crm_Activities and crm_ActivityLinks schema"
```

---

## Task 2: Server Actions — Mutations

**Files:**
- Create: `actions/crm/activities/create-activity.ts`
- Create: `actions/crm/activities/update-activity.ts`
- Create: `actions/crm/activities/delete-activity.ts`

- [ ] **Step 1: Create `create-activity.ts`**

```typescript
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const createActivity = async (data: {
  type: "call" | "meeting" | "note" | "email";
  title: string;
  description?: string;
  date: Date;
  duration?: number;
  outcome?: string;
  status: "scheduled" | "completed" | "cancelled";
  metadata?: Record<string, unknown>;
  links: Array<{ entityType: string; entityId: string }>;
}) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const activity = await prismadb.$transaction(async (tx) => {
      const created = await tx.crm_Activities.create({
        data: {
          type: data.type,
          title: data.title,
          description: data.description,
          date: data.date,
          duration: data.duration,
          outcome: data.outcome,
          status: data.status,
          metadata: data.metadata,
          createdBy: session.user.id,
        },
      });

      if (data.links.length > 0) {
        await tx.crm_ActivityLinks.createMany({
          data: data.links.map((link) => ({
            activityId: created.id,
            entityType: link.entityType,
            entityId: link.entityId,
          })),
        });
      }

      return created;
    });

    for (const link of data.links) {
      revalidatePath(`/[locale]/(routes)/crm/${link.entityType}s/${link.entityId}`, "page");
    }

    return { data: activity };
  } catch (error) {
    console.error("createActivity error:", error);
    return { error: "Failed to create activity" };
  }
};
```

- [ ] **Step 2: Create `update-activity.ts`**

```typescript
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const updateActivity = async (data: {
  id: string;
  title?: string;
  description?: string;
  date?: Date;
  duration?: number;
  outcome?: string;
  status?: "scheduled" | "completed" | "cancelled";
  metadata?: Record<string, unknown>;
  links?: Array<{ entityType: string; entityId: string }>;
}) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    // Fetch current links before update for revalidation
    const existingLinks = await prismadb.crm_ActivityLinks.findMany({
      where: { activityId: data.id },
    });

    const activity = await prismadb.$transaction(async (tx) => {
      const updated = await tx.crm_Activities.update({
        where: { id: data.id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.duration !== undefined && { duration: data.duration }),
          ...(data.outcome !== undefined && { outcome: data.outcome }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.metadata !== undefined && { metadata: data.metadata }),
          updatedBy: session.user.id,
        },
      });

      if (data.links !== undefined) {
        await tx.crm_ActivityLinks.deleteMany({ where: { activityId: data.id } });
        if (data.links.length > 0) {
          await tx.crm_ActivityLinks.createMany({
            data: data.links.map((link) => ({
              activityId: data.id,
              entityType: link.entityType,
              entityId: link.entityId,
            })),
          });
        }
      }

      return updated;
    });

    // Revalidate all affected entity pages (old + new links)
    const allLinks = [
      ...existingLinks,
      ...(data.links ?? []).map((l) => ({ entityType: l.entityType, entityId: l.entityId })),
    ];
    const seen = new Set<string>();
    for (const link of allLinks) {
      const key = `${link.entityType}:${link.entityId}`;
      if (!seen.has(key)) {
        seen.add(key);
        revalidatePath(`/[locale]/(routes)/crm/${link.entityType}s/${link.entityId}`, "page");
      }
    }

    return { data: activity };
  } catch (error) {
    console.error("updateActivity error:", error);
    return { error: "Failed to update activity" };
  }
};
```

- [ ] **Step 3: Create `delete-activity.ts`**

```typescript
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteActivity = async (activityId: string) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    // Fetch links BEFORE deleting so we can revalidate after cascade
    const links = await prismadb.crm_ActivityLinks.findMany({
      where: { activityId },
    });

    await prismadb.crm_Activities.delete({ where: { id: activityId } });

    // Links are cascade-deleted by DB; now revalidate captured pages
    for (const link of links) {
      revalidatePath(`/[locale]/(routes)/crm/${link.entityType}s/${link.entityId}`, "page");
    }

    return { success: true };
  } catch (error) {
    console.error("deleteActivity error:", error);
    return { error: "Failed to delete activity" };
  }
};
```

- [ ] **Step 4: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add actions/crm/activities/
git commit -m "feat: add create/update/delete activity server actions"
```

---

## Task 3: Fetch Action — getActivitiesByEntity

**Files:**
- Create: `actions/crm/activities/get-activities-by-entity.ts`

- [ ] **Step 1: Create the fetch action**

```typescript
"use server";
import { prismadb } from "@/lib/prisma";

const PAGE_SIZE = 25;

export type ActivityWithLinks = {
  id: string;
  type: "call" | "meeting" | "note" | "email";
  title: string;
  description: string | null;
  date: Date;
  duration: number | null;
  outcome: string | null;
  status: "scheduled" | "completed" | "cancelled";
  metadata: unknown;
  createdAt: Date;
  createdBy: string | null;
  created_by_user: { id: string; name: string | null; avatar: string | null } | null;
  links: Array<{ id: string; entityType: string; entityId: string }>;
};

export type ActivityCursor = { date: string; id: string };

export const getActivitiesByEntity = async (
  entityType: string,
  entityId: string,
  cursor?: ActivityCursor
): Promise<{ data: ActivityWithLinks[]; nextCursor: ActivityCursor | null }> => {
  try {
    // Use `as any` for both models — same pattern as crm_AuditLog throughout the codebase
    // (Prisma client cache may not include new models until IDE restarts)
    const links = await (prismadb as any).crm_ActivityLinks.findMany({
      where: { entityType, entityId },
      select: { activityId: true },
    });

    const activityIds = (links as Array<{ activityId: string }>).map((l) => l.activityId);

    if (activityIds.length === 0) {
      return { data: [], nextCursor: null };
    }

    const where: Record<string, unknown> = { id: { in: activityIds } };

    if (cursor) {
      where.OR = [
        { date: { lt: new Date(cursor.date) } },
        { date: new Date(cursor.date), id: { lt: cursor.id } },
      ];
    }

    const activities = await (prismadb as any).crm_Activities.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      include: {
        created_by_user: { select: { id: true, name: true, avatar: true } },
        links: { select: { id: true, entityType: true, entityId: true } },
      },
    });

    const nextCursor =
      activities.length < PAGE_SIZE
        ? null
        : {
            date: activities[activities.length - 1].date.toISOString(),
            id: activities[activities.length - 1].id,
          };

    return { data: activities as ActivityWithLinks[], nextCursor };
  } catch (error) {
    console.error("getActivitiesByEntity error:", error);
    return { data: [], nextCursor: null };
  }
};
```

- [ ] **Step 2: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add actions/crm/activities/get-activities-by-entity.ts
git commit -m "feat: add getActivitiesByEntity fetch action with compound cursor pagination"
```

---

## Task 4: ActivityEntry Component

**Files:**
- Create: `components/crm/activities/ActivityEntry.tsx`

- [ ] **Step 1: Create ActivityForm stub** (required so tsc doesn't fail on the import below)

```typescript
// components/crm/activities/ActivityForm.tsx
"use client";
export function ActivityForm(_props: any) { return null; }
```

This stub is replaced in full in Task 5.

- [ ] **Step 2: Create the ActivityEntry component**

```typescript
"use client";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Phone, Users, FileText, Mail, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteActivity } from "@/actions/crm/activities/delete-activity";
import { ActivityForm } from "./ActivityForm";
import type { ActivityWithLinks } from "@/actions/crm/activities/get-activities-by-entity";

const TYPE_ICONS = {
  call: Phone,
  meeting: Users,
  note: FileText,
  email: Mail,
} as const;

const TYPE_LABELS = {
  call: "Call",
  meeting: "Meeting",
  note: "Note",
  email: "Email",
} as const;

const STATUS_VARIANTS = {
  scheduled: "outline",
  completed: "default",
  cancelled: "secondary",
} as const;

interface Props {
  activity: ActivityWithLinks;
  onDeleted: (id: string) => void;
  onUpdated: (activity: ActivityWithLinks) => void;
  entityType: string;
  entityId: string;
}

export function ActivityEntry({ activity, onDeleted, onUpdated, entityType, entityId }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const Icon = TYPE_ICONS[activity.type];

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteActivity(activity.id);
    setDeleting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Activity deleted");
      onDeleted(activity.id);
    }
  };

  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      <div className="mt-1 flex-shrink-0 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{activity.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {TYPE_LABELS[activity.type]}
              </Badge>
              <Badge variant={STATUS_VARIANTS[activity.status]} className="text-xs">
                {activity.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-default">
                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {new Date(activity.date).toLocaleString()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={deleting}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete activity?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{activity.title}&rdquo;. This action cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {activity.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {activity.description}
          </p>
        )}
        {activity.outcome && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Outcome:</span> {activity.outcome}
          </p>
        )}
      </div>

      <ActivityForm
        open={editOpen}
        onOpenChange={setEditOpen}
        entityType={entityType}
        entityId={entityId}
        activity={activity}
        onSaved={onUpdated}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 4: Commit**

```bash
git add components/crm/activities/ActivityForm.tsx components/crm/activities/ActivityEntry.tsx
git commit -m "feat: add ActivityEntry component (with ActivityForm stub)"
```

---

## Task 5: ActivityForm Component

**Files:**
- Create: `components/crm/activities/ActivityForm.tsx`

Follow the Sheet pattern from `app/[locale]/(routes)/crm/accounts/[accountId]/components/TasksView.tsx`.

- [ ] **Step 1: Create the form component**

```typescript
"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { updateActivity } from "@/actions/crm/activities/update-activity";
import type { ActivityWithLinks } from "@/actions/crm/activities/get-activities-by-entity";

type ActivityType = "call" | "meeting" | "note" | "email";
type ActivityStatus = "scheduled" | "completed" | "cancelled";

const DEFAULT_STATUS: Record<ActivityType, ActivityStatus> = {
  call: "scheduled",
  meeting: "scheduled",
  note: "completed",
  email: "completed",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityId: string;
  activity?: ActivityWithLinks; // if provided: edit mode
  onSaved: (activity: ActivityWithLinks) => void;
}

export function ActivityForm({ open, onOpenChange, entityType, entityId, activity, onSaved }: Props) {
  const isEdit = !!activity;

  const [type, setType] = useState<ActivityType>(activity?.type ?? "call");
  const [title, setTitle] = useState(activity?.title ?? "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [date, setDate] = useState(
    activity ? new Date(activity.date).toISOString().slice(0, 16) : ""
  );
  const [status, setStatus] = useState<ActivityStatus>(activity?.status ?? "scheduled");
  const [duration, setDuration] = useState(activity?.duration?.toString() ?? "");
  const [outcome, setOutcome] = useState(activity?.outcome ?? "");
  const [emailSubject, setEmailSubject] = useState(
    (activity?.metadata as Record<string, string> | null)?.subject ?? ""
  );
  const [saving, setSaving] = useState(false);

  // Auto-set status when type changes (only in create mode)
  useEffect(() => {
    if (!isEdit) {
      setStatus(DEFAULT_STATUS[type]);
    }
  }, [type, isEdit]);

  const showDuration = type === "call" || type === "meeting";
  const showOutcome = type === "call" || type === "meeting";
  const showEmailSubject = type === "email";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!date) {
      toast.error("Date is required");
      return;
    }

    setSaving(true);

    const metadata: Record<string, unknown> = {};
    if (showEmailSubject && emailSubject) metadata.subject = emailSubject;

    const payload = {
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      date: new Date(date),
      duration: showDuration && duration ? parseInt(duration, 10) : undefined,
      outcome: showOutcome && outcome.trim() ? outcome.trim() : undefined,
      status,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      links: [{ entityType, entityId }],
    };

    let result: { data?: ActivityWithLinks; error?: string };

    if (isEdit) {
      result = await updateActivity({ id: activity.id, ...payload });
    } else {
      result = await createActivity(payload);
    }

    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      toast.success(isEdit ? "Activity updated" : "Activity logged");
      onSaved(result.data as ActivityWithLinks);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Activity" : "Log Activity"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1">
            <Label htmlFor="activity-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
              <SelectTrigger id="activity-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="activity-title">Title *</Label>
            <Input
              id="activity-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="activity-date">Date & Time *</Label>
            <Input
              id="activity-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="activity-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ActivityStatus)}>
              <SelectTrigger id="activity-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showDuration && (
            <div className="space-y-1">
              <Label htmlFor="activity-duration">Duration (minutes)</Label>
              <Input
                id="activity-duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
          )}

          {showOutcome && (
            <div className="space-y-1">
              <Label htmlFor="activity-outcome">Outcome</Label>
              <Input
                id="activity-outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Result of the call / meeting"
              />
            </div>
          )}

          {showEmailSubject && (
            <div className="space-y-1">
              <Label htmlFor="activity-email-subject">Email Subject</Label>
              <Input
                id="activity-email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject line"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="activity-description">Notes</Label>
            <Textarea
              id="activity-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Log activity"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add components/crm/activities/ActivityForm.tsx
git commit -m "feat: add ActivityForm Sheet component"
```

---

## Task 6: ActivitiesView Component

**Files:**
- Create: `components/crm/activities/ActivitiesView.tsx`

Follow the cursor-pagination pattern from `components/crm/audit-log/Timeline.tsx`.

- [ ] **Step 1: Create the component**

```typescript
"use client";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivityEntry } from "./ActivityEntry";
import { ActivityForm } from "./ActivityForm";
import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import type {
  ActivityWithLinks,
  ActivityCursor,
} from "@/actions/crm/activities/get-activities-by-entity";

interface Props {
  entityType: string;
  entityId: string;
  initialData: { data: ActivityWithLinks[]; nextCursor: ActivityCursor | null };
}

export function ActivitiesView({ entityType, entityId, initialData }: Props) {
  const [activities, setActivities] = useState<ActivityWithLinks[]>(initialData.data);
  const [cursor, setCursor] = useState<ActivityCursor | null>(initialData.nextCursor);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    if (!cursor) return;
    startTransition(async () => {
      const result = await getActivitiesByEntity(entityType, entityId, cursor);
      setActivities((prev) => [...prev, ...result.data]);
      setCursor(result.nextCursor);
    });
  };

  const handleCreated = (activity: ActivityWithLinks) => {
    setActivities((prev) => [activity, ...prev]);
  };

  const handleUpdated = (updated: ActivityWithLinks) => {
    setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDeleted = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base">Activities</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Log activity
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No activities yet. Log a call, meeting, or note.
          </p>
        ) : (
          <>
            {activities.map((activity) => (
              <ActivityEntry
                key={activity.id}
                activity={activity}
                entityType={entityType}
                entityId={entityId}
                onDeleted={handleDeleted}
                onUpdated={handleUpdated}
              />
            ))}
            {cursor && (
              <div className="flex justify-center pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={isPending}
                >
                  {isPending ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      <ActivityForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        entityType={entityType}
        entityId={entityId}
        onSaved={handleCreated}
      />
    </Card>
  );
}
```

- [ ] **Step 2: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add components/crm/activities/ActivitiesView.tsx
git commit -m "feat: add ActivitiesView paginated feed component"
```

---

## Task 7: ActivitiesSection Wrappers + Wire into Entity Detail Pages

**Files:**
- Create 5 × `ActivitiesSection.tsx` (one per entity)
- Modify 5 × entity `page.tsx`

- [ ] **Step 1: Create ActivitiesSection for accounts**

```typescript
// app/[locale]/(routes)/crm/accounts/[accountId]/components/ActivitiesSection.tsx
import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { ActivitiesView } from "@/components/crm/activities/ActivitiesView";

interface Props {
  accountId: string;
}

export async function ActivitiesSection({ accountId }: Props) {
  const initialData = await getActivitiesByEntity("account", accountId);
  return (
    <ActivitiesView entityType="account" entityId={accountId} initialData={initialData} />
  );
}
```

- [ ] **Step 2: Create ActivitiesSection for contacts**

```typescript
// app/[locale]/(routes)/crm/contacts/[contactId]/components/ActivitiesSection.tsx
import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { ActivitiesView } from "@/components/crm/activities/ActivitiesView";

interface Props {
  contactId: string;
}

export async function ActivitiesSection({ contactId }: Props) {
  const initialData = await getActivitiesByEntity("contact", contactId);
  return (
    <ActivitiesView entityType="contact" entityId={contactId} initialData={initialData} />
  );
}
```

- [ ] **Step 3: Create ActivitiesSection for leads**

```typescript
// app/[locale]/(routes)/crm/leads/[leadId]/components/ActivitiesSection.tsx
import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { ActivitiesView } from "@/components/crm/activities/ActivitiesView";

interface Props {
  leadId: string;
}

export async function ActivitiesSection({ leadId }: Props) {
  const initialData = await getActivitiesByEntity("lead", leadId);
  return (
    <ActivitiesView entityType="lead" entityId={leadId} initialData={initialData} />
  );
}
```

- [ ] **Step 4: Create ActivitiesSection for opportunities**

```typescript
// app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/ActivitiesSection.tsx
import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { ActivitiesView } from "@/components/crm/activities/ActivitiesView";

interface Props {
  opportunityId: string;
}

export async function ActivitiesSection({ opportunityId }: Props) {
  const initialData = await getActivitiesByEntity("opportunity", opportunityId);
  return (
    <ActivitiesView entityType="opportunity" entityId={opportunityId} initialData={initialData} />
  );
}
```

- [ ] **Step 5: Create ActivitiesSection for contracts**

```typescript
// app/[locale]/(routes)/crm/contracts/[contractId]/components/ActivitiesSection.tsx
import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { ActivitiesView } from "@/components/crm/activities/ActivitiesView";

interface Props {
  contractId: string;
}

export async function ActivitiesSection({ contractId }: Props) {
  const initialData = await getActivitiesByEntity("contract", contractId);
  return (
    <ActivitiesView entityType="contract" entityId={contractId} initialData={initialData} />
  );
}
```

- [ ] **Step 6: Wire ActivitiesSection into each entity detail page**

For each of the 5 entity `page.tsx` files:
1. Read the file first to locate the Overview tab content JSX
2. Add the import at the top
3. Insert `<ActivitiesSection ...>` after the `<BasicView .../>` closing tag, inside the Overview tab content

**Accounts** — `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx`:
```typescript
import { ActivitiesSection } from "./components/ActivitiesSection";
// Insert after <BasicView .../>:
<ActivitiesSection accountId={account.id} />
```

**Contacts** — `app/[locale]/(routes)/crm/contacts/[contactId]/page.tsx`:
```typescript
import { ActivitiesSection } from "./components/ActivitiesSection";
// Insert after <BasicView .../>:
<ActivitiesSection contactId={contact.id} />
```

**Leads** — `app/[locale]/(routes)/crm/leads/[leadId]/page.tsx`:
```typescript
import { ActivitiesSection } from "./components/ActivitiesSection";
// Insert after <BasicView .../>:
<ActivitiesSection leadId={lead.id} />
```

**Opportunities** — `app/[locale]/(routes)/crm/opportunities/[opportunityId]/page.tsx`:
```typescript
import { ActivitiesSection } from "./components/ActivitiesSection";
// Insert after <BasicView .../>:
<ActivitiesSection opportunityId={opportunity.id} />
```

**Contracts** — `app/[locale]/(routes)/crm/contracts/[contractId]/page.tsx`:
```typescript
import { ActivitiesSection } from "./components/ActivitiesSection";
// Insert after <BasicView .../>:
<ActivitiesSection contractId={contract.id} />
```

> The History tab (`<TabsTrigger value="history">`) was added in Sub-project A. The insertion point is inside the `<TabsContent value="overview">` block. Do not modify the history tab.

- [ ] **Step 7: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 8: Commit**

```bash
git add \
  "app/[locale]/(routes)/crm/accounts/[accountId]/components/ActivitiesSection.tsx" \
  "app/[locale]/(routes)/crm/contacts/[contactId]/components/ActivitiesSection.tsx" \
  "app/[locale]/(routes)/crm/leads/[leadId]/components/ActivitiesSection.tsx" \
  "app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/ActivitiesSection.tsx" \
  "app/[locale]/(routes)/crm/contracts/[contractId]/components/ActivitiesSection.tsx" \
  "app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx" \
  "app/[locale]/(routes)/crm/contacts/[contactId]/page.tsx" \
  "app/[locale]/(routes)/crm/leads/[leadId]/page.tsx" \
  "app/[locale]/(routes)/crm/opportunities/[opportunityId]/page.tsx" \
  "app/[locale]/(routes)/crm/contracts/[contractId]/page.tsx"
git commit -m "feat: wire ActivitiesSection into all 5 CRM entity detail pages"
```

---

## Success Criteria Checklist

- [ ] Sales rep can log a Call, Meeting, Note, or Email from any entity detail page
- [ ] Activity type selection auto-sets the default status (call/meeting → scheduled, note/email → completed)
- [ ] Scheduled activities show a "scheduled" badge; completed show "completed"
- [ ] Edit opens pre-filled form; changes are saved correctly
- [ ] Delete shows a confirmation dialog and removes the entry from the feed
- [ ] Activity feed loads with cursor-based "Load more" pagination (25 per page)
- [ ] All 5 entity detail pages show the activity feed
- [ ] `npx tsc --noEmit` exits with 0 errors

---

## Key Patterns to Follow

| Pattern | Reference file |
|---------|---------------|
| Sheet form create/edit | `app/[locale]/(routes)/crm/accounts/[accountId]/components/TasksView.tsx` |
| Cursor pagination + Load more | `components/crm/audit-log/Timeline.tsx` |
| Badge + relative date display | `components/crm/audit-log/Entry.tsx` |
| Server wrapper → client component | `app/[locale]/(routes)/crm/accounts/[accountId]/components/HistoryTab.tsx` |
| Server actions with session check | `actions/crm/accounts/create-account.ts` |
| `prismadb.$transaction` | `actions/crm/accounts/create-account.ts` |
| Sonner toast | `components/crm/audit-log/AdminPageClient.tsx` |
