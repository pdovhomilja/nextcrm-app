# AQUNAMA Phase 4 Milestone C — Outbound + Two-Way Calendar Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CRM meeting activities flow outbound to the rep's Google Calendar as real invites (attendee + `sendUpdates: "all"`), completing two-way sync on top of the shipped Milestone A+B inbound pipeline.

**Architecture:** Activity writers emit `"crm/calendar.outbound-sync"` `{activityId, action}` via a fire-and-forget helper; an Inngest function loads activity + mapping + the creator's `readwrite` connection, runs a pure decision function (skip/insert/patch/delete), calls the Google Calendar API, and updates the shared `crm_CalendarEvents` mapping — which is what makes the inbound poller classify the event as unchanged (echo suppression). Write scope is a per-rep opt-in upgrade through the existing OAuth flow. Spec: `docs/superpowers/specs/2026-07-19-aqunama-p4c-outbound-calendar-design.md`.

**Tech Stack:** Next.js 16, Prisma 7, Inngest 4, `googleapis` (already installed), jest 30.

## Global Constraints

- Migrations: never `prisma migrate dev` (dev-DB drift). Author via `pnpm exec prisma migrate diff --from-schema /tmp/schema-old.prisma --to-schema prisma/schema.prisma --script` (Prisma 7 flag names) into a timestamped folder; verify by fresh-DB replay in a disposable pgvector container.
- Outbound source: **meeting activities only**; Calendly-sourced events are never touched outbound.
- Google write calls always use `sendUpdates: "all"`; write scope is `https://www.googleapis.com/auth/calendar.events` **in addition to** `calendar.readonly`.
- New Inngest event name exactly: `"crm/calendar.outbound-sync"`; function id `"crm-calendar-outbound-sync"`. Repo Inngest style: `triggers: [{ event: ... }]` INSIDE the config object.
- `CalendarConnection.scopeLevel`: `String @default("readonly")`, values `"readonly" | "readwrite"`, derived from `tokens.scope` at token exchange — never from what was requested.
- Emit failures must never fail the user's save (fire-and-forget with logged error).
- Run jest via `./node_modules/.bin/jest <path>` (NEVER `pnpm test` — ERR_PNPM_IGNORED_BUILDS in this environment). Finish tasks with `pnpm exec tsc --noEmit` clean.
- All work on `dev`; conventional commits; commit per task.
- Existing inbound suites (`lib/crm/calendar`, `app/api/crm/calendar`, `inngest/functions/calendar`) must stay green unchanged.

---

### Task 1: Schema — `scopeLevel` on CalendarConnection

**Files:**
- Modify: `prisma/schema.prisma` (one field)
- Create: `prisma/migrations/<timestamp>_aqunama_p4c_scope_level/migration.sql`

**Interfaces:**
- Produces: `CalendarConnection.scopeLevel: string` (default `"readonly"`) used by Tasks 2, 4, 6.

- [ ] **Step 1: Add the field** — in `model CalendarConnection`, directly under `syncToken String?`:

```prisma
  scopeLevel            String           @default("readonly")
```

- [ ] **Step 2: Generate migration SQL (no migrate dev)**

```bash
git show HEAD:prisma/schema.prisma > /tmp/schema-old.prisma
DIR=prisma/migrations/$(date +%Y%m%d%H%M%S)_aqunama_p4c_scope_level; mkdir -p $DIR
pnpm exec prisma migrate diff --from-schema /tmp/schema-old.prisma --to-schema prisma/schema.prisma --script > $DIR/migration.sql
```

Inspect: exactly one `ALTER TABLE "CalendarConnection" ADD COLUMN "scopeLevel" TEXT NOT NULL DEFAULT 'readonly';` — nothing else.

- [ ] **Step 3: Fresh-DB replay**

```bash
docker run -d --name p4c-migrate-check -e POSTGRES_PASSWORD=postgres -p 55433:5432 pgvector/pgvector:pg16
sleep 3
docker exec p4c-migrate-check psql -U postgres -c 'CREATE DATABASE p4c;'
DATABASE_URL=postgresql://postgres:postgres@localhost:55433/p4c pnpm exec prisma migrate deploy
docker rm -f p4c-migrate-check
```

Expected: full chain applies, ending with `…_aqunama_p4c_scope_level`.

- [ ] **Step 4: Regenerate + typecheck**

Run: `pnpm exec prisma generate && pnpm exec tsc --noEmit` — clean.

- [ ] **Step 5: Commit**

```bash
git add prisma
git commit -m "feat(calendar): scopeLevel on CalendarConnection for write-scope upgrade"
```

---

### Task 2: Scope parsing + OAuth upgrade flow

**Files:**
- Modify: `lib/crm/calendar/google.ts`
- Modify: `app/api/profile/calendar-connections/google/authorize/route.ts`
- Modify: `app/api/profile/calendar-connections/google/callback/route.ts`
- Test: `lib/crm/calendar/__tests__/scope-level.test.ts`

**Interfaces:**
- Produces: `scopeLevelFromGrantedScopes(scope: string | null | undefined): "readonly" | "readwrite"` (exported from `lib/crm/calendar/google.ts`); `getGoogleAuthUrl(state: string, level?: "readonly" | "readwrite")`; authorize route honors `?level=readwrite`.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/crm/calendar/__tests__/scope-level.test.ts
import { scopeLevelFromGrantedScopes } from "../google";

describe("scopeLevelFromGrantedScopes", () => {
  it("returns readwrite when calendar.events was granted", () => {
    expect(
      scopeLevelFromGrantedScopes(
        "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events"
      )
    ).toBe("readwrite");
  });

  it("returns readonly for readonly-only grants", () => {
    expect(
      scopeLevelFromGrantedScopes("https://www.googleapis.com/auth/calendar.readonly")
    ).toBe("readonly");
  });

  it("returns readonly for missing scope string", () => {
    expect(scopeLevelFromGrantedScopes(undefined)).toBe("readonly");
    expect(scopeLevelFromGrantedScopes(null)).toBe("readonly");
    expect(scopeLevelFromGrantedScopes("")).toBe("readonly");
  });
});
```

- [ ] **Step 2: Run to verify RED**

Run: `./node_modules/.bin/jest lib/crm/calendar/__tests__/scope-level.test.ts`
Expected: FAIL — `scopeLevelFromGrantedScopes` is not exported.

- [ ] **Step 3: Implement in `lib/crm/calendar/google.ts`**

Replace the `SCOPES` constant and `getGoogleAuthUrl`, and add the parser:

```typescript
const SCOPE_READONLY = "https://www.googleapis.com/auth/calendar.readonly";
const SCOPE_EVENTS = "https://www.googleapis.com/auth/calendar.events";

export type CalendarScopeLevel = "readonly" | "readwrite";

// Derived from what Google actually granted (tokens.scope, space-delimited),
// never from what we requested.
export function scopeLevelFromGrantedScopes(
  scope: string | null | undefined
): CalendarScopeLevel {
  return scope?.split(" ").includes(SCOPE_EVENTS) ? "readwrite" : "readonly";
}

export function getGoogleAuthUrl(
  state: string,
  level: CalendarScopeLevel = "readonly"
): string {
  return getGoogleOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: level === "readwrite" ? [SCOPE_READONLY, SCOPE_EVENTS] : [SCOPE_READONLY],
    state,
  });
}
```

- [ ] **Step 4: Authorize route — accept `?level=readwrite`**

```typescript
// app/api/profile/calendar-connections/google/authorize/route.ts
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getGoogleAuthUrl } from "@/lib/crm/calendar/google";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const level = req.nextUrl.searchParams.get("level") === "readwrite" ? "readwrite" : "readonly";
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(getGoogleAuthUrl(state, level));
  res.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/api/profile/calendar-connections/google",
  });
  return res;
}
```

- [ ] **Step 5: Callback — persist granted scope level**

In the callback route, import the parser and add `scopeLevel` to both upsert branches:

```typescript
import { getGoogleOAuthClient, scopeLevelFromGrantedScopes } from "@/lib/crm/calendar/google";
// after `const { tokens } = await auth.getToken(code);`:
const scopeLevel = scopeLevelFromGrantedScopes(tokens.scope);
// in upsert update: { ..., scopeLevel },  in upsert create: { ..., scopeLevel },
```

- [ ] **Step 6: GREEN + typecheck**

Run: `./node_modules/.bin/jest lib/crm/calendar/__tests__/scope-level.test.ts` — 3/3 PASS.
Run: `pnpm exec tsc --noEmit` — clean.

- [ ] **Step 7: Commit**

```bash
git add lib/crm/calendar app/api/profile
git commit -m "feat(calendar): write-scope OAuth upgrade with granted-scope detection"
```

---

### Task 3: Outbound decision function + event builder + counterparty resolver

**Files:**
- Create: `lib/crm/calendar/outbound.ts`
- Test: `lib/crm/calendar/__tests__/outbound.test.ts`

**Interfaces:**
- Produces (all exported from `lib/crm/calendar/outbound.ts`; consumed by Task 4):

```typescript
export type OutboundAction = "upsert" | "cancel";
export type OutboundDecision =
  | { do: "skip"; reason: string }
  | { do: "insert" }
  | { do: "patch"; eventId: string }
  | { do: "delete"; eventId: string };

export function decideOutboundAction(input: {
  action: OutboundAction;
  activity: { type: string; date: Date | null; status: string; deletedAt: Date | null } | null;
  mapping: { source: string; externalId: string } | null;
  hasWriteConnection: boolean;
}): OutboundDecision;

export function buildOutboundEvent(
  activity: { title: string; description: string | null; date: Date; duration: number | null },
  counterpartyEmail: string | null
): calendar_v3.Schema$Event;

export function resolveCounterpartyEmail(
  links: Array<{ entityType: string; entityId: string }>
): Promise<string | null>;
```

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/crm/calendar/__tests__/outbound.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { findFirst: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
    crm_Leads: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  decideOutboundAction,
  buildOutboundEvent,
  resolveCounterpartyEmail,
} from "../outbound";

const contacts = prismadb.crm_Contacts.findFirst as jest.Mock;
const targets = prismadb.crm_Targets.findFirst as jest.Mock;
const leads = prismadb.crm_Leads.findFirst as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const MEETING = {
  type: "meeting",
  date: new Date("2026-07-25T10:00:00Z"),
  status: "scheduled",
  deletedAt: null,
};

describe("decideOutboundAction", () => {
  it("skips missing / non-meeting / calendly-owned / no-write-connection", () => {
    expect(
      decideOutboundAction({ action: "upsert", activity: null, mapping: null, hasWriteConnection: true })
    ).toEqual({ do: "skip", reason: "not-found" });
    expect(
      decideOutboundAction({ action: "upsert", activity: { ...MEETING, type: "call" }, mapping: null, hasWriteConnection: true })
    ).toEqual({ do: "skip", reason: "not-a-meeting" });
    expect(
      decideOutboundAction({ action: "upsert", activity: MEETING, mapping: { source: "calendly", externalId: "x" }, hasWriteConnection: true })
    ).toEqual({ do: "skip", reason: "calendly-owned" });
    expect(
      decideOutboundAction({ action: "upsert", activity: MEETING, mapping: null, hasWriteConnection: false })
    ).toEqual({ do: "skip", reason: "no-write-connection" });
  });

  it("inserts new meetings, patches mapped ones", () => {
    expect(
      decideOutboundAction({ action: "upsert", activity: MEETING, mapping: null, hasWriteConnection: true })
    ).toEqual({ do: "insert" });
    expect(
      decideOutboundAction({ action: "upsert", activity: MEETING, mapping: { source: "google", externalId: "ev1" }, hasWriteConnection: true })
    ).toEqual({ do: "patch", eventId: "ev1" });
  });

  it("cancel deletes when mapped to google, skips when never pushed", () => {
    expect(
      decideOutboundAction({ action: "cancel", activity: MEETING, mapping: { source: "google", externalId: "ev1" }, hasWriteConnection: true })
    ).toEqual({ do: "delete", eventId: "ev1" });
    expect(
      decideOutboundAction({ action: "cancel", activity: MEETING, mapping: null, hasWriteConnection: true })
    ).toEqual({ do: "skip", reason: "never-pushed" });
  });

  it("treats cancelled/deleted upserts as cancels", () => {
    expect(
      decideOutboundAction({
        action: "upsert",
        activity: { ...MEETING, status: "cancelled" },
        mapping: { source: "google", externalId: "ev1" },
        hasWriteConnection: true,
      })
    ).toEqual({ do: "delete", eventId: "ev1" });
    expect(
      decideOutboundAction({
        action: "upsert",
        activity: { ...MEETING, deletedAt: new Date() },
        mapping: null,
        hasWriteConnection: true,
      })
    ).toEqual({ do: "skip", reason: "never-pushed" });
  });

  it("skips upserts without a date", () => {
    expect(
      decideOutboundAction({ action: "upsert", activity: { ...MEETING, date: null }, mapping: null, hasWriteConnection: true })
    ).toEqual({ do: "skip", reason: "no-date" });
  });
});

describe("buildOutboundEvent", () => {
  it("builds a timed event with attendee and 30-min default duration", () => {
    const ev = buildOutboundEvent(
      { title: "Demo call", description: "Agenda", date: new Date("2026-07-25T10:00:00Z"), duration: null },
      "jane@client.com"
    );
    expect(ev).toEqual({
      summary: "Demo call",
      description: "Agenda",
      start: { dateTime: "2026-07-25T10:00:00.000Z" },
      end: { dateTime: "2026-07-25T10:30:00.000Z" },
      attendees: [{ email: "jane@client.com" }],
    });
  });

  it("omits attendees for private blocks and uses real duration", () => {
    const ev = buildOutboundEvent(
      { title: "Prep", description: null, date: new Date("2026-07-25T10:00:00Z"), duration: 45 },
      null
    );
    expect(ev.attendees).toBeUndefined();
    expect(ev.end).toEqual({ dateTime: "2026-07-25T10:45:00.000Z" });
  });
});

describe("resolveCounterpartyEmail", () => {
  it("prefers contact over target over lead, first link with an email wins", async () => {
    contacts.mockResolvedValue({ email: "Jane@Client.com" });
    const email = await resolveCounterpartyEmail([
      { entityType: "contact", entityId: "c1" },
      { entityType: "target", entityId: "t1" },
    ]);
    expect(email).toBe("jane@client.com");
    expect(targets).not.toHaveBeenCalled();
  });

  it("falls through link types and returns null when nothing has an email", async () => {
    targets.mockResolvedValue(null);
    leads.mockResolvedValue(null);
    expect(
      await resolveCounterpartyEmail([
        { entityType: "target", entityId: "t1" },
        { entityType: "lead", entityId: "l1" },
        { entityType: "opportunity", entityId: "o1" },
      ])
    ).toBeNull();
  });
});
```

- [ ] **Step 2: RED** — `./node_modules/.bin/jest lib/crm/calendar/__tests__/outbound.test.ts` fails: cannot find module `../outbound`.

- [ ] **Step 3: Implement `lib/crm/calendar/outbound.ts`**

```typescript
import type { calendar_v3 } from "googleapis";
import { prismadb } from "@/lib/prisma";

export type OutboundAction = "upsert" | "cancel";

export type OutboundDecision =
  | { do: "skip"; reason: string }
  | { do: "insert" }
  | { do: "patch"; eventId: string }
  | { do: "delete"; eventId: string };

const DEFAULT_DURATION_MINUTES = 30;

export function decideOutboundAction(input: {
  action: OutboundAction;
  activity: { type: string; date: Date | null; status: string; deletedAt: Date | null } | null;
  mapping: { source: string; externalId: string } | null;
  hasWriteConnection: boolean;
}): OutboundDecision {
  const { action, activity, mapping, hasWriteConnection } = input;
  if (!activity) return { do: "skip", reason: "not-found" };
  if (activity.type !== "meeting") return { do: "skip", reason: "not-a-meeting" };
  if (mapping?.source === "calendly") return { do: "skip", reason: "calendly-owned" };
  if (!hasWriteConnection) return { do: "skip", reason: "no-write-connection" };

  const isCancellation =
    action === "cancel" || activity.status === "cancelled" || activity.deletedAt !== null;
  if (isCancellation) {
    return mapping?.source === "google"
      ? { do: "delete", eventId: mapping.externalId }
      : { do: "skip", reason: "never-pushed" };
  }

  if (!activity.date) return { do: "skip", reason: "no-date" };
  return mapping
    ? { do: "patch", eventId: mapping.externalId }
    : { do: "insert" };
}

export function buildOutboundEvent(
  activity: { title: string; description: string | null; date: Date; duration: number | null },
  counterpartyEmail: string | null
): calendar_v3.Schema$Event {
  const start = activity.date;
  const end = new Date(
    start.getTime() + (activity.duration ?? DEFAULT_DURATION_MINUTES) * 60000
  );
  return {
    summary: activity.title,
    description: activity.description ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    ...(counterpartyEmail ? { attendees: [{ email: counterpartyEmail }] } : {}),
  };
}

// Spec: contact -> target -> lead; first linked entity with an email.
export async function resolveCounterpartyEmail(
  links: Array<{ entityType: string; entityId: string }>
): Promise<string | null> {
  const byType = (t: string) => links.filter((l) => l.entityType === t);
  for (const link of byType("contact")) {
    const row = await prismadb.crm_Contacts.findFirst({
      where: { id: link.entityId, deletedAt: null },
      select: { email: true, personal_email: true },
    });
    const email = row?.email ?? row?.personal_email;
    if (email) return email.toLowerCase();
  }
  for (const link of byType("target")) {
    const row = await prismadb.crm_Targets.findFirst({
      where: { id: link.entityId, deletedAt: null },
      select: { email: true, personal_email: true, company_email: true },
    });
    const email = row?.email ?? row?.personal_email ?? row?.company_email;
    if (email) return email.toLowerCase();
  }
  for (const link of byType("lead")) {
    const row = await prismadb.crm_Leads.findFirst({
      where: { id: link.entityId, deletedAt: null },
      select: { email: true },
    });
    if (row?.email) return row.email.toLowerCase();
  }
  return null;
}
```

- [ ] **Step 4: GREEN** — same jest command, all tests pass; `pnpm exec tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add lib/crm/calendar
git commit -m "feat(calendar): outbound decision, event builder, counterparty resolver"
```

---

### Task 4: Inngest outbound-sync function + registration

**Files:**
- Create: `inngest/functions/calendar/outbound-sync.ts`
- Modify: `app/api/inngest/route.ts` (import + register after `googleCalendarSyncConnection`)

**Interfaces:**
- Consumes: `decideOutboundAction`/`buildOutboundEvent`/`resolveCounterpartyEmail` (Task 3), `getCalendarClientForConnection` (existing), `isAuthRevocationError` (exported from `inngest/functions/calendar/google-sync-connection.ts`).
- Produces: Inngest function `calendarOutboundSync`, event `"crm/calendar.outbound-sync"` with `data: { activityId: string; action: "upsert" | "cancel" }` — emitted by Task 5's helper.

- [ ] **Step 1: Implement the function**

```typescript
// inngest/functions/calendar/outbound-sync.ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getCalendarClientForConnection } from "@/lib/crm/calendar/google";
import {
  decideOutboundAction,
  buildOutboundEvent,
  resolveCounterpartyEmail,
  type OutboundAction,
} from "@/lib/crm/calendar/outbound";
import { isAuthRevocationError } from "@/inngest/functions/calendar/google-sync-connection";

export const calendarOutboundSync = inngest.createFunction(
  {
    id: "crm-calendar-outbound-sync",
    name: "CRM: Calendar outbound sync",
    retries: 3,
    triggers: [{ event: "crm/calendar.outbound-sync" }],
  },
  async ({ event, step }) => {
    const { activityId, action } = event.data as {
      activityId: string;
      action: OutboundAction;
    };

    return step.run("push", async () => {
      const activity = await prismadb.crm_Activities.findUnique({
        where: { id: activityId },
        include: { links: { select: { entityType: true, entityId: true } } },
      });
      const mapping = await prismadb.crm_CalendarEvents.findFirst({
        where: { activityId },
      });
      const connection = activity?.createdBy
        ? await prismadb.calendarConnection.findFirst({
            where: {
              userId: activity.createdBy,
              provider: "google",
              isActive: true,
              scopeLevel: "readwrite",
            },
          })
        : null;

      const decision = decideOutboundAction({
        action,
        activity,
        mapping,
        hasWriteConnection: connection !== null,
      });
      if (decision.do === "skip") return { pushed: false, reason: decision.reason };

      const calendar = getCalendarClientForConnection(connection!);
      try {
        if (decision.do === "delete") {
          try {
            await calendar.events.delete({
              calendarId: "primary",
              eventId: decision.eventId,
              sendUpdates: "all",
            });
          } catch (error) {
            const code = (error as { code?: number }).code;
            // Already gone on Google's side is success.
            if (code !== 404 && code !== 410) throw error;
          }
          await prismadb.crm_CalendarEvents.updateMany({
            where: { activityId },
            data: { status: "cancelled" },
          });
          return { pushed: true, did: "delete" };
        }

        const counterparty = await resolveCounterpartyEmail(activity!.links);
        const body = buildOutboundEvent(
          {
            title: activity!.title,
            description: activity!.description,
            date: activity!.date,
            duration: activity!.duration,
          },
          counterparty
        );
        const endAt = new Date(body.end!.dateTime as string);

        if (decision.do === "patch") {
          await calendar.events.patch({
            calendarId: "primary",
            eventId: decision.eventId,
            sendUpdates: "all",
            requestBody: body,
          });
          await prismadb.crm_CalendarEvents.updateMany({
            where: { activityId },
            data: {
              startAt: activity!.date,
              endAt,
              status: "scheduled",
              attendeeEmails: counterparty ? [counterparty] : [],
            },
          });
          return { pushed: true, did: "patch" };
        }

        const res = await calendar.events.insert({
          calendarId: "primary",
          sendUpdates: "all",
          requestBody: body,
        });
        try {
          await prismadb.crm_CalendarEvents.create({
            data: {
              source: "google",
              externalId: res.data.id!,
              iCalUID: res.data.iCalUID ?? null,
              connectionId: connection!.id,
              activityId,
              startAt: activity!.date,
              endAt,
              attendeeEmails: counterparty ? [counterparty] : [],
              status: "scheduled",
              rawPayload: res.data as object,
            },
          });
        } catch (error) {
          if ((error as { code?: string }).code !== "P2002") throw error;
          // Concurrent duplicate mapping — benign; the event exists on Google.
        }
        return { pushed: true, did: "insert" };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await prismadb.calendarConnection.update({
          where: { id: connection!.id },
          data: {
            lastSyncError: message.slice(0, 500),
            ...(isAuthRevocationError(error) ? { isActive: false } : {}),
          },
        });
        throw error;
      }
    });
  }
);
```

- [ ] **Step 2: Register** — in `app/api/inngest/route.ts`, add after the google sync imports and after `googleCalendarSyncConnection` in the array:

```typescript
import { calendarOutboundSync } from "@/inngest/functions/calendar/outbound-sync";
// ...array:
    calendarOutboundSync,
```

- [ ] **Step 3: Verify** — `pnpm exec tsc --noEmit` clean; `./node_modules/.bin/jest lib/crm/calendar inngest/functions/calendar` all green (no regressions).

- [ ] **Step 4: Commit**

```bash
git add inngest app/api/inngest/route.ts
git commit -m "feat(calendar): inngest outbound push to Google Calendar with invites"
```

---

### Task 5: Emit hooks in activity writers

**Files:**
- Create: `lib/crm/calendar/outbound-emit.ts`
- Test: `lib/crm/calendar/__tests__/outbound-emit.test.ts`
- Modify: `actions/crm/activities/create-activity.ts`, `actions/crm/activities/update-activity.ts`, `actions/crm/activities/delete-activity.ts`
- Modify: `lib/mcp/tools/crm-activities.ts` (create/update/delete handlers)

**Interfaces:**
- Consumes: `inngest` client, `OutboundAction` (Task 3).
- Produces: `emitCalendarOutbound(activityId: string, action: OutboundAction): Promise<void>` — fire-and-forget, never throws.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/crm/calendar/__tests__/outbound-emit.test.ts
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));

import { inngest } from "@/inngest/client";
import { emitCalendarOutbound } from "../outbound-emit";

const send = inngest.send as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("emitCalendarOutbound", () => {
  it("sends the outbound event", async () => {
    send.mockResolvedValue({ ids: ["1"] });
    await emitCalendarOutbound("act1", "upsert");
    expect(send).toHaveBeenCalledWith({
      name: "crm/calendar.outbound-sync",
      data: { activityId: "act1", action: "upsert" },
    });
  });

  it("swallows send failures (never breaks the user's save)", async () => {
    send.mockRejectedValue(new Error("inngest down"));
    await expect(emitCalendarOutbound("act1", "cancel")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: RED** — `./node_modules/.bin/jest lib/crm/calendar/__tests__/outbound-emit.test.ts` fails: cannot find module `../outbound-emit`.

- [ ] **Step 3: Implement**

```typescript
// lib/crm/calendar/outbound-emit.ts
import { inngest } from "@/inngest/client";
import type { OutboundAction } from "./outbound";

// Fire-and-forget: an emit failure must never fail the user's activity save.
export async function emitCalendarOutbound(
  activityId: string,
  action: OutboundAction
): Promise<void> {
  try {
    await inngest.send({
      name: "crm/calendar.outbound-sync",
      data: { activityId, action },
    });
  } catch (error) {
    console.error(
      "[calendar-outbound] emit failed:",
      error instanceof Error ? error.message : String(error)
    );
  }
}
```

- [ ] **Step 4: GREEN** — same jest command, 2/2 pass.

- [ ] **Step 5: Wire the server actions** (each emits only for meetings; place after the successful write, before the return):

`actions/crm/activities/create-activity.ts` — add import `import { emitCalendarOutbound } from "@/lib/crm/calendar/outbound-emit";`; after the `fullActivity` fetch:

```typescript
    if (data.type === "meeting") {
      await emitCalendarOutbound(activity.id, "upsert");
    }
```

`actions/crm/activities/update-activity.ts` — same import; the `$transaction` already returns the updated row as `activity` (it carries `type`); after the transaction:

```typescript
    if (activity.type === "meeting") {
      await emitCalendarOutbound(
        data.id,
        data.status === "cancelled" ? "cancel" : "upsert"
      );
    }
```

`actions/crm/activities/delete-activity.ts` — same import; capture the update result (`const deleted = await (prismadb as any).crm_Activities.update({ ... })`) and after it:

```typescript
    if (deleted.type === "meeting") {
      await emitCalendarOutbound(activityId, "cancel");
    }
```

- [ ] **Step 6: Wire the MCP handlers** in `lib/mcp/tools/crm-activities.ts` (same import at top):

- `crm_create_activity` handler — after the `create`, before `return itemResponse(activity)`:

```typescript
      if (activity.type === "meeting") {
        await emitCalendarOutbound(activity.id, "upsert");
      }
```

- `crm_update_activity` handler — after its `update` call (the returned row carries `type`; adapt the local variable name to the file):

```typescript
      if (updated.type === "meeting") {
        await emitCalendarOutbound(args.id, args.status === "cancelled" ? "cancel" : "upsert");
      }
```

- `crm_delete_activity` handler — after the soft-delete `update` (returned row carries `type`):

```typescript
      if (activity.type === "meeting") {
        await emitCalendarOutbound(args.id, "cancel");
      }
```

- [ ] **Step 7: Verify** — `pnpm exec tsc --noEmit` clean; `./node_modules/.bin/jest lib/crm lib/mcp 2>/dev/null || ./node_modules/.bin/jest lib/crm` green (run whichever suites exist).

- [ ] **Step 8: Commit**

```bash
git add lib/crm/calendar actions/crm/activities lib/mcp/tools/crm-activities.ts
git commit -m "feat(calendar): emit outbound sync events from activity writers"
```

---

### Task 6: Connections API + profile UI for the scope upgrade

**Files:**
- Modify: `app/api/profile/calendar-connections/route.ts` (add `scopeLevel` to the select)
- Modify: `app/[locale]/(routes)/profile/components/CalendarConnectionsList.tsx`

**Interfaces:**
- Consumes: `?level=readwrite` on the authorize route (Task 2); `scopeLevel` field (Task 1).

- [ ] **Step 1: API select** — in the GET route's `select`, add `scopeLevel: true,` after `accountEmail: true,`.

- [ ] **Step 2: UI** — in `CalendarConnectionsList.tsx`:

Add to the `Connection` type: `scopeLevel: string;`

In the per-connection secondary text, prefix the sync status with the mode — replace the existing `<p className="text-xs text-muted-foreground">…</p>` content with:

```tsx
                <p className="text-xs text-muted-foreground">
                  {c.scopeLevel === "readwrite" ? "Two-way · " : "Inbound only · "}
                  {c.isActive
                    ? c.lastSyncedAt
                      ? `Synced ${new Date(c.lastSyncedAt).toLocaleString()}`
                      : "Waiting for first sync"
                    : `Needs reconnect${c.lastSyncError ? `: ${c.lastSyncError}` : ""}`}
                </p>
```

In the buttons block, before the Disconnect button add the upgrade button for active readonly rows, and make Reconnect preserve the previous level:

```tsx
                {c.isActive && c.scopeLevel !== "readwrite" && (
                  <Button asChild size="sm" variant="secondary">
                    <a href="/api/profile/calendar-connections/google/authorize?level=readwrite">
                      Enable two-way sync
                    </a>
                  </Button>
                )}
                {!c.isActive && (
                  <Button asChild size="sm" variant="secondary">
                    <a href={`/api/profile/calendar-connections/google/authorize?level=${c.scopeLevel === "readwrite" ? "readwrite" : "readonly"}`}>
                      Reconnect
                    </a>
                  </Button>
                )}
```

(The second block replaces the existing `!c.isActive` Reconnect button.)

- [ ] **Step 3: Verify** — `pnpm exec tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add app/api/profile "app/[locale]/(routes)/profile"
git commit -m "feat(calendar): two-way sync upgrade button + scope level in profile UI"
```

---

### Task 7: Verification gate + roadmap update

**Files:**
- Modify: `docs/superpowers/plans/2026-07-16-aqunama-roadmap.md`

- [ ] **Step 1: Full suite** — `./node_modules/.bin/jest` — all pass (baseline 1014+ plus new outbound tests, 0 failures).
- [ ] **Step 2: Typecheck + build** — `pnpm exec tsc --noEmit && pnpm build` — both succeed.
- [ ] **Step 3: Roadmap** — change the Plan 4 heading line to:

```markdown
## Plan 4 — Calendar Sync ✅ Milestones A+B+C implemented (A+B 2026-07-19, C 2026-07-19)
```

and append to the decisions line: `Milestone C (outbound): meeting activities only, real invites (sendUpdates: all), per-rep readwrite scope opt-in, event-driven via crm/calendar.outbound-sync — spec: docs/superpowers/specs/2026-07-19-aqunama-p4c-outbound-calendar-design.md.`

- [ ] **Step 4: Commit (no push — final review first)**

```bash
git add docs/superpowers/plans/2026-07-16-aqunama-roadmap.md
git commit -m "docs: mark AQUNAMA Plan 4 Milestone C implemented"
```

Deployment note for the wrap-up (manual, not code): reps click "Enable two-way sync" and re-consent; no new env vars or Google Cloud changes (calendar.events needs no verification on an Internal app).
