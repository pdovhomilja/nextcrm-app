# AQUNAMA Phase 4 — Calendar Sync (Calendly + Google Calendar inbound) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Booked calls land in the CRM automatically — Calendly bookings arrive via an org-scope webhook, Google Calendar meetings arrive via 15-minute Inngest polling, and both become `meeting` activities linked to the matching CRM record.

**Architecture:** Two inbound pipelines (Calendly webhook route → Inngest event; Google `events.list` incremental polling → same Inngest event) converge on one shared processor `lib/crm/calendar/sync.ts` that matches attendee emails to contacts/targets/leads, dedups cross-source, and upserts idempotent meeting activities. Spec: `docs/superpowers/specs/2026-07-19-aqunama-p4-calendar-sync-design.md`.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (PostgreSQL), Inngest 4, `googleapis` (new dependency), jest 30, existing `lib/email-crypto.ts` AES helper.

## Global Constraints

- **Migrations: do NOT run `prisma migrate dev` against the dev DB (known drift).** Author via `pnpm exec prisma migrate diff --from-schema-datamodel <git-show-of-old-schema> --to-schema-datamodel prisma/schema.prisma --script` into a timestamped migration folder, then verify by fresh-DB replay (disposable pgvector container) — same procedure as Phases 1–3.
- Meeting activities are plain `crm_Activities` rows (`type: meeting`) linked via `crm_ActivityLinks`; the Phase 2 kill clock (`lib/crm/client-activity.ts`) must need **zero changes**.
- Unmatched Calendly invitee → auto-create `crm_Targets`; unmatched Google event → skip, store nothing.
- Google scope is `https://www.googleapis.com/auth/calendar.readonly` only (inbound; Milestone C adds write later).
- Tokens/secrets at rest are encrypted with `encrypt`/`decrypt` from `@/lib/email-crypto`.
- All work on `dev` branch; commit after every task; conventional commit messages.
- Tests: `pnpm jest <path>` for a single file, `pnpm test` for the full suite (921 baseline, no known failures).
- entityType strings for `crm_ActivityLinks`: `"account" | "contact" | "lead" | "opportunity" | "target"`.
- Inngest event name for processing: `"crm/calendar.event.received"`; Google per-connection sync event: `"crm/calendar.google-sync"`.

---

### Task 1: Prisma schema + migration

**Files:**
- Modify: `prisma/schema.prisma` (add enum + 2 models; back-relations on `Users` and `crm_Activities`)
- Create: `prisma/migrations/<timestamp>_aqunama_p4_calendar_sync/migration.sql`

**Interfaces:**
- Produces: `CalendarConnection` and `crm_CalendarEvents` Prisma models used by every later task. Unique keys: `CalendarConnection @@unique([userId, provider, accountEmail])`, `crm_CalendarEvents @@unique([source, externalId])` (compound name `source_externalId`).

- [ ] **Step 1: Add models to `prisma/schema.prisma`**

Append near the EMAIL FEATURE section (after `EmailEmbedding`):

```prisma
// ============================================
// CALENDAR SYNC (AQUNAMA Phase 4)
// ============================================

enum CalendarProvider {
  google
}

model CalendarConnection {
  id                    String           @id @default(uuid()) @db.Uuid
  userId                String           @db.Uuid
  provider              CalendarProvider
  accountEmail          String
  accessTokenEncrypted  String?
  refreshTokenEncrypted String
  tokenExpiresAt        DateTime?
  syncToken             String?
  isActive              Boolean          @default(true)
  lastSyncedAt          DateTime?
  lastSyncError         String?
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  user           Users               @relation(fields: [userId], references: [id], onDelete: Cascade)
  calendarEvents crm_CalendarEvents[]

  @@unique([userId, provider, accountEmail])
  @@index([userId])
  @@index([isActive])
}

model crm_CalendarEvents {
  id             String    @id @default(uuid()) @db.Uuid
  source         String
  externalId     String
  iCalUID        String?
  connectionId   String?   @db.Uuid
  activityId     String    @db.Uuid
  startAt        DateTime
  endAt          DateTime?
  attendeeEmails Json      @default("[]")
  status         String    @default("scheduled")
  rawPayload     Json?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  connection CalendarConnection? @relation(fields: [connectionId], references: [id], onDelete: SetNull)
  activity   crm_Activities      @relation(fields: [activityId], references: [id], onDelete: Cascade)

  @@unique([source, externalId])
  @@index([iCalUID])
  @@index([activityId])
  @@index([startAt])
}
```

Add back-relations:
- In `model Users` (next to `emailAccounts EmailAccount[]`): `calendarConnections CalendarConnection[]`
- In `model crm_Activities` (next to `links`): `calendar_events crm_CalendarEvents[]`

- [ ] **Step 2: Generate the migration SQL (no `migrate dev`)**

```bash
git show HEAD:prisma/schema.prisma > /tmp/schema-old.prisma
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_aqunama_p4_calendar_sync
pnpm exec prisma migrate diff \
  --from-schema-datamodel /tmp/schema-old.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/*_aqunama_p4_calendar_sync/migration.sql
```

Inspect the SQL: it must create `CalendarProvider` enum, both tables, FKs, unique + regular indexes — nothing else (no drops).

- [ ] **Step 3: Verify by fresh-DB replay**

```bash
docker run -d --name p4-migrate-check -e POSTGRES_PASSWORD=postgres -p 55432:5432 pgvector/pgvector:pg16
sleep 3
docker exec p4-migrate-check psql -U postgres -c 'CREATE DATABASE p4;'
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/p4 pnpm exec prisma migrate deploy
docker rm -f p4-migrate-check
```

Expected: all migrations apply cleanly, ending with `…_aqunama_p4_calendar_sync`.

- [ ] **Step 4: Regenerate client + typecheck**

```bash
pnpm exec prisma generate && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma
git commit -m "feat(calendar): CalendarConnection + crm_CalendarEvents models for Phase 4 sync"
```

---

### Task 2: Calendly webhook signature verification

**Files:**
- Create: `lib/crm/calendar/calendly-signature.ts`
- Test: `lib/crm/calendar/__tests__/calendly-signature.test.ts`

**Interfaces:**
- Produces: `verifyCalendlySignature(rawBody: string, header: string | null, signingKey: string): boolean`. Header format is Calendly's `t=<unix>,v1=<hex hmac of "<t>.<rawBody>">`.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/crm/calendar/__tests__/calendly-signature.test.ts
import { createHmac } from "crypto";
import { verifyCalendlySignature } from "../calendly-signature";

const KEY = "test-signing-key";

function sign(body: string, t = "1721400000", key = KEY) {
  const v1 = createHmac("sha256", key).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("verifyCalendlySignature", () => {
  it("accepts a valid signature", () => {
    const body = JSON.stringify({ event: "invitee.created" });
    expect(verifyCalendlySignature(body, sign(body), KEY)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyCalendlySignature('{"a":2}', sign('{"a":1}'), KEY)).toBe(false);
  });

  it("rejects a wrong key", () => {
    const body = "{}";
    expect(verifyCalendlySignature(body, sign(body, "1721400000", "other"), KEY)).toBe(false);
  });

  it("rejects missing or malformed headers", () => {
    expect(verifyCalendlySignature("{}", null, KEY)).toBe(false);
    expect(verifyCalendlySignature("{}", "garbage", KEY)).toBe(false);
    expect(verifyCalendlySignature("{}", "t=123", KEY)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest lib/crm/calendar/__tests__/calendly-signature.test.ts`
Expected: FAIL — cannot find module `../calendly-signature`.

- [ ] **Step 3: Implement**

```typescript
// lib/crm/calendar/calendly-signature.ts
import { createHmac, timingSafeEqual } from "crypto";

// Calendly signs webhooks with: Calendly-Webhook-Signature: t=<unix>,v1=<hex>
// where v1 = HMAC-SHA256(signingKey, `${t}.${rawBody}`).
export function verifyCalendlySignature(
  rawBody: string,
  header: string | null,
  signingKey: string
): boolean {
  if (!header || !signingKey) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=", 2) as [string, string])
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;

  const expected = createHmac("sha256", signingKey)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(v1, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest lib/crm/calendar/__tests__/calendly-signature.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/crm/calendar
git commit -m "feat(calendar): Calendly webhook HMAC signature verification"
```

---

### Task 3: Shared types + attendee matcher

**Files:**
- Create: `lib/crm/calendar/types.ts`
- Create: `lib/crm/calendar/match.ts`
- Test: `lib/crm/calendar/__tests__/match.test.ts`

**Interfaces:**
- Produces:

```typescript
// types.ts
export type CalendarSource = "calendly" | "google";
export type CalendarEventInput = {
  source: CalendarSource;
  externalId: string;
  iCalUID?: string | null;
  connectionId?: string | null;
  title: string;
  startAt: Date;
  endAt?: Date | null;
  counterpartyEmails: string[];
  hostEmail?: string | null;
  status: "scheduled" | "cancelled";
  rawPayload?: unknown;
};
export type EntityLink = { entityType: string; entityId: string };
export type UpsertResult = {
  action: "created" | "updated" | "cancelled" | "skipped";
  reason?: string;
  activityId?: string;
};
```

- `matchCounterparty(emails: string[]): Promise<EntityLink[]>` — returns `[]` when nothing matches. Priority: contact (+ its account + single open opportunity) → target → lead.

- [ ] **Step 1: Create `lib/crm/calendar/types.ts`** with exactly the code block above.

- [ ] **Step 2: Write the failing matcher test**

```typescript
// lib/crm/calendar/__tests__/match.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { findFirst: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
    crm_Leads: { findFirst: jest.fn() },
    crm_Opportunities: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { matchCounterparty } from "../match";

const contacts = prismadb.crm_Contacts.findFirst as jest.Mock;
const targets = prismadb.crm_Targets.findFirst as jest.Mock;
const leads = prismadb.crm_Leads.findFirst as jest.Mock;
const opps = prismadb.crm_Opportunities.findMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("matchCounterparty", () => {
  it("returns [] for empty input without querying", async () => {
    expect(await matchCounterparty([])).toEqual([]);
    expect(contacts).not.toHaveBeenCalled();
  });

  it("matches contact and links account + single open opportunity", async () => {
    contacts.mockResolvedValue({ id: "c1", accountsIDs: "a1" });
    opps.mockResolvedValue([{ id: "o1" }]);
    const links = await matchCounterparty(["jane@client.com"]);
    expect(links).toEqual([
      { entityType: "contact", entityId: "c1" },
      { entityType: "account", entityId: "a1" },
      { entityType: "opportunity", entityId: "o1" },
    ]);
  });

  it("skips opportunity link when the account has several open deals", async () => {
    contacts.mockResolvedValue({ id: "c1", accountsIDs: "a1" });
    opps.mockResolvedValue([{ id: "o1" }, { id: "o2" }]);
    const links = await matchCounterparty(["jane@client.com"]);
    expect(links).toEqual([
      { entityType: "contact", entityId: "c1" },
      { entityType: "account", entityId: "a1" },
    ]);
  });

  it("falls back to target, then lead", async () => {
    contacts.mockResolvedValue(null);
    targets.mockResolvedValue({ id: "t1" });
    expect(await matchCounterparty(["x@y.com"])).toEqual([
      { entityType: "target", entityId: "t1" },
    ]);

    targets.mockResolvedValue(null);
    leads.mockResolvedValue({ id: "l1" });
    expect(await matchCounterparty(["x@y.com"])).toEqual([
      { entityType: "lead", entityId: "l1" },
    ]);
  });

  it("returns [] when nothing matches", async () => {
    contacts.mockResolvedValue(null);
    targets.mockResolvedValue(null);
    leads.mockResolvedValue(null);
    expect(await matchCounterparty(["x@y.com"])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm jest lib/crm/calendar/__tests__/match.test.ts`
Expected: FAIL — cannot find module `../match`.

- [ ] **Step 4: Implement the matcher**

```typescript
// lib/crm/calendar/match.ts
import { prismadb } from "@/lib/prisma";
import type { EntityLink } from "./types";

// Spec matching order: contact (+account +single open opp) -> target -> lead.
export async function matchCounterparty(emails: string[]): Promise<EntityLink[]> {
  const normalized = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return [];

  const contact = await prismadb.crm_Contacts.findFirst({
    where: {
      OR: [
        { email: { in: normalized, mode: "insensitive" } },
        { personal_email: { in: normalized, mode: "insensitive" } },
      ],
    },
    select: { id: true, accountsIDs: true },
  });
  if (contact) {
    const links: EntityLink[] = [{ entityType: "contact", entityId: contact.id }];
    if (contact.accountsIDs) {
      links.push({ entityType: "account", entityId: contact.accountsIDs });
      const open = await prismadb.crm_Opportunities.findMany({
        where: { account: contact.accountsIDs, status: "ACTIVE", deletedAt: null },
        select: { id: true },
        take: 2,
      });
      if (open.length === 1) {
        links.push({ entityType: "opportunity", entityId: open[0].id });
      }
    }
    return links;
  }

  const target = await prismadb.crm_Targets.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: { in: normalized, mode: "insensitive" } },
        { personal_email: { in: normalized, mode: "insensitive" } },
        { company_email: { in: normalized, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (target) return [{ entityType: "target", entityId: target.id }];

  const lead = await prismadb.crm_Leads.findFirst({
    where: { email: { in: normalized, mode: "insensitive" } },
    select: { id: true },
  });
  if (lead) return [{ entityType: "lead", entityId: lead.id }];

  return [];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm jest lib/crm/calendar/__tests__/match.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/crm/calendar
git commit -m "feat(calendar): counterparty email matcher (contact > target > lead)"
```

---

### Task 4: Shared processor `upsertCalendarEvent`

**Files:**
- Create: `lib/crm/calendar/sync.ts`
- Test: `lib/crm/calendar/__tests__/sync.test.ts`

**Interfaces:**
- Consumes: `matchCounterparty` (Task 3), `CalendarEventInput`/`UpsertResult` (Task 3).
- Produces: `upsertCalendarEvent(input: CalendarEventInput): Promise<UpsertResult>` — the single write path both pipelines call. Idempotent on `(source, externalId)`.

Behavior matrix (from the spec):
1. Existing mapping + incoming `cancelled` → set mapping + activity to cancelled → `{action:"cancelled"}`.
2. Existing mapping + changed `startAt` → update mapping + activity date → `{action:"updated"}`.
3. Existing mapping, no relevant change → `{action:"skipped", reason:"unchanged"}`.
4. New + `cancelled` → `{action:"skipped", reason:"cancel-for-unknown"}`.
5. New google event that duplicates a Calendly booking (same `startAt` + overlapping attendee email in a `source:"calendly"` row) → `{action:"skipped", reason:"duplicate-of-calendly"}`.
6. New, no match: google → `{action:"skipped", reason:"no-match"}`; calendly → create `crm_Targets` (invitee name/email, tag `book-a-call`, `created_by` = host user when resolvable) and link to it.
7. New, matched (or target created) → create `crm_Activities` (`type:"meeting"`, `status:"scheduled"`, `date:startAt`, `duration` = minutes between start/end, `metadata:{calendarSource: source}`, `createdBy` = host user id if resolvable, `links.create` = entity links) + `crm_CalendarEvents` mapping row → `{action:"created", activityId}`.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/crm/calendar/__tests__/sync.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_CalendarEvents: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    crm_Activities: { create: jest.fn(), update: jest.fn() },
    crm_Targets: { create: jest.fn() },
    users: { findFirst: jest.fn() },
  },
}));
jest.mock("../match", () => ({ matchCounterparty: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { matchCounterparty } from "../match";
import { upsertCalendarEvent } from "../sync";
import type { CalendarEventInput } from "../types";

const mapping = prismadb.crm_CalendarEvents;
const findUnique = mapping.findUnique as jest.Mock;
const findMany = mapping.findMany as jest.Mock;
const createMapping = mapping.create as jest.Mock;
const updateMapping = mapping.update as jest.Mock;
const createActivity = prismadb.crm_Activities.create as jest.Mock;
const updateActivity = prismadb.crm_Activities.update as jest.Mock;
const createTarget = prismadb.crm_Targets.create as jest.Mock;
const findUser = prismadb.users.findFirst as jest.Mock;
const match = matchCounterparty as jest.Mock;

function input(overrides: Partial<CalendarEventInput> = {}): CalendarEventInput {
  return {
    source: "calendly",
    externalId: "https://api.calendly.com/scheduled_events/EV1/invitees/INV1",
    title: "Intro call",
    startAt: new Date("2026-07-21T10:00:00Z"),
    endAt: new Date("2026-07-21T10:30:00Z"),
    counterpartyEmails: ["jane@client.com"],
    hostEmail: "rep@aqunama.com",
    status: "scheduled",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  findUnique.mockResolvedValue(null);
  findMany.mockResolvedValue([]);
  findUser.mockResolvedValue(null);
  createActivity.mockResolvedValue({ id: "act1" });
  createMapping.mockResolvedValue({ id: "map1" });
});

describe("upsertCalendarEvent", () => {
  it("creates activity + mapping for a matched event", async () => {
    match.mockResolvedValue([{ entityType: "contact", entityId: "c1" }]);
    const res = await upsertCalendarEvent(input());
    expect(res).toEqual({ action: "created", activityId: "act1" });
    expect(createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "meeting",
          status: "scheduled",
          duration: 30,
          links: { create: [{ entityType: "contact", entityId: "c1" }] },
        }),
      })
    );
    expect(createMapping).toHaveBeenCalled();
  });

  it("cancels an existing mapping + activity", async () => {
    findUnique.mockResolvedValue({
      id: "map1", activityId: "act1", status: "scheduled",
      startAt: new Date("2026-07-21T10:00:00Z"),
    });
    const res = await upsertCalendarEvent(input({ status: "cancelled" }));
    expect(res.action).toBe("cancelled");
    expect(updateActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "act1" },
        data: expect.objectContaining({ status: "cancelled" }),
      })
    );
  });

  it("updates activity date on reschedule", async () => {
    findUnique.mockResolvedValue({
      id: "map1", activityId: "act1", status: "scheduled",
      startAt: new Date("2026-07-21T10:00:00Z"),
    });
    const res = await upsertCalendarEvent(
      input({ startAt: new Date("2026-07-22T09:00:00Z") })
    );
    expect(res.action).toBe("updated");
    expect(updateActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ date: new Date("2026-07-22T09:00:00Z") }),
      })
    );
  });

  it("skips unchanged existing events", async () => {
    findUnique.mockResolvedValue({
      id: "map1", activityId: "act1", status: "scheduled",
      startAt: new Date("2026-07-21T10:00:00Z"),
    });
    const res = await upsertCalendarEvent(input());
    expect(res).toEqual({ action: "skipped", reason: "unchanged" });
  });

  it("skips a cancel for an unknown event", async () => {
    const res = await upsertCalendarEvent(input({ status: "cancelled" }));
    expect(res).toEqual({ action: "skipped", reason: "cancel-for-unknown" });
  });

  it("skips a google event that duplicates a calendly booking", async () => {
    findMany.mockResolvedValue([
      { attendeeEmails: ["jane@client.com"] },
    ]);
    const res = await upsertCalendarEvent(
      input({ source: "google", externalId: "gev1", connectionId: "conn1" })
    );
    expect(res).toEqual({ action: "skipped", reason: "duplicate-of-calendly" });
    expect(createActivity).not.toHaveBeenCalled();
  });

  it("skips unmatched google events", async () => {
    match.mockResolvedValue([]);
    const res = await upsertCalendarEvent(
      input({ source: "google", externalId: "gev1", connectionId: "conn1" })
    );
    expect(res).toEqual({ action: "skipped", reason: "no-match" });
    expect(createTarget).not.toHaveBeenCalled();
  });

  it("creates a Target for unmatched calendly invitees, assigned to the host rep", async () => {
    match.mockResolvedValue([]);
    findUser.mockResolvedValue({ id: "rep1" });
    createTarget.mockResolvedValue({ id: "t-new" });
    const res = await upsertCalendarEvent(
      input({ rawPayload: { payload: { name: "Jane Doe" } } })
    );
    expect(res.action).toBe("created");
    expect(createTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          first_name: "Jane",
          last_name: "Doe",
          email: "jane@client.com",
          tags: ["book-a-call"],
          created_by: "rep1",
        }),
      })
    );
    expect(createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          links: { create: [{ entityType: "target", entityId: "t-new" }] },
        }),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest lib/crm/calendar/__tests__/sync.test.ts`
Expected: FAIL — cannot find module `../sync`.

- [ ] **Step 3: Implement the processor**

```typescript
// lib/crm/calendar/sync.ts
import { prismadb } from "@/lib/prisma";
import { matchCounterparty } from "./match";
import type { CalendarEventInput, EntityLink, UpsertResult } from "./types";

function inviteeName(input: CalendarEventInput): { first: string | null; last: string } {
  const raw =
    (input.rawPayload as { payload?: { name?: string } } | undefined)?.payload?.name ??
    input.counterpartyEmails[0] ??
    "Unknown";
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return { first: null, last: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

async function resolveHostUserId(hostEmail: string | null | undefined): Promise<string | null> {
  if (!hostEmail) return null;
  const user = await prismadb.users.findFirst({
    where: { email: hostEmail },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function upsertCalendarEvent(input: CalendarEventInput): Promise<UpsertResult> {
  const existing = await prismadb.crm_CalendarEvents.findUnique({
    where: { source_externalId: { source: input.source, externalId: input.externalId } },
  });

  if (existing) {
    if (input.status === "cancelled" && existing.status !== "cancelled") {
      await prismadb.crm_CalendarEvents.update({
        where: { id: existing.id },
        data: { status: "cancelled", rawPayload: (input.rawPayload as object) ?? undefined },
      });
      await prismadb.crm_Activities.update({
        where: { id: existing.activityId },
        data: { status: "cancelled" },
      });
      return { action: "cancelled", activityId: existing.activityId };
    }
    if (
      input.status === "scheduled" &&
      existing.startAt.getTime() !== input.startAt.getTime()
    ) {
      await prismadb.crm_CalendarEvents.update({
        where: { id: existing.id },
        data: {
          startAt: input.startAt,
          endAt: input.endAt ?? null,
          status: "scheduled",
          rawPayload: (input.rawPayload as object) ?? undefined,
        },
      });
      await prismadb.crm_Activities.update({
        where: { id: existing.activityId },
        data: { date: input.startAt, status: "scheduled" },
      });
      return { action: "updated", activityId: existing.activityId };
    }
    return { action: "skipped", reason: "unchanged" };
  }

  if (input.status === "cancelled") {
    return { action: "skipped", reason: "cancel-for-unknown" };
  }

  // Cross-source dedup: a Calendly booking also appears on the rep's Google
  // Calendar. Skip google events whose start time + attendee already exist
  // as a calendly-sourced row.
  if (input.source === "google") {
    const sameSlot = await prismadb.crm_CalendarEvents.findMany({
      where: { source: "calendly", startAt: input.startAt },
      select: { attendeeEmails: true },
    });
    const mine = new Set(input.counterpartyEmails.map((e) => e.toLowerCase()));
    const duplicate = sameSlot.some((row) =>
      (row.attendeeEmails as string[]).some((e) => mine.has(e.toLowerCase()))
    );
    if (duplicate) return { action: "skipped", reason: "duplicate-of-calendly" };
  }

  const hostUserId = await resolveHostUserId(input.hostEmail);
  let links: EntityLink[] = await matchCounterparty(input.counterpartyEmails);

  if (links.length === 0) {
    if (input.source === "google") return { action: "skipped", reason: "no-match" };
    // Calendly no-match: a booking from an unknown person is a new lead ->
    // auto-create a Target (spec: source "Book-a-call").
    const { first, last } = inviteeName(input);
    const target = await prismadb.crm_Targets.create({
      data: {
        first_name: first,
        last_name: last,
        email: input.counterpartyEmails[0] ?? null,
        tags: ["book-a-call"],
        created_by: hostUserId,
      },
    });
    links = [{ entityType: "target", entityId: target.id }];
  }

  const durationMinutes =
    input.endAt != null
      ? Math.max(0, Math.round((input.endAt.getTime() - input.startAt.getTime()) / 60000))
      : null;

  const activity = await prismadb.crm_Activities.create({
    data: {
      type: "meeting",
      title: input.title,
      date: input.startAt,
      duration: durationMinutes,
      status: "scheduled",
      metadata: { calendarSource: input.source },
      createdBy: hostUserId,
      links: { create: links },
    },
  });

  await prismadb.crm_CalendarEvents.create({
    data: {
      source: input.source,
      externalId: input.externalId,
      iCalUID: input.iCalUID ?? null,
      connectionId: input.connectionId ?? null,
      activityId: activity.id,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      attendeeEmails: input.counterpartyEmails,
      status: "scheduled",
      rawPayload: (input.rawPayload as object) ?? undefined,
    },
  });

  return { action: "created", activityId: activity.id };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest lib/crm/calendar/__tests__/sync.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/crm/calendar
git commit -m "feat(calendar): shared idempotent calendar-event processor"
```

---

### Task 5: Inngest processing function + registration

**Files:**
- Create: `inngest/functions/calendar/process-event.ts`
- Modify: `app/api/inngest/route.ts` (import + register)

**Interfaces:**
- Consumes: `upsertCalendarEvent` (Task 4).
- Produces: Inngest function `calendarProcessEvent` triggered by `"crm/calendar.event.received"`. Event `data` is a JSON-serialized `CalendarEventInput` (dates as ISO strings — this function revives them).

- [ ] **Step 1: Implement the function**

```typescript
// inngest/functions/calendar/process-event.ts
import { inngest } from "@/inngest/client";
import { upsertCalendarEvent } from "@/lib/crm/calendar/sync";
import type { CalendarEventInput, CalendarSource } from "@/lib/crm/calendar/types";

type WireEvent = Omit<CalendarEventInput, "startAt" | "endAt" | "source"> & {
  source: CalendarSource;
  startAt: string;
  endAt?: string | null;
};

export const calendarProcessEvent = inngest.createFunction(
  { id: "crm-calendar-process-event", name: "CRM: Process calendar event" },
  { event: "crm/calendar.event.received" },
  async ({ event, step }) => {
    const data = event.data as WireEvent;
    return step.run("upsert", () =>
      upsertCalendarEvent({
        ...data,
        startAt: new Date(data.startAt),
        endAt: data.endAt ? new Date(data.endAt) : null,
      })
    );
  }
);
```

- [ ] **Step 2: Register in `app/api/inngest/route.ts`**

Add import after the existing crm imports and append to the `functions` array:

```typescript
import { calendarProcessEvent } from "@/inngest/functions/calendar/process-event";
// ...in functions array, after renewalReminders:
    calendarProcessEvent,
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add inngest app/api/inngest/route.ts
git commit -m "feat(calendar): inngest processor for crm/calendar.event.received"
```

---

### Task 6: Calendly settings storage + webhook route

**Files:**
- Create: `lib/crm/calendar/calendly-settings.ts`
- Create: `app/api/crm/calendar/webhooks/calendly/route.ts`
- Test: `app/api/crm/calendar/webhooks/calendly/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `verifyCalendlySignature` (Task 2), `crm_SystemSettings` key-value table, `encrypt`/`decrypt` from `@/lib/email-crypto`.
- Produces:
  - `getCalendlySettings(): Promise<{ apiToken: string | null; signingKey: string | null; webhookUri: string | null }>`
  - `saveCalendlySettings(input: { apiToken?: string; signingKey?: string }): Promise<void>`
  - `setCalendlyWebhookUri(uri: string): Promise<void>`
  - `POST /api/crm/calendar/webhooks/calendly` — 401 bad signature; 200 + Inngest event for `invitee.created`/`invitee.canceled`; 200 no-op otherwise.
- System-settings keys (values encrypted where noted): `calendly_api_token` (encrypted), `calendly_signing_key` (encrypted), `calendly_webhook_uri` (plain).

- [ ] **Step 1: Implement settings helper**

```typescript
// lib/crm/calendar/calendly-settings.ts
import { prismadb } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/email-crypto";

const KEYS = {
  apiToken: "calendly_api_token",
  signingKey: "calendly_signing_key",
  webhookUri: "calendly_webhook_uri",
} as const;

async function read(key: string): Promise<string | null> {
  const row = await prismadb.crm_SystemSettings.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function write(key: string, value: string): Promise<void> {
  await prismadb.crm_SystemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getCalendlySettings() {
  const [token, signing, uri] = await Promise.all([
    read(KEYS.apiToken),
    read(KEYS.signingKey),
    read(KEYS.webhookUri),
  ]);
  return {
    apiToken: token ? decrypt(token) : null,
    signingKey: signing ? decrypt(signing) : null,
    webhookUri: uri,
  };
}

export async function saveCalendlySettings(input: {
  apiToken?: string;
  signingKey?: string;
}): Promise<void> {
  if (input.apiToken) await write(KEYS.apiToken, encrypt(input.apiToken));
  if (input.signingKey) await write(KEYS.signingKey, encrypt(input.signingKey));
}

export async function setCalendlyWebhookUri(uri: string): Promise<void> {
  await write(KEYS.webhookUri, uri);
}
```

- [ ] **Step 2: Write the failing route test**

```typescript
// app/api/crm/calendar/webhooks/calendly/__tests__/route.test.ts
jest.mock("@/lib/crm/calendar/calendly-settings", () => ({
  getCalendlySettings: jest.fn(),
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({ ids: ["1"] }) },
}));

import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { getCalendlySettings } from "@/lib/crm/calendar/calendly-settings";
import { inngest } from "@/inngest/client";
import { POST } from "../route";

const settings = getCalendlySettings as jest.Mock;
const send = inngest.send as jest.Mock;
const KEY = "sk";

function sign(body: string) {
  const t = "1721400000";
  const v1 = createHmac("sha256", KEY).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

function makeReq(body: object, signature?: string) {
  const raw = JSON.stringify(body);
  return new NextRequest("http://localhost/api/crm/calendar/webhooks/calendly", {
    method: "POST",
    body: raw,
    headers: {
      "content-type": "application/json",
      ...(signature !== undefined
        ? { "calendly-webhook-signature": signature }
        : { "calendly-webhook-signature": sign(raw) }),
    },
  });
}

const CREATED = {
  event: "invitee.created",
  payload: {
    uri: "https://api.calendly.com/scheduled_events/EV1/invitees/INV1",
    email: "jane@client.com",
    name: "Jane Doe",
    scheduled_event: {
      uri: "https://api.calendly.com/scheduled_events/EV1",
      name: "Intro call",
      start_time: "2026-07-21T10:00:00.000000Z",
      end_time: "2026-07-21T10:30:00.000000Z",
      event_memberships: [{ user_email: "rep@aqunama.com" }],
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  settings.mockResolvedValue({ apiToken: "tok", signingKey: KEY, webhookUri: null });
});

describe("POST /api/crm/calendar/webhooks/calendly", () => {
  it("401 on bad signature", async () => {
    const res = await POST(makeReq(CREATED, "t=1,v1=bad"));
    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("401 when no signing key is configured", async () => {
    settings.mockResolvedValue({ apiToken: null, signingKey: null, webhookUri: null });
    const res = await POST(makeReq(CREATED));
    expect(res.status).toBe(401);
  });

  it("forwards invitee.created to inngest and ACKs", async () => {
    const res = await POST(makeReq(CREATED));
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "crm/calendar.event.received",
        data: expect.objectContaining({
          source: "calendly",
          externalId: CREATED.payload.uri,
          title: "Intro call",
          counterpartyEmails: ["jane@client.com"],
          hostEmail: "rep@aqunama.com",
          status: "scheduled",
        }),
      })
    );
  });

  it("maps invitee.canceled to status cancelled", async () => {
    const res = await POST(makeReq({ ...CREATED, event: "invitee.canceled" }));
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "cancelled" }),
      })
    );
  });

  it("ACKs 200 for unhandled event types without sending", async () => {
    const res = await POST(makeReq({ event: "routing_form_submission.created", payload: {} }));
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm jest app/api/crm/calendar/webhooks/calendly/__tests__/route.test.ts`
Expected: FAIL — cannot find module `../route`.

- [ ] **Step 4: Implement the route**

```typescript
// app/api/crm/calendar/webhooks/calendly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCalendlySignature } from "@/lib/crm/calendar/calendly-signature";
import { getCalendlySettings } from "@/lib/crm/calendar/calendly-settings";
import { inngest } from "@/inngest/client";

type CalendlyWebhookBody = {
  event: string;
  payload: {
    uri?: string;
    email?: string;
    name?: string;
    scheduled_event?: {
      uri?: string;
      name?: string;
      start_time?: string;
      end_time?: string;
      event_memberships?: Array<{ user_email?: string }>;
    };
  };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const { signingKey } = await getCalendlySettings();

  if (
    !signingKey ||
    !verifyCalendlySignature(
      rawBody,
      req.headers.get("calendly-webhook-signature"),
      signingKey
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: CalendlyWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // Never bounce Calendly into disabling the subscription over a bad payload.
    return NextResponse.json({ ok: true });
  }

  if (body.event !== "invitee.created" && body.event !== "invitee.canceled") {
    return NextResponse.json({ ok: true });
  }

  const p = body.payload;
  const ev = p.scheduled_event;
  if (!p.uri || !ev?.start_time) return NextResponse.json({ ok: true });

  await inngest.send({
    name: "crm/calendar.event.received",
    data: {
      source: "calendly",
      externalId: p.uri,
      iCalUID: null,
      connectionId: null,
      title: ev.name ?? "Calendly meeting",
      startAt: ev.start_time,
      endAt: ev.end_time ?? null,
      counterpartyEmails: p.email ? [p.email] : [],
      hostEmail: ev.event_memberships?.[0]?.user_email ?? null,
      status: body.event === "invitee.canceled" ? "cancelled" : "scheduled",
      rawPayload: body,
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm jest app/api/crm/calendar/webhooks/calendly/__tests__/route.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/crm/calendar app/api/crm/calendar
git commit -m "feat(calendar): Calendly settings storage + signed webhook endpoint"
```

---

### Task 7: Calendly admin page + webhook subscription action

**Files:**
- Create: `app/[locale]/(routes)/admin/calendar-settings/_actions/calendly.ts`
- Create: `app/[locale]/(routes)/admin/calendar-settings/page.tsx`
- Create: `app/[locale]/(routes)/admin/calendar-settings/_components/CalendlyForm.tsx`

**Interfaces:**
- Consumes: `saveCalendlySettings`, `getCalendlySettings`, `setCalendlyWebhookUri` (Task 6).
- Produces: admin-only page at `/admin/calendar-settings` with a form (API token + signing key) and a "Subscribe webhook" button. Server action `subscribeCalendlyWebhook()` calls Calendly: `GET /users/me` → `current_organization`, then `POST /webhook_subscriptions` with `{url, events: ["invitee.created","invitee.canceled"], organization, scope: "organization"}`.

- [ ] **Step 1: Implement server actions**

```typescript
// app/[locale]/(routes)/admin/calendar-settings/_actions/calendly.ts
"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import {
  getCalendlySettings,
  saveCalendlySettings,
  setCalendlyWebhookUri,
} from "@/lib/crm/calendar/calendly-settings";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const user = await prismadb.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") throw new Error("Forbidden");
}

export async function saveCalendlyAction(formData: FormData) {
  await requireAdmin();
  const apiToken = String(formData.get("apiToken") ?? "").trim();
  const signingKey = String(formData.get("signingKey") ?? "").trim();
  await saveCalendlySettings({
    ...(apiToken ? { apiToken } : {}),
    ...(signingKey ? { signingKey } : {}),
  });
  revalidatePath("/admin/calendar-settings");
}

export async function subscribeCalendlyWebhook(): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const { apiToken } = await getCalendlySettings();
  if (!apiToken) return { ok: false, error: "Save the API token first." };

  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  const meRes = await fetch("https://api.calendly.com/users/me", { headers });
  if (!meRes.ok) return { ok: false, error: `Calendly /users/me failed (${meRes.status})` };
  const me = (await meRes.json()) as { resource: { current_organization: string } };

  const subRes = await fetch("https://api.calendly.com/webhook_subscriptions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/calendar/webhooks/calendly`,
      events: ["invitee.created", "invitee.canceled"],
      organization: me.resource.current_organization,
      scope: "organization",
    }),
  });
  if (!subRes.ok) {
    const detail = await subRes.text();
    return { ok: false, error: `Subscription failed (${subRes.status}): ${detail.slice(0, 200)}` };
  }
  const sub = (await subRes.json()) as { resource: { uri: string } };
  await setCalendlyWebhookUri(sub.resource.uri);
  revalidatePath("/admin/calendar-settings");
  return { ok: true };
}
```

- [ ] **Step 2: Implement the page (server component)**

```tsx
// app/[locale]/(routes)/admin/calendar-settings/page.tsx
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCalendlySettings } from "@/lib/crm/calendar/calendly-settings";
import { CalendlyForm } from "./_components/CalendlyForm";

export default async function CalendarSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/sign-in");
  const user = await prismadb.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") redirect("/");

  const settings = await getCalendlySettings();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Calendar settings</h1>
        <p className="text-sm text-muted-foreground">
          Calendly organization webhook for booked-call capture.
        </p>
      </div>
      <CalendlyForm
        hasToken={Boolean(settings.apiToken)}
        hasSigningKey={Boolean(settings.signingKey)}
        webhookUri={settings.webhookUri}
      />
    </div>
  );
}
```

- [ ] **Step 3: Implement the form (client component)**

```tsx
// app/[locale]/(routes)/admin/calendar-settings/_components/CalendlyForm.tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCalendlyAction, subscribeCalendlyWebhook } from "../_actions/calendly";

export function CalendlyForm(props: {
  hasToken: boolean;
  hasSigningKey: boolean;
  webhookUri: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="max-w-xl space-y-4 rounded-lg border p-4">
      <form action={saveCalendlyAction} className="space-y-3">
        <div>
          <label className="text-sm font-medium">
            API token {props.hasToken ? "(saved)" : ""}
          </label>
          <Input name="apiToken" type="password" placeholder="Calendly personal access token" />
        </div>
        <div>
          <label className="text-sm font-medium">
            Webhook signing key {props.hasSigningKey ? "(saved)" : ""}
          </label>
          <Input name="signingKey" type="password" placeholder="Webhook signing key" />
        </div>
        <Button type="submit">Save</Button>
      </form>

      <div className="border-t pt-4">
        <Button
          variant="secondary"
          disabled={pending || !props.hasToken}
          onClick={() =>
            startTransition(async () => {
              const res = await subscribeCalendlyWebhook();
              setMessage(res.ok ? "Webhook subscribed." : res.error ?? "Failed.");
            })
          }
        >
          {props.webhookUri ? "Re-subscribe webhook" : "Subscribe webhook"}
        </Button>
        {props.webhookUri && (
          <p className="mt-2 break-all text-xs text-muted-foreground">
            Active subscription: {props.webhookUri}
          </p>
        )}
        {message && <p className="mt-2 text-sm">{message}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + build the page**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors. (If `@/components/ui/input` or `button` paths differ, match the imports used by `app/[locale]/(routes)/admin/crm-settings/_components/ConfigAddDialog.tsx`.)

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/admin/calendar-settings"
git commit -m "feat(calendar): Calendly admin settings page + org webhook subscription"
```

---

### Task 8: Google OAuth — client helper + authorize/callback routes

**Files:**
- Create: `lib/crm/calendar/google.ts`
- Create: `app/api/profile/calendar-connections/google/authorize/route.ts`
- Create: `app/api/profile/calendar-connections/google/callback/route.ts`
- Modify: `package.json` (add `googleapis`)
- Modify: `.env.example` if present (document `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`)

**Interfaces:**
- Produces:
  - `getGoogleOAuthClient(): OAuth2Client` — configured from `GOOGLE_CALENDAR_CLIENT_ID` / `GOOGLE_CALENDAR_CLIENT_SECRET` / redirect `${NEXT_PUBLIC_APP_URL}/api/profile/calendar-connections/google/callback`.
  - `getGoogleAuthUrl(): string` — offline access, scope `calendar.readonly`, `prompt: "consent"`.
  - `getCalendarClientForConnection(connection: { refreshTokenEncrypted: string }): calendar_v3.Calendar` — decrypts the refresh token; googleapis auto-refreshes access tokens.
  - `GET /api/profile/calendar-connections/google/authorize` → 302 to Google consent (session required).
  - `GET /api/profile/calendar-connections/google/callback` → exchanges `code`, resolves the calendar's email via `calendarList.get("primary")`, upserts `CalendarConnection`, redirects to `/profile`.

- [ ] **Step 1: Add dependency**

```bash
pnpm add googleapis
```

- [ ] **Step 2: Implement the helper**

```typescript
// lib/crm/calendar/google.ts
import { google, calendar_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { decrypt } from "@/lib/email-crypto";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

export function getGoogleOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/profile/calendar-connections/google/callback`
  );
}

export function getGoogleAuthUrl(): string {
  return getGoogleOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export function getCalendarClientForConnection(connection: {
  refreshTokenEncrypted: string;
}): calendar_v3.Calendar {
  const auth = getGoogleOAuthClient();
  auth.setCredentials({ refresh_token: decrypt(connection.refreshTokenEncrypted) });
  return google.calendar({ version: "v3", auth });
}
```

- [ ] **Step 3: Implement the authorize route**

```typescript
// app/api/profile/calendar-connections/google/authorize/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getGoogleAuthUrl } from "@/lib/crm/calendar/google";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(getGoogleAuthUrl());
}
```

- [ ] **Step 4: Implement the callback route**

```typescript
// app/api/profile/calendar-connections/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { encrypt } from "@/lib/email-crypto";
import { getGoogleOAuthClient } from "@/lib/crm/calendar/google";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  if (!code) return NextResponse.redirect(`${appUrl}/profile?calendar=error`);

  try {
    const auth = getGoogleOAuthClient();
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${appUrl}/profile?calendar=no-refresh-token`);
    }
    auth.setCredentials(tokens);

    const calendar = google.calendar({ version: "v3", auth });
    const primary = await calendar.calendarList.get({ calendarId: "primary" });
    const accountEmail = primary.data.id;
    if (!accountEmail) {
      return NextResponse.redirect(`${appUrl}/profile?calendar=error`);
    }

    await prismadb.calendarConnection.upsert({
      where: {
        userId_provider_accountEmail: {
          userId: session.user.id,
          provider: "google",
          accountEmail,
        },
      },
      update: {
        refreshTokenEncrypted: encrypt(tokens.refresh_token),
        accessTokenEncrypted: tokens.access_token ? encrypt(tokens.access_token) : null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
        lastSyncError: null,
        syncToken: null, // force a fresh full-window sync
      },
      create: {
        userId: session.user.id,
        provider: "google",
        accountEmail,
        refreshTokenEncrypted: encrypt(tokens.refresh_token),
        accessTokenEncrypted: tokens.access_token ? encrypt(tokens.access_token) : null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    return NextResponse.redirect(`${appUrl}/profile?calendar=connected`);
  } catch (error) {
    console.error("[google-calendar-callback]", error);
    return NextResponse.redirect(`${appUrl}/profile?calendar=error`);
  }
}
```

- [ ] **Step 5: Document env vars**

If `.env.example` exists, add:

```
# Google Calendar sync (AQUNAMA Phase 4) — Workspace-internal OAuth app
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
```

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml lib/crm/calendar app/api/profile .env.example 2>/dev/null; git commit -m "feat(calendar): Google Calendar OAuth connect flow (readonly scope)"
```

---

### Task 9: Google event normalizer + polling Inngest functions

**Files:**
- Create: `lib/crm/calendar/google-normalize.ts`
- Test: `lib/crm/calendar/__tests__/google-normalize.test.ts`
- Create: `inngest/functions/calendar/google-sync-all.ts`
- Create: `inngest/functions/calendar/google-sync-connection.ts`
- Modify: `app/api/inngest/route.ts` (register both)

**Interfaces:**
- Consumes: `getCalendarClientForConnection` (Task 8), `upsertCalendarEvent` (Task 4), `CalendarEventInput` (Task 3).
- Produces:
  - `normalizeGoogleEvent(ev: calendar_v3.Schema$Event, opts: { connectionId: string; accountEmail: string }): CalendarEventInput | { skip: string }` — pure, fully unit-tested.
  - `googleCalendarSyncAll` — cron `*/15 * * * *`, fans out `"crm/calendar.google-sync"` per active google connection (mirrors `emailSyncAll`).
  - `googleCalendarSyncConnection` — event `"crm/calendar.google-sync"` (`data: { connectionId: string }`); incremental `events.list` with `syncToken`, full ±60-day window on first run or `410`; deactivates the connection after auth failure.

Skip rules (Google): no `start.dateTime` (all-day) → `{skip:"all-day"}`; rep declined (`attendees[].self === true && responseStatus === "declined"`) → `{skip:"declined"}`; no counterparty after removing the rep's own address and same-domain colleagues → `{skip:"no-counterparty"}`; `status === "cancelled"` → a minimal cancelled input (only `externalId`/`status` matter downstream).

- [ ] **Step 1: Write the failing normalizer test**

```typescript
// lib/crm/calendar/__tests__/google-normalize.test.ts
import { normalizeGoogleEvent } from "../google-normalize";

const OPTS = { connectionId: "conn1", accountEmail: "rep@aqunama.com" };

function ev(overrides: object = {}) {
  return {
    id: "gev1",
    iCalUID: "uid1@google.com",
    status: "confirmed",
    summary: "Client sync",
    start: { dateTime: "2026-07-21T10:00:00+02:00" },
    end: { dateTime: "2026-07-21T10:30:00+02:00" },
    attendees: [
      { email: "rep@aqunama.com", self: true, responseStatus: "accepted" },
      { email: "jane@client.com", responseStatus: "accepted" },
    ],
    ...overrides,
  };
}

describe("normalizeGoogleEvent", () => {
  it("normalizes a client meeting", () => {
    const res = normalizeGoogleEvent(ev(), OPTS);
    expect(res).toMatchObject({
      source: "google",
      externalId: "gev1",
      iCalUID: "uid1@google.com",
      connectionId: "conn1",
      title: "Client sync",
      counterpartyEmails: ["jane@client.com"],
      hostEmail: "rep@aqunama.com",
      status: "scheduled",
    });
    expect((res as { startAt: Date }).startAt.toISOString()).toBe("2026-07-21T08:00:00.000Z");
  });

  it("skips all-day events", () => {
    expect(normalizeGoogleEvent(ev({ start: { date: "2026-07-21" }, end: { date: "2026-07-22" } }), OPTS))
      .toEqual({ skip: "all-day" });
  });

  it("skips events the rep declined", () => {
    const declined = ev({
      attendees: [
        { email: "rep@aqunama.com", self: true, responseStatus: "declined" },
        { email: "jane@client.com" },
      ],
    });
    expect(normalizeGoogleEvent(declined, OPTS)).toEqual({ skip: "declined" });
  });

  it("skips internal meetings (same-domain attendees only)", () => {
    const internal = ev({
      attendees: [
        { email: "rep@aqunama.com", self: true },
        { email: "colleague@aqunama.com" },
      ],
    });
    expect(normalizeGoogleEvent(internal, OPTS)).toEqual({ skip: "no-counterparty" });
  });

  it("skips events without attendees", () => {
    expect(normalizeGoogleEvent(ev({ attendees: undefined }), OPTS))
      .toEqual({ skip: "no-counterparty" });
  });

  it("maps cancelled events to a cancelled input", () => {
    const res = normalizeGoogleEvent(
      { id: "gev1", status: "cancelled" }, OPTS
    );
    expect(res).toMatchObject({ source: "google", externalId: "gev1", status: "cancelled" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest lib/crm/calendar/__tests__/google-normalize.test.ts`
Expected: FAIL — cannot find module `../google-normalize`.

- [ ] **Step 3: Implement the normalizer**

```typescript
// lib/crm/calendar/google-normalize.ts
import type { calendar_v3 } from "googleapis";
import type { CalendarEventInput } from "./types";

export type NormalizeResult = CalendarEventInput | { skip: string };

export function normalizeGoogleEvent(
  ev: calendar_v3.Schema$Event,
  opts: { connectionId: string; accountEmail: string }
): NormalizeResult {
  if (!ev.id) return { skip: "no-id" };

  if (ev.status === "cancelled") {
    // Cancelled payloads are sparse; downstream only needs the identity.
    return {
      source: "google",
      externalId: ev.id,
      iCalUID: ev.iCalUID ?? null,
      connectionId: opts.connectionId,
      title: ev.summary ?? "Meeting",
      startAt: ev.start?.dateTime ? new Date(ev.start.dateTime) : new Date(0),
      endAt: null,
      counterpartyEmails: [],
      hostEmail: opts.accountEmail,
      status: "cancelled",
      rawPayload: ev,
    };
  }

  if (!ev.start?.dateTime) return { skip: "all-day" };

  const attendees = ev.attendees ?? [];
  const self = attendees.find((a) => a.self);
  if (self?.responseStatus === "declined") return { skip: "declined" };

  const repDomain = opts.accountEmail.split("@")[1]?.toLowerCase();
  const counterparty = attendees
    .map((a) => a.email?.toLowerCase())
    .filter((e): e is string => Boolean(e))
    .filter((e) => e !== opts.accountEmail.toLowerCase())
    .filter((e) => e.split("@")[1] !== repDomain);
  if (counterparty.length === 0) return { skip: "no-counterparty" };

  return {
    source: "google",
    externalId: ev.id,
    iCalUID: ev.iCalUID ?? null,
    connectionId: opts.connectionId,
    title: ev.summary ?? "Meeting",
    startAt: new Date(ev.start.dateTime),
    endAt: ev.end?.dateTime ? new Date(ev.end.dateTime) : null,
    counterpartyEmails: counterparty,
    hostEmail: opts.accountEmail,
    status: "scheduled",
    rawPayload: ev,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest lib/crm/calendar/__tests__/google-normalize.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Implement the fan-out cron**

```typescript
// inngest/functions/calendar/google-sync-all.ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";

export const googleCalendarSyncAll = inngest.createFunction(
  {
    id: "crm-google-calendar-sync-all",
    name: "CRM: Google Calendar sync (all connections)",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async () => {
    const connections = await prismadb.calendarConnection.findMany({
      where: { isActive: true, provider: "google" },
      select: { id: true },
    });
    if (connections.length === 0) return { synced: 0 };

    await inngest.send(
      connections.map((c) => ({
        name: "crm/calendar.google-sync" as const,
        data: { connectionId: c.id },
      }))
    );
    return { synced: connections.length };
  }
);
```

- [ ] **Step 6: Implement the per-connection sync**

```typescript
// inngest/functions/calendar/google-sync-connection.ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getCalendarClientForConnection } from "@/lib/crm/calendar/google";
import { normalizeGoogleEvent } from "@/lib/crm/calendar/google-normalize";
import { upsertCalendarEvent } from "@/lib/crm/calendar/sync";
import type { calendar_v3 } from "googleapis";

const WINDOW_DAYS = 60;
const AUTH_ERROR_CODES = new Set([401, 403]);

export const googleCalendarSyncConnection = inngest.createFunction(
  {
    id: "crm-google-calendar-sync-connection",
    name: "CRM: Google Calendar sync (one connection)",
    retries: 3,
  },
  { event: "crm/calendar.google-sync" },
  async ({ event, step }) => {
    const { connectionId } = event.data as { connectionId: string };

    const result = await step.run("sync", async () => {
      const connection = await prismadb.calendarConnection.findUnique({
        where: { id: connectionId },
      });
      if (!connection || !connection.isActive) return { skipped: true };

      const calendar = getCalendarClientForConnection(connection);
      const items: calendar_v3.Schema$Event[] = [];
      let syncToken = connection.syncToken;
      let nextSyncToken: string | null | undefined;

      const list = async (params: calendar_v3.Params$Resource$Events$List) => {
        let pageToken: string | undefined;
        do {
          const res = await calendar.events.list({ ...params, pageToken, maxResults: 250 });
          items.push(...(res.data.items ?? []));
          pageToken = res.data.nextPageToken ?? undefined;
          nextSyncToken = res.data.nextSyncToken ?? nextSyncToken;
        } while (pageToken);
      };

      try {
        if (syncToken) {
          try {
            await list({ calendarId: "primary", singleEvents: true, syncToken });
          } catch (error) {
            const code = (error as { code?: number }).code;
            if (code !== 410) throw error;
            // Sync token expired: fall back to a full window sync.
            syncToken = null;
            items.length = 0;
          }
        }
        if (!syncToken) {
          const now = Date.now();
          await list({
            calendarId: "primary",
            singleEvents: true,
            timeMin: new Date(now - WINDOW_DAYS * 86400000).toISOString(),
            timeMax: new Date(now + WINDOW_DAYS * 86400000).toISOString(),
          });
        }
      } catch (error) {
        const code = (error as { code?: number }).code;
        const message = error instanceof Error ? error.message : String(error);
        await prismadb.calendarConnection.update({
          where: { id: connection.id },
          data: {
            lastSyncError: message.slice(0, 500),
            ...(code !== undefined && AUTH_ERROR_CODES.has(code) ? { isActive: false } : {}),
          },
        });
        throw error;
      }

      const counts = { created: 0, updated: 0, cancelled: 0, skipped: 0 };
      for (const ev of items) {
        const normalized = normalizeGoogleEvent(ev, {
          connectionId: connection.id,
          accountEmail: connection.accountEmail,
        });
        if ("skip" in normalized) {
          counts.skipped += 1;
          continue;
        }
        const res = await upsertCalendarEvent(normalized);
        counts[res.action] += 1;
      }

      await prismadb.calendarConnection.update({
        where: { id: connection.id },
        data: {
          syncToken: nextSyncToken ?? syncToken,
          lastSyncedAt: new Date(),
          lastSyncError: null,
        },
      });

      return { events: items.length, ...counts };
    });

    return result;
  }
);
```

- [ ] **Step 7: Register both in `app/api/inngest/route.ts`**

```typescript
import { googleCalendarSyncAll } from "@/inngest/functions/calendar/google-sync-all";
import { googleCalendarSyncConnection } from "@/inngest/functions/calendar/google-sync-connection";
// ...append to functions array after calendarProcessEvent:
    googleCalendarSyncAll,
    googleCalendarSyncConnection,
```

- [ ] **Step 8: Typecheck + run calendar tests**

```bash
pnpm exec tsc --noEmit && pnpm jest lib/crm/calendar
```

Expected: no type errors; all calendar tests pass.

- [ ] **Step 9: Commit**

```bash
git add lib/crm/calendar inngest app/api/inngest/route.ts
git commit -m "feat(calendar): Google Calendar incremental polling sync via Inngest"
```

---

### Task 10: Profile UI — calendar connections list + disconnect

**Files:**
- Create: `app/api/profile/calendar-connections/route.ts` (GET list)
- Create: `app/api/profile/calendar-connections/[id]/route.ts` (DELETE)
- Create: `app/[locale]/(routes)/profile/components/CalendarConnectionsList.tsx`
- Modify: `app/[locale]/(routes)/profile/components/tabs/EmailAccountsTabContent.tsx` **or** the profile tabs container — add the calendar section beside the email accounts (inspect `app/[locale]/(routes)/profile/page.tsx` to place it the same way `EmailAccountsList` is placed).

**Interfaces:**
- Consumes: `CalendarConnection` model (Task 1); authorize route (Task 8).
- Produces: `GET /api/profile/calendar-connections` → `{ connections: Array<{ id, provider, accountEmail, isActive, lastSyncedAt, lastSyncError }> }` (session user's only); `DELETE /api/profile/calendar-connections/:id` → 204 (owner only).

- [ ] **Step 1: Implement list route**

```typescript
// app/api/profile/calendar-connections/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const connections = await prismadb.calendarConnection.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      accountEmail: true,
      isActive: true,
      lastSyncedAt: true,
      lastSyncError: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ connections });
}
```

- [ ] **Step 2: Implement delete route**

```typescript
// app/api/profile/calendar-connections/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const connection = await prismadb.calendarConnection.findUnique({ where: { id } });
  if (!connection || connection.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prismadb.calendarConnection.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Implement the list component**

```tsx
// app/[locale]/(routes)/profile/components/CalendarConnectionsList.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Connection = {
  id: string;
  provider: string;
  accountEmail: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
};

export function CalendarConnectionsList() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/profile/calendar-connections");
    if (res.ok) setConnections((await res.json()).connections);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function disconnect(id: string) {
    await fetch(`/api/profile/calendar-connections/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Calendar connections</h3>
        <Button asChild size="sm">
          <a href="/api/profile/calendar-connections/google/authorize">
            Connect Google Calendar
          </a>
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : connections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No calendars connected.</p>
      ) : (
        <ul className="space-y-2">
          {connections.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded border p-2">
              <div>
                <p className="text-sm font-medium">{c.accountEmail}</p>
                <p className="text-xs text-muted-foreground">
                  {c.isActive
                    ? c.lastSyncedAt
                      ? `Synced ${new Date(c.lastSyncedAt).toLocaleString()}`
                      : "Waiting for first sync"
                    : `Needs reconnect${c.lastSyncError ? `: ${c.lastSyncError}` : ""}`}
                </p>
              </div>
              <div className="flex gap-2">
                {!c.isActive && (
                  <Button asChild size="sm" variant="secondary">
                    <a href="/api/profile/calendar-connections/google/authorize">Reconnect</a>
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => disconnect(c.id)}>
                  Disconnect
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Mount it on the profile page**

Read `app/[locale]/(routes)/profile/page.tsx` and add `<CalendarConnectionsList />` in the same section/tab where `EmailAccountsList` is rendered (import from `./components/CalendarConnectionsList`). Follow the file's existing layout structure exactly.

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/profile "app/[locale]/(routes)/profile"
git commit -m "feat(calendar): profile UI for Google Calendar connections"
```

---

### Task 11: Full verification gate + roadmap update

**Files:**
- Modify: `docs/superpowers/plans/2026-07-16-aqunama-roadmap.md` (mark Plan 4 A+B implemented)

**Interfaces:** none — verification and bookkeeping.

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: all tests pass (921 baseline + new calendar tests, 0 failures).

- [ ] **Step 2: Typecheck + production build**

```bash
pnpm exec tsc --noEmit && pnpm build
```

Expected: both succeed.

- [ ] **Step 3: Update the roadmap**

In `docs/superpowers/plans/2026-07-16-aqunama-roadmap.md`, change the Plan 4 heading to:

```markdown
## Plan 4 — Calendar Sync ✅ Milestones A+B implemented (2026-07-19)

Full plan: `docs/superpowers/plans/2026-07-19-aqunama-p4-calendar-sync.md` — spec: `docs/superpowers/specs/2026-07-19-aqunama-p4-calendar-sync-design.md`. Decisions: A+B only (outbound two-way deferred); org-scope Calendly webhook; Workspace-internal Google OAuth, readonly scope, 15-min Inngest polling; unmatched Calendly invitees auto-create Targets; synced meetings restart the 45-day kill clock.
```

(Keep the original stub below it for reference, as Plans 2–3 did.)

- [ ] **Step 4: Deployment checklist note**

Manual steps that code cannot do (record in the commit message body or runbook):
1. Create the Google Cloud OAuth client (Internal consent screen, Workspace domain), set `GOOGLE_CALENDAR_CLIENT_ID`/`GOOGLE_CALENDAR_CLIENT_SECRET` in Coolify env.
2. In `/admin/calendar-settings`, save the Calendly org API token + signing key, then click "Subscribe webhook" (requires paid Calendly plan).
3. Each rep connects Google Calendar from `/profile`.

- [ ] **Step 5: Commit + push**

```bash
git add docs/superpowers/plans/2026-07-16-aqunama-roadmap.md
git commit -m "docs: mark AQUNAMA Plan 4 milestones A+B implemented"
git push origin dev
```

Then follow the standard flow: verify remote dev, PR `dev` → `main`.
