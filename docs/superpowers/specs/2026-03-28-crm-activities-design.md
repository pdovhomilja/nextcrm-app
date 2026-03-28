# CRM Activities (Communication History) — Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Scope:** Sub-project B of CRM completeness initiative

---

## Overview

Add a complete activity log to the NextCRM sales module. Sales reps can log and schedule Calls, Meetings, Notes, and Emails against any CRM record. Each activity can be linked to multiple CRM entities simultaneously. Activities appear inline on every entity detail page and support both past logging and future scheduling.

---

## Goals

- Log and schedule 4 activity types: Call, Meeting, Note, Email
- Link each activity to one or more of the 5 CRM entities (Accounts, Contacts, Leads, Opportunities, Contracts)
- Support both scheduled (future) and completed/cancelled (past) states
- Show activity feed inline on all 5 entity detail pages
- All activities visible to all CRM users (no private activities)

## Non-Goals

- Email send integration (log of emails only, not actual sending)
- Calendar sync (Google Calendar, Outlook) — deferred
- Activity notifications / reminders — deferred
- Audit log for activities themselves — deferred
- Global activities admin page — deferred

---

## Data Model

### `crm_Activities` (new table)

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
  duration    Int?                 // minutes — calls and meetings only
  outcome     String?              // result of call/meeting
  status      crm_Activity_Status  @default(scheduled)  // DB fallback only; app layer sends the correct per-type default (note/email → completed)
  metadata    Json?                @db.JsonB  // type-specific extras (attendees, email subject, etc.)
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
```

### `crm_ActivityLinks` (new junction table)

```prisma
model crm_ActivityLinks {
  id         String          @id @default(uuid()) @db.Uuid
  activityId String          @db.Uuid
  entityType String          // "account" | "contact" | "lead" | "opportunity" | "contract"
  entityId   String          @db.Uuid

  activity crm_Activities @relation(fields: [activityId], references: [id], onDelete: Cascade)

  @@index([activityId])
  @@index([entityType, entityId])
  @@index([entityType, entityId, activityId])
}
```

`onDelete: Cascade` on the link ensures deleting an activity removes its links automatically.

### Users model additions

Add two reverse relations to the existing `Users` model:
```prisma
activities_created crm_Activities[] @relation("activity_created_by")
activities_updated crm_Activities[] @relation("activity_updated_by")
```

---

## API Layer

### Mutating server actions (`actions/crm/activities/`)

#### `create-activity.ts`

```typescript
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
}) => { ... }
```

- Checks `getServerSession` — returns `{ error: "Unauthorized" }` if no session
- Wraps `crm_Activities.create` + `crm_ActivityLinks.createMany` in a `prismadb.$transaction`
- Calls `revalidatePath` for each linked entity's detail page
- Returns `{ data: activity }` on success

#### `update-activity.ts`

```typescript
export const updateActivity = async (data: {
  id: string;
  title?: string;
  description?: string;
  date?: Date;
  duration?: number;
  outcome?: string;
  status?: "scheduled" | "completed" | "cancelled";
  metadata?: Record<string, unknown>;
  links?: Array<{ entityType: string; entityId: string }>; // full replacement
}) => { ... }
```

- Checks session
- In a transaction: updates the activity, deletes all existing links, inserts new links
- `revalidatePath` for each linked entity

#### `delete-activity.ts`

```typescript
export const deleteActivity = async (activityId: string) => { ... }
```

- Checks session
- **Before deleting:** fetch all `crm_ActivityLinks` for the activity to capture which entity pages need revalidation
- Hard delete — links are cascade-deleted automatically by the DB
- **After deleting:** call `revalidatePath` for each entity page captured in the pre-delete fetch

### Fetch actions (`actions/crm/activities/`)

#### `get-activities-by-entity.ts`

```typescript
export const getActivitiesByEntity = async (
  entityType: string,
  entityId: string,
  cursor?: { date: string; id: string }  // compound cursor for deterministic pagination
) => Promise<{ data: ActivityWithLinks[], nextCursor: { date: string; id: string } | null }>
```

- Finds all `crm_ActivityLinks` where `entityType + entityId` match
- Joins `crm_Activities` ordered by `date DESC, id DESC` (compound sort for determinism when multiple activities share the same date)
- Cursor pagination uses compound `(date, id)`: `where: { OR: [{ date: { lt: cursor.date } }, { date: cursor.date, id: { lt: cursor.id } }] }`
- Returns 25 per page
- Includes `created_by_user: { select: { id, name, avatar } }`
- `nextCursor` is `null` when fewer than 25 results returned; otherwise `{ date: lastEntry.date.toISOString(), id: lastEntry.id }`

---

## UI Components

### `components/crm/activities/ActivityForm.tsx` (client component)

Sheet-based create/edit form. Uses the same Sheet pattern as `TasksView.tsx`.

**Fields shown for all types:**
- Type (Select: Call / Meeting / Note / Email)
- Title (Input)
- Date (date + time picker)
- Status (Select: Scheduled / Completed / Cancelled)
- Description / Notes (Textarea)

**Additional fields by type:**
- Call + Meeting: Duration (minutes), Outcome (Input)
- Meeting: (future: attendees via metadata)
- Email: Subject (stored in metadata.subject)

**Default status by type:**
- Call + Meeting: default `scheduled` (these are typically planned ahead)
- Note + Email: default `completed` (these are always retrospective logs)
- The form auto-sets `status` when `type` changes, but the user can always override it manually.

**Entity links section:**
- Shows which entities this activity is linked to
- Read-only on the entity detail page (pre-filled with current entity)
- Could be extended to add more links in a future iteration

### `components/crm/activities/ActivityEntry.tsx` (client component)

Single activity row in the feed.

```
[Icon]  [Title]                           [Date relative]
        [Type badge] [Status badge]       [Edit] [Delete]
        [Description truncated to 2 lines]
        [Outcome if present]
```

- Type icon: phone (call), users (meeting), file-text (note), mail (email)
- Relative date ("2 hours ago") with absolute on hover via Tooltip
- Edit opens `ActivityForm` in a Sheet pre-filled with activity data
- Delete shows an `AlertDialog` confirmation

### `components/crm/activities/ActivitiesView.tsx` (client component)

Card container for the activity feed on each entity detail page.

```
┌─────────────────────────────────────────┐
│ Activities                [Log activity] │
├─────────────────────────────────────────┤
│ [ActivityEntry]                          │
│ [ActivityEntry]                          │
│ [ActivityEntry]                          │
│                          [Load more]     │
└─────────────────────────────────────────┘
```

- Accepts `entityType: string` and `entityId: string` props
- Initial data fetched server-side and passed as `initialData`
- "Load more" uses `useTransition` + cursor pagination (same pattern as `AuditTimeline`)
- Empty state: "No activities yet. Log a call, meeting, or note."
- "Log activity" button opens `ActivityForm` Sheet with `entityType`/`entityId` pre-filled

### Entity detail page integration

`ActivitiesView` is added as a new section inside the existing **"Overview" tab** on all 5 entity detail pages, below `BasicView` and above other sub-views. No new tab is needed — activities are primary content, not secondary history.

**Wrapper component per entity** — one `ActivitiesSection.tsx` per entity, placed in its `components/` directory (see File Structure below):

```typescript
// Server component — fetches initial data, then passes to client ActivitiesView
export async function ActivitiesSection({ entityType, entityId }: Props) {
  const initialData = await getActivitiesByEntity(entityType, entityId);
  return <ActivitiesView entityType={entityType} entityId={entityId} initialData={initialData} />;
}
```

---

## File Structure

```
actions/crm/activities/
  create-activity.ts
  update-activity.ts
  delete-activity.ts
  get-activities-by-entity.ts

components/crm/activities/
  ActivityForm.tsx          # Sheet-based create/edit form
  ActivityEntry.tsx         # Single activity row
  ActivitiesView.tsx        # Paginated feed + "Log activity" button

app/[locale]/(routes)/crm/accounts/[accountId]/components/
  ActivitiesSection.tsx     # Server wrapper for accounts

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
- `prisma/schema.prisma` — new models + enums + Users reverse relations
- All 5 entity `page.tsx` detail pages — add `<ActivitiesSection>` to Overview tab

---

## Migration Strategy

1. Add `crm_Activities`, `crm_ActivityLinks` models via `prisma db push` (dev) / `prisma migrate dev` (prod-ready)
2. Build server actions
3. Build UI components (`ActivityEntry` → `ActivityForm` → `ActivitiesView`)
4. Build per-entity `ActivitiesSection` server wrappers
5. Wire into all 5 entity detail pages

No data migration needed — activity log starts from zero on deploy.

---

## Error Handling

- All mutating actions catch errors and return `{ error: string }` — never throw to the client
- `deleteActivity` uses cascade delete — no orphaned links possible
- Form validation: `title` and `date` are required; client-side and server-side
- If `getActivitiesByEntity` fails, `ActivitiesView` shows an error state rather than crashing the page

---

## Success Criteria

- [ ] Sales rep can log a Call, Meeting, Note, or Email from any entity detail page
- [ ] Activity can be linked to multiple entities (created via the form)
- [ ] Scheduled activities appear in the feed with a "scheduled" badge
- [ ] Completed/cancelled activities can be marked from the feed
- [ ] Activity feed loads with cursor-based "Load more" pagination
- [ ] Edit and delete work from the feed
- [ ] All 5 entity detail pages show the activity feed
