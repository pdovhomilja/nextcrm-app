# Target AI Outreach — Email Subsystem (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From an APPROVED target, let an operator generate a personalized outreach email with AI, merge it into a chosen HTML template (optionally embedding a homepage link + screenshot), preview it, and send it as a one-off direct email — with audit + activity trails.

**Architecture:** New Prisma models (`crm_Ai_Prompt`, `crm_Target_Email`, `crm_Target_Homepage` seam record). AI copy comes from a direct Anthropic Messages API call (key via `getApiKey("ANTHROPIC")`). Copy is inserted into a `crm_campaign_templates` wrapper at a `{{body}}` placeholder, personalization resolved via the existing `resolveMergeTags` (extended with `homepage_url`/`homepage_screenshot`), rendered via the existing `renderCampaignEmail`, and sent via Resend using the campaigns key through the existing `redirectRecipients` guard. The homepage table is created now (seam) but populated only by the later homepage build; email reads its two URLs and degrades gracefully when absent.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 (Postgres), better-auth (`lib/authz`), Resend, react-email, Jest, Playwright, pnpm 11 / Node 22.

**Spec:** `docs/superpowers/specs/2026-09-29-target-ai-outreach-design.md` (read it alongside this plan; the plan implements the email half, §5 + the shared model §4).

## Global Constraints

Every task's requirements implicitly include these (exact values):

- **Branch:** `feat/target-ai-outreach` (already created). **Never commit to `main`/`qa`/`production`. Do NOT `git push` without explicit user permission.**
- **Package manager:** `pnpm` only. Never `npm`/`yarn`.
- **Migrations:** author with `pnpm exec prisma migrate dev --name <name>`. **NEVER `prisma db push`.** A schema edit must ship with a migration.
- **Lint/typecheck before done:** `pnpm lint` (`eslint . --max-warnings=0`) and `pnpm exec tsc --noEmit` must pass.
- **Unit tests:** run with `pnpm exec jest <path>`.
- **Auth boundary (no RLS):** every server action calls `requireAuthenticated()` then `assertCanWriteTarget(user, targetId)` (or `assertCanReadTarget`). Handle: `AuthenticationError → return { error: "Unauthorized" }`, `AuthorizationError → return { error: "Forbidden" }`, rethrow otherwise. Scope every query by owner.
- **Approval gate:** email generate/preview/send require `target.triage_status === "APPROVED"`.
- **Soft delete:** filter `deletedAt: null` (note: `crm_Targets` uses `deletedAt`, and legacy relation field is spelled `crate_by_user`).
- **AI model:** `claude-sonnet-5-5` via `https://api.anthropic.com/v1/messages`, headers `x-api-key: <key>`, `anthropic-version: 2023-06-01`, `content-type: application/json`.
- **No new required env var this phase.** Uses existing `ANTHROPIC_API_KEY` (via `getApiKey`), `RESEND_CAMPAIGNS_API_KEY`→`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXTAUTH_URL`, `EMAIL_REDIRECT_TO`. Do not add or change any secret without confirming values with the user.
- **Upstream-owned files touched:** `prisma/schema.prisma`, `lib/mcp/tools/index.ts`. Every such edit is insertion-only and MUST be logged in `docs/reference/UPSTREAM_IMPACT_LOG.md`.
- **Decimal serialization:** none of the new models carry `Decimal`; `serializeDecimals` is N/A here (do not add it).
- **Import path casing** must match filenames exactly (CI is case-sensitive).

## Review Focus

Input classes the spec implies but happy-path tests miss — each is pinned to a test in the owning task:

- **Non-APPROVED target** (NEW/PASSED) → generate/preview/send must refuse. (Tasks 5, 6, 7)
- **`do_not_email = true` target** → send must refuse before calling Resend. (Task 7)
- **Template missing `{{body}}`** → compose must throw a clear error, never silently drop the AI copy. (Task 3)
- **No READY homepage** → `homepage_url`/`homepage_screenshot` resolve to empty string; no stray `{{...}}` or broken `<img>` survive. (Tasks 2, 3)
- **AI returns malformed / non-JSON** → generate action returns a clean `{ error }`, does not throw/crash. (Task 5)

---

### Task 1: Schema — models, enums, relations, migration

**Files:**
- Modify: `prisma/schema.prisma` (append models + enums; add 2 relation fields to `crm_Targets`; add 1 back-relation to `crm_campaign_templates`)
- Modify: `docs/reference/UPSTREAM_IMPACT_LOG.md` (log the schema touch)
- Create: `prisma/migrations/<timestamp>_target_ai_outreach/migration.sql` (generated)

**Interfaces:**
- Produces (Prisma models used by every later task): `crm_Ai_Prompt { id, name, body, kind, scope, user_id, is_default, created_by, created_on, updatedAt, deletedAt, deletedBy }`; `crm_Target_Email { id, targetId, template_id, subject, body_html, prompt_used, included_homepage, status, unsubscribe_token, sent_at, resend_message_id, error_message, created_by, created_on, updatedAt, deletedAt }`; `crm_Target_Homepage { id, targetId(unique), slug(unique), preview_url, screenshot_url, status, base_prompt, error, created_by, created_on, updatedAt, deletedAt }`. Enums: `crm_Ai_Prompt_Kind {EMAIL,HOMEPAGE}`, `crm_Ai_Prompt_Scope {ORG,USER}`, `crm_Target_Email_Status {DRAFT,SENT,FAILED}`, `crm_Homepage_Status {PENDING,RUNNING,READY,FAILED}`.

- [ ] **Step 1: Add enums and models to `prisma/schema.prisma`**

Append at the end of the file:

```prisma
enum crm_Ai_Prompt_Kind {
  EMAIL
  HOMEPAGE
}

enum crm_Ai_Prompt_Scope {
  ORG
  USER
}

enum crm_Target_Email_Status {
  DRAFT
  SENT
  FAILED
}

enum crm_Homepage_Status {
  PENDING
  RUNNING
  READY
  FAILED
}

model crm_Ai_Prompt {
  id         String              @id @default(uuid()) @db.Uuid
  name       String
  body       String              @db.Text
  kind       crm_Ai_Prompt_Kind
  scope      crm_Ai_Prompt_Scope
  user_id    String?             @db.Uuid
  is_default Boolean             @default(false)
  created_by String?             @db.Uuid
  created_on DateTime?           @default(now())
  updatedAt  DateTime?           @updatedAt
  deletedAt  DateTime?
  deletedBy  String?             @db.Uuid

  @@index([kind, scope])
  @@index([user_id])
  @@index([deletedAt])
}

model crm_Target_Homepage {
  id             String              @id @default(uuid()) @db.Uuid
  targetId       String              @unique @db.Uuid
  slug           String              @unique
  preview_url    String?
  screenshot_url String?
  status         crm_Homepage_Status @default(PENDING)
  base_prompt    String?             @db.Text
  error          String?
  created_by     String?             @db.Uuid
  created_on     DateTime?           @default(now())
  updatedAt      DateTime?           @updatedAt
  deletedAt      DateTime?

  target crm_Targets @relation(fields: [targetId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([deletedAt])
}

model crm_Target_Email {
  id                String                  @id @default(uuid()) @db.Uuid
  targetId          String                  @db.Uuid
  template_id       String?                 @db.Uuid
  subject           String
  body_html         String                  @db.Text
  prompt_used       String?                 @db.Text
  included_homepage Boolean                 @default(false)
  status            crm_Target_Email_Status @default(DRAFT)
  unsubscribe_token String                  @unique @default(uuid()) @db.Uuid
  sent_at           DateTime?
  resend_message_id String?
  error_message     String?
  created_by        String?                 @db.Uuid
  created_on        DateTime?               @default(now())
  updatedAt         DateTime?               @updatedAt
  deletedAt         DateTime?

  target   crm_Targets             @relation(fields: [targetId], references: [id], onDelete: Cascade)
  template crm_campaign_templates? @relation(fields: [template_id], references: [id], onDelete: SetNull)

  @@index([targetId])
  @@index([status])
  @@index([deletedAt])
}
```

- [ ] **Step 2: Add relation fields to `crm_Targets`**

Inside `model crm_Targets` (after the existing relation block near `campaign_sends    crm_campaign_sends[]`), insert:

```prisma
  target_emails crm_Target_Email[]
  homepage      crm_Target_Homepage?
```

- [ ] **Step 3: Add back-relation to `crm_campaign_templates`**

Inside `model crm_campaign_templates` (after `steps           crm_campaign_steps[]`), insert:

```prisma
  target_emails crm_Target_Email[]
```

- [ ] **Step 4: Validate the schema**

Run: `pnpm exec prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 5: Create the migration** (requires a local DB per LOCAL_DEV_GUIDE — `DATABASE_URL` at `127.0.0.1:54622`)

Run: `pnpm exec prisma migrate dev --name target_ai_outreach`
Expected: a new folder under `prisma/migrations/` with `migration.sql` creating the 3 tables + 4 enums; Prisma client regenerated.

- [ ] **Step 6: Log the upstream touch**

Append to `docs/reference/UPSTREAM_IMPACT_LOG.md` a row: file `prisma/schema.prisma`, change "insertion-only: 4 enums + 3 models + 3 relation fields for AI outreach", risk Low (additive, no upstream model logic rewritten).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations docs/reference/UPSTREAM_IMPACT_LOG.md
git commit -m "feat(db): add AI outreach models (prompt library, target email, homepage seam)"
```

---

### Task 2: Merge-tag extension — homepage link + screenshot

**Files:**
- Modify: `lib/campaigns/merge-tags.ts`
- Test: `lib/campaigns/__tests__/merge-tags.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveMergeTags(html, target, escapeHtml?)` now also resolves `{{homepage_url}}` and `{{homepage_screenshot}}` from `target.homepage_url` / `target.homepage_screenshot`. `MergeTagTarget` type gains `homepage_url?: string | null` and `homepage_screenshot?: string | null`.

- [ ] **Step 1: Write the failing test**

Create `lib/campaigns/__tests__/merge-tags.test.ts`:

```ts
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";

describe("resolveMergeTags — homepage tags", () => {
  const target = {
    first_name: "Ada",
    company: "Acme",
    homepage_url: "https://previews.radeengineering.com/p/acme",
    homepage_screenshot: "https://cdn.example.com/acme.png",
  };

  it("resolves homepage_url and homepage_screenshot", () => {
    const out = resolveMergeTags(
      `<a href="{{homepage_url}}">preview</a><img src="{{homepage_screenshot}}">`,
      target
    );
    expect(out).toBe(
      `<a href="https://previews.radeengineering.com/p/acme">preview</a><img src="https://cdn.example.com/acme.png">`
    );
  });

  it("resolves missing homepage tags to empty string", () => {
    const out = resolveMergeTags(`[{{homepage_url}}][{{homepage_screenshot}}]`, {
      first_name: "Ada",
    });
    expect(out).toBe(`[][]`);
  });

  it("still resolves the original five tags", () => {
    const out = resolveMergeTags(`Hi {{first_name}} at {{company}}`, target);
    expect(out).toBe(`Hi Ada at Acme`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest lib/campaigns/__tests__/merge-tags.test.ts`
Expected: FAIL — `{{homepage_url}}` left as-is (unknown tag), first assertion fails.

- [ ] **Step 3: Extend the type and map**

In `lib/campaigns/merge-tags.ts`, change `MergeTagTarget` and `MERGE_TAG_MAP`:

```ts
type MergeTagTarget = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company?: string | null;
  position?: string | null;
  homepage_url?: string | null;
  homepage_screenshot?: string | null;
};

const MERGE_TAG_MAP: Record<string, keyof MergeTagTarget> = {
  first_name: "first_name",
  last_name: "last_name",
  email: "email",
  company: "company",
  position: "position",
  homepage_url: "homepage_url",
  homepage_screenshot: "homepage_screenshot",
};
```

Also export the type for reuse: change `type MergeTagTarget` to `export type MergeTagTarget`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest lib/campaigns/__tests__/merge-tags.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/campaigns/merge-tags.ts lib/campaigns/__tests__/merge-tags.test.ts
git commit -m "feat(campaigns): merge tags for homepage link + screenshot"
```

---

### Task 3: Compose helper — insert AI body into template, resolve tags

**Files:**
- Create: `lib/campaigns/compose-target-email.ts`
- Test: `lib/campaigns/__tests__/compose-target-email.test.ts`

**Interfaces:**
- Consumes: `resolveMergeTags`, `MergeTagTarget` (Task 2).
- Produces:
  - `class TemplateBodyError extends Error`
  - `buildTargetMergeSource(target, homepage): MergeTagTarget` — maps a `crm_Targets` row (+ optional homepage record) to the merge source; homepage URLs only populated when `homepage.status === "READY"`.
  - `composeTargetEmailContent({ templateHtml, bodyHtml, mergeSource }): string` — replaces `{{body}}` with raw `bodyHtml`, then `resolveMergeTags(..., true)`; throws `TemplateBodyError` if `{{body}}` absent. Returns pre-render merged content HTML.

- [ ] **Step 1: Write the failing test**

Create `lib/campaigns/__tests__/compose-target-email.test.ts`:

```ts
import {
  composeTargetEmailContent,
  buildTargetMergeSource,
  TemplateBodyError,
} from "@/lib/campaigns/compose-target-email";

describe("composeTargetEmailContent", () => {
  const mergeSource = { first_name: "Ada", company: "Acme", homepage_url: "", homepage_screenshot: "" };

  it("inserts the AI body at {{body}} and resolves personalization", () => {
    const out = composeTargetEmailContent({
      templateHtml: `<div>Hello {{first_name}}</div>{{body}}<footer>{{company}}</footer>`,
      bodyHtml: `<p>Custom pitch for {{company}}</p>`,
      mergeSource,
    });
    expect(out).toBe(`<div>Hello Ada</div><p>Custom pitch for Acme</p><footer>Acme</footer>`);
  });

  it("throws when the template has no {{body}} placeholder", () => {
    expect(() =>
      composeTargetEmailContent({ templateHtml: `<div>No slot</div>`, bodyHtml: `<p>x</p>`, mergeSource })
    ).toThrow(TemplateBodyError);
  });

  it("does not re-escape the raw AI body HTML tags", () => {
    const out = composeTargetEmailContent({
      templateHtml: `{{body}}`,
      bodyHtml: `<strong>bold</strong>`,
      mergeSource,
    });
    expect(out).toBe(`<strong>bold</strong>`);
  });
});

describe("buildTargetMergeSource", () => {
  const target = { first_name: "Ada", last_name: "L", email: "ada@acme.com", company: "Acme", position: "CTO" };

  it("uses homepage URLs only when status is READY", () => {
    const ready = buildTargetMergeSource(target, {
      status: "READY",
      preview_url: "https://p/acme",
      screenshot_url: "https://s/acme.png",
    });
    expect(ready.homepage_url).toBe("https://p/acme");
    expect(ready.homepage_screenshot).toBe("https://s/acme.png");
  });

  it("blanks homepage URLs when no homepage / not READY", () => {
    const none = buildTargetMergeSource(target, null);
    expect(none.homepage_url).toBe("");
    expect(none.homepage_screenshot).toBe("");
    const pending = buildTargetMergeSource(target, { status: "PENDING", preview_url: "x", screenshot_url: "y" });
    expect(pending.homepage_url).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest lib/campaigns/__tests__/compose-target-email.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/campaigns/compose-target-email.ts`:

```ts
import { resolveMergeTags, type MergeTagTarget } from "./merge-tags";

export class TemplateBodyError extends Error {
  constructor(message = "Template must contain a {{body}} placeholder") {
    super(message);
    this.name = "TemplateBodyError";
  }
}

type TargetLike = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company_email?: string | null;
  personal_email?: string | null;
  company?: string | null;
  position?: string | null;
};

type HomepageLike = {
  status: string;
  preview_url?: string | null;
  screenshot_url?: string | null;
} | null;

export function buildTargetMergeSource(target: TargetLike, homepage: HomepageLike): MergeTagTarget {
  const ready = homepage?.status === "READY";
  return {
    first_name: target.first_name ?? "",
    last_name: target.last_name ?? "",
    email: target.email ?? target.company_email ?? target.personal_email ?? "",
    company: target.company ?? "",
    position: target.position ?? "",
    homepage_url: ready ? homepage?.preview_url ?? "" : "",
    homepage_screenshot: ready ? homepage?.screenshot_url ?? "" : "",
  };
}

export function composeTargetEmailContent(params: {
  templateHtml: string;
  bodyHtml: string;
  mergeSource: MergeTagTarget;
}): string {
  if (!params.templateHtml.includes("{{body}}")) {
    throw new TemplateBodyError();
  }
  // Insert the AI body raw (it is HTML and will be sanitized by renderCampaignEmail);
  // {{body}} is consumed here so resolveMergeTags never sees it.
  const withBody = params.templateHtml.split("{{body}}").join(params.bodyHtml);
  // Resolve remaining personalization tags with HTML escaping on values.
  return resolveMergeTags(withBody, params.mergeSource, true);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest lib/campaigns/__tests__/compose-target-email.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/campaigns/compose-target-email.ts lib/campaigns/__tests__/compose-target-email.test.ts
git commit -m "feat(campaigns): compose target email (body placeholder + merge source)"
```

---

### Task 4: Prompt library server actions

**Files:**
- Create: `actions/crm/prompts/list-prompts.ts`
- Create: `actions/crm/prompts/create-prompt.ts`
- Create: `actions/crm/prompts/update-prompt.ts`
- Create: `actions/crm/prompts/delete-prompt.ts`
- Test: `actions/crm/prompts/__tests__/prompts.test.ts`

**Interfaces:**
- Consumes: `requireAuthenticated`, `AuthenticationError`, `AuthorizationError`, `requireRole` (from `@/lib/authz`); `prismadb.crm_Ai_Prompt` (Task 1).
- Produces:
  - `listPrompts({ kind }): Promise<AiPrompt[]>` — returns non-deleted prompts of `kind` where `scope="ORG"` OR (`scope="USER"` AND `user_id=me`), ordered by `name`.
  - `createPrompt({ name, body, kind, scope }): Promise<{ data } | { error }>` — `scope="ORG"` requires admin; `scope="USER"` sets `user_id=me`.
  - `updatePrompt({ id, name, body }): Promise<{ data } | { error }>` — USER prompt requires ownership; ORG requires admin.
  - `deletePrompt({ id }): Promise<{ data } | { error }>` — same authz; soft-delete (`deletedAt`).
  - `type AiPromptKind = "EMAIL" | "HOMEPAGE"`, `type AiPromptScope = "ORG" | "USER"`.

- [ ] **Step 1: Write the failing test**

Create `actions/crm/prompts/__tests__/prompts.test.ts`:

```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Ai_Prompt: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { requireAuthenticated, requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { listPrompts } from "@/actions/crm/prompts/list-prompts";
import { createPrompt } from "@/actions/crm/prompts/create-prompt";

const authed = requireAuthenticated as jest.Mock;
const role = requireRole as jest.Mock;
const ME = { id: "me", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(ME);
  role.mockResolvedValue(undefined);
});

it("lists org + own personal prompts for a kind", async () => {
  (prismadb.crm_Ai_Prompt.findMany as jest.Mock).mockResolvedValue([{ id: "p1" }]);
  const out = await listPrompts({ kind: "EMAIL" });
  expect(out).toEqual([{ id: "p1" }]);
  expect(prismadb.crm_Ai_Prompt.findMany).toHaveBeenCalledWith({
    where: {
      deletedAt: null,
      kind: "EMAIL",
      OR: [{ scope: "ORG" }, { scope: "USER", user_id: "me" }],
    },
    orderBy: { name: "asc" },
  });
});

it("lets any user create a personal prompt with user_id set", async () => {
  (prismadb.crm_Ai_Prompt.create as jest.Mock).mockResolvedValue({ id: "p2" });
  const res = await createPrompt({ name: "Cold intro", body: "Write...", kind: "EMAIL", scope: "USER" });
  expect(res).toEqual({ data: { id: "p2" } });
  expect(role).not.toHaveBeenCalled();
  expect(prismadb.crm_Ai_Prompt.create).toHaveBeenCalledWith({
    data: { name: "Cold intro", body: "Write...", kind: "EMAIL", scope: "USER", user_id: "me", created_by: "me" },
  });
});

it("requires admin to create an org prompt", async () => {
  role.mockRejectedValue(new AuthorizationError());
  const res = await createPrompt({ name: "House voice", body: "x", kind: "EMAIL", scope: "ORG" });
  expect(res).toEqual({ error: "Forbidden" });
  expect(prismadb.crm_Ai_Prompt.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest actions/crm/prompts/__tests__/prompts.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `list-prompts.ts`**

```ts
"use server";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";

export type AiPromptKind = "EMAIL" | "HOMEPAGE";
export type AiPromptScope = "ORG" | "USER";

export const listPrompts = async ({ kind }: { kind: AiPromptKind }) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
  return prismadb.crm_Ai_Prompt.findMany({
    where: {
      deletedAt: null,
      kind,
      OR: [{ scope: "ORG" }, { scope: "USER", user_id: user.id }],
    },
    orderBy: { name: "asc" },
  });
};
```

- [ ] **Step 4: Write `create-prompt.ts`**

```ts
"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import type { AiPromptKind, AiPromptScope } from "./list-prompts";

export const createPrompt = async (data: {
  name: string;
  body: string;
  kind: AiPromptKind;
  scope: AiPromptScope;
}) => {
  const name = data.name?.trim();
  const body = data.body?.trim();
  if (!name) return { error: "Name is required" };
  if (!body) return { error: "Prompt body is required" };

  let user;
  try {
    user = await requireAuthenticated();
    if (data.scope === "ORG") await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const created = await prismadb.crm_Ai_Prompt.create({
    data: {
      name,
      body,
      kind: data.kind,
      scope: data.scope,
      user_id: data.scope === "USER" ? user.id : null,
      created_by: user.id,
    },
  });
  revalidatePath("/[locale]/(routes)/campaigns/prompts", "page");
  return { data: created };
};
```

- [ ] **Step 5: Write `update-prompt.ts`**

```ts
"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

async function loadAndAuthorize(id: string) {
  const user = await requireAuthenticated();
  const existing = await prismadb.crm_Ai_Prompt.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "Prompt not found" as const };
  if (existing.scope === "ORG") {
    await requireRole(["admin"]);
  } else if (existing.user_id !== user.id) {
    throw new AuthorizationError();
  }
  return { user, existing };
}

export const updatePrompt = async (data: { id: string; name: string; body: string }) => {
  const name = data.name?.trim();
  const body = data.body?.trim();
  if (!name) return { error: "Name is required" };
  if (!body) return { error: "Prompt body is required" };
  try {
    const res = await loadAndAuthorize(data.id);
    if ("error" in res) return res;
    const updated = await prismadb.crm_Ai_Prompt.update({
      where: { id: data.id },
      data: { name, body },
    });
    revalidatePath("/[locale]/(routes)/campaigns/prompts", "page");
    return { data: updated };
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
};
```

- [ ] **Step 6: Write `delete-prompt.ts`**

```ts
"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deletePrompt = async ({ id }: { id: string }) => {
  try {
    const user = await requireAuthenticated();
    const existing = await prismadb.crm_Ai_Prompt.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { error: "Prompt not found" };
    if (existing.scope === "ORG") await requireRole(["admin"]);
    else if (existing.user_id !== user.id) throw new AuthorizationError();

    await prismadb.crm_Ai_Prompt.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });
    revalidatePath("/[locale]/(routes)/campaigns/prompts", "page");
    return { data: { id } };
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
};
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm exec jest actions/crm/prompts/__tests__/prompts.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add actions/crm/prompts
git commit -m "feat(crm): prompt library server actions (org + personal, per kind)"
```

---

### Task 5: Email generation action (Claude)

**Files:**
- Create: `actions/crm/targets/generate-target-email.ts`
- Test: `actions/crm/targets/__tests__/generate-target-email.test.ts`

**Interfaces:**
- Consumes: `getApiKey` (`@/lib/api-keys`), `requireAuthenticated`/`assertCanWriteTarget`, `prismadb.crm_Targets`, global `fetch`.
- Produces: `generateTargetEmail({ targetId, prompt }): Promise<{ data: { subject: string; body_html: string } } | { error: string }>`. Gate: APPROVED. Returns `{ error }` on: unauth, forbidden, not-approved, missing key, non-JSON AI response.

- [ ] **Step 1: Write the failing test**

Create `actions/crm/targets/__tests__/generate-target-email.test.ts`:

```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/api-keys", () => ({ getApiKey: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Targets: { findFirst: jest.fn() } },
}));

import { requireAuthenticated, assertCanWriteTarget, AuthorizationError } from "@/lib/authz";
import { getApiKey } from "@/lib/api-keys";
import { prismadb } from "@/lib/prisma";
import { generateTargetEmail } from "@/actions/crm/targets/generate-target-email";

const authed = requireAuthenticated as jest.Mock;
const assertT = assertCanWriteTarget as jest.Mock;
const key = getApiKey as jest.Mock;
const findFirst = prismadb.crm_Targets.findFirst as jest.Mock;
const ME = { id: "me", role: "user" };
const APPROVED = { id: "t1", triage_status: "APPROVED", company: "Acme", description: "Old site" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(ME);
  assertT.mockResolvedValue(undefined);
  key.mockResolvedValue("sk-ant-test");
  findFirst.mockResolvedValue(APPROVED);
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ type: "text", text: JSON.stringify({ subject: "Hi Acme", html: "<p>Pitch</p>" }) }] }),
  }) as unknown as typeof fetch;
});

it("returns subject + body_html for an approved target", async () => {
  const res = await generateTargetEmail({ targetId: "t1", prompt: "Be warm" });
  expect(res).toEqual({ data: { subject: "Hi Acme", body_html: "<p>Pitch</p>" } });
});

it("refuses a non-approved target", async () => {
  findFirst.mockResolvedValue({ ...APPROVED, triage_status: "NEW" });
  const res = await generateTargetEmail({ targetId: "t1", prompt: "x" });
  expect(res).toEqual({ error: "Target must be approved before generating outreach" });
  expect(global.fetch).not.toHaveBeenCalled();
});

it("returns Forbidden for a non-owner", async () => {
  assertT.mockRejectedValue(new AuthorizationError());
  const res = await generateTargetEmail({ targetId: "t1", prompt: "x" });
  expect(res).toEqual({ error: "Forbidden" });
});

it("handles a malformed AI response without throwing", async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ type: "text", text: "not json" }] }),
  });
  const res = await generateTargetEmail({ targetId: "t1", prompt: "x" });
  expect(res).toEqual({ error: "AI returned an unexpected response. Please try again." });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest actions/crm/targets/__tests__/generate-target-email.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `actions/crm/targets/generate-target-email.ts`:

```ts
"use server";
import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

const SYSTEM_PROMPT = `You are an expert B2B outreach copywriter for a web design & engineering firm.
Write a short, personalized email BODY (no <html>, <head>, or <body> wrapper — it will be inserted into a template).
Return ONLY valid JSON in this exact shape: {"subject":"...","html":"..."}
The "html" is clean, inline-styled body markup (<p>, <a>, <strong>, <ul>).
You MAY use merge tags: {{first_name}}, {{last_name}}, {{company}}, {{position}}.
If the operator's instructions reference a homepage/mockup, you MAY include {{homepage_url}} (link) and/or {{homepage_screenshot}} (image URL for an <img src>).
Keep it concise and specific to the prospect. No placeholders like [Name].`;

export const generateTargetEmail = async ({
  targetId,
  prompt,
}: {
  targetId: string;
  prompt: string;
}): Promise<{ data: { subject: string; body_html: string } } | { error: string }> => {
  let user;
  try {
    user = await requireAuthenticated();
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const target = await prismadb.crm_Targets.findFirst({ where: { id: targetId, deletedAt: null } });
  if (!target) return { error: "Target not found" };
  if (target.triage_status !== "APPROVED")
    return { error: "Target must be approved before generating outreach" };

  const apiKey = await getApiKey("ANTHROPIC", user.id);
  if (!apiKey) return { error: "No Anthropic API key configured. Add one in Profile → LLMs." };

  const facts = [
    target.company ? `Company: ${target.company}` : null,
    target.position ? `Contact role: ${target.position}` : null,
    target.industry ? `Industry: ${target.industry}` : null,
    target.company_website ? `Website: ${target.company_website}` : null,
    target.description ? `Notes: ${target.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Operator instructions:\n${prompt}\n\nProspect facts:\n${facts}` },
        ],
      }),
    });
    if (!response.ok) return { error: "AI request failed. Please try again." };
    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "";
    let parsed: { subject?: string; html?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      return { error: "AI returned an unexpected response. Please try again." };
    }
    if (!parsed.subject || !parsed.html)
      return { error: "AI returned an unexpected response. Please try again." };
    return { data: { subject: parsed.subject, body_html: parsed.html } };
  } catch {
    return { error: "AI request failed. Please try again." };
  } finally {
    clearTimeout(timeout);
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest actions/crm/targets/__tests__/generate-target-email.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add actions/crm/targets/generate-target-email.ts actions/crm/targets/__tests__/generate-target-email.test.ts
git commit -m "feat(crm): AI email generation from an approved target (Claude)"
```

---

### Task 6: Preview action

**Files:**
- Create: `actions/crm/targets/preview-target-email.ts`
- Test: `actions/crm/targets/__tests__/preview-target-email.test.ts`

**Interfaces:**
- Consumes: authz, `prismadb` (`crm_Targets`, `crm_campaign_templates`, `crm_Target_Homepage`), `composeTargetEmailContent`/`buildTargetMergeSource` (Task 3), `renderCampaignEmail` (existing), `resolveMergeTags` (Task 2).
- Produces: `previewTargetEmail({ targetId, templateId, subject, bodyHtml, includeHomepage }): Promise<{ data: { html: string; subject: string } } | { error: string }>`. Gate: APPROVED. Uses unsubscribe placeholder `#` (no send).

- [ ] **Step 1: Write the failing test**

Create `actions/crm/targets/__tests__/preview-target-email.test.ts`:

```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
    crm_campaign_templates: { findFirst: jest.fn() },
    crm_Target_Homepage: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/campaigns/render-email", () => ({
  renderCampaignEmail: jest.fn(async ({ contentHtml }) => `<html>${contentHtml}</html>`),
}));

import { requireAuthenticated, assertCanWriteTarget } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { previewTargetEmail } from "@/actions/crm/targets/preview-target-email";

const authed = requireAuthenticated as jest.Mock;
const assertT = assertCanWriteTarget as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue({ id: "me", role: "user" });
  assertT.mockResolvedValue(undefined);
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
    id: "t1", triage_status: "APPROVED", first_name: "Ada", company: "Acme",
  });
  (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({
    id: "tpl1", content_html: `<div>{{body}}</div>`,
  });
  (prismadb.crm_Target_Homepage.findFirst as jest.Mock).mockResolvedValue(null);
});

it("renders a preview with the AI body merged in", async () => {
  const res = await previewTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "Hi {{company}}", bodyHtml: "<p>Pitch</p>", includeHomepage: false,
  });
  expect(res).toEqual({ data: { html: `<html><div><p>Pitch</p></div></html>`, subject: "Hi Acme" } });
});

it("refuses a non-approved target", async () => {
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({ id: "t1", triage_status: "PASSED" });
  const res = await previewTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "x", bodyHtml: "y", includeHomepage: false,
  });
  expect(res).toEqual({ error: "Target must be approved before generating outreach" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest actions/crm/targets/__tests__/preview-target-email.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `actions/crm/targets/preview-target-email.ts`:

```ts
"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { renderCampaignEmail } from "@/lib/campaigns/render-email";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";
import {
  composeTargetEmailContent,
  buildTargetMergeSource,
  TemplateBodyError,
} from "@/lib/campaigns/compose-target-email";

export const previewTargetEmail = async ({
  targetId,
  templateId,
  subject,
  bodyHtml,
  includeHomepage,
}: {
  targetId: string;
  templateId: string;
  subject: string;
  bodyHtml: string;
  includeHomepage: boolean;
}): Promise<{ data: { html: string; subject: string } } | { error: string }> => {
  let user;
  try {
    user = await requireAuthenticated();
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const target = await prismadb.crm_Targets.findFirst({ where: { id: targetId, deletedAt: null } });
  if (!target) return { error: "Target not found" };
  if (target.triage_status !== "APPROVED")
    return { error: "Target must be approved before generating outreach" };

  const template = await prismadb.crm_campaign_templates.findFirst({
    where: { id: templateId, deletedAt: null },
  });
  if (!template) return { error: "Template not found" };

  const homepage = includeHomepage
    ? await prismadb.crm_Target_Homepage.findFirst({ where: { targetId, deletedAt: null } })
    : null;

  const mergeSource = buildTargetMergeSource(target, homepage);

  try {
    const contentHtml = composeTargetEmailContent({
      templateHtml: template.content_html,
      bodyHtml,
      mergeSource,
    });
    const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl: "#" });
    return { data: { html, subject: resolveMergeTags(subject, mergeSource) } };
  } catch (e) {
    if (e instanceof TemplateBodyError) return { error: e.message };
    throw e;
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest actions/crm/targets/__tests__/preview-target-email.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add actions/crm/targets/preview-target-email.ts actions/crm/targets/__tests__/preview-target-email.test.ts
git commit -m "feat(crm): render preview for a generated target email"
```

---

### Task 7: Send action (one-off direct send)

**Files:**
- Create: `actions/crm/targets/send-target-email.ts`
- Test: `actions/crm/targets/__tests__/send-target-email.test.ts`

**Interfaces:**
- Consumes: authz, `prismadb` (`crm_Targets`, `crm_campaign_templates`, `crm_Target_Homepage`, `crm_Target_Email`), compose helpers, `renderCampaignEmail`, `resolveMergeTags`, `redirectRecipients` (`@/lib/email/redirect`), `Resend` (`resend`), `createActivity` (`@/actions/crm/activities/create-activity`), `writeAuditLog` (`@/lib/audit-log`).
- Produces: `sendTargetEmail({ targetId, templateId, subject, bodyHtml, includeHomepage, promptUsed }): Promise<{ data: { id: string } } | { error: string }>`. Gate: APPROVED. Refuses `do_not_email`. Creates `crm_Target_Email` (DRAFT→SENT/FAILED), an `email` activity linked to the target, and an audit-log entry.

- [ ] **Step 1: Write the failing test**

Create `actions/crm/targets/__tests__/send-target-email.test.ts`:

```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
    crm_campaign_templates: { findFirst: jest.fn() },
    crm_Target_Homepage: { findFirst: jest.fn() },
    crm_Target_Email: { create: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/lib/campaigns/render-email", () => ({
  renderCampaignEmail: jest.fn(async () => "<html>final</html>"),
}));
jest.mock("@/lib/email/redirect", () => ({ redirectRecipients: jest.fn((to) => to) }));
jest.mock("@/actions/crm/activities/create-activity", () => ({ createActivity: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
const sendMock = jest.fn().mockResolvedValue({ data: { id: "msg_1" }, error: null });
jest.mock("resend", () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: sendMock } })) }));

import { requireAuthenticated, assertCanWriteTarget } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { sendTargetEmail } from "@/actions/crm/targets/send-target-email";

const authed = requireAuthenticated as jest.Mock;
const assertT = assertCanWriteTarget as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue({ id: "me", role: "user" });
  assertT.mockResolvedValue(undefined);
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
    id: "t1", triage_status: "APPROVED", first_name: "Ada", company: "Acme",
    email: "ada@acme.com", do_not_email: false,
  });
  (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({
    id: "tpl1", content_html: "<div>{{body}}</div>",
  });
  (prismadb.crm_Target_Homepage.findFirst as jest.Mock).mockResolvedValue(null);
  (prismadb.crm_Target_Email.create as jest.Mock).mockResolvedValue({ id: "e1", unsubscribe_token: "tok" });
  (prismadb.crm_Target_Email.update as jest.Mock).mockResolvedValue({ id: "e1" });
  sendMock.mockResolvedValue({ data: { id: "msg_1" }, error: null });
});

it("sends, records SENT, and logs an email activity", async () => {
  const res = await sendTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "Hi {{company}}", bodyHtml: "<p>Pitch</p>",
    includeHomepage: false, promptUsed: "warm",
  });
  expect(res).toEqual({ data: { id: "e1" } });
  expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: "ada@acme.com", subject: "Hi Acme", html: "<html>final</html>" }));
  expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "e1" }, data: expect.objectContaining({ status: "SENT", resend_message_id: "msg_1" }) })
  );
  expect(createActivity).toHaveBeenCalledWith(
    expect.objectContaining({ type: "email", status: "completed", links: [{ entityType: "target", entityId: "t1" }] })
  );
});

it("refuses when the target is do_not_email", async () => {
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
    id: "t1", triage_status: "APPROVED", email: "ada@acme.com", do_not_email: true,
  });
  const res = await sendTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "x", bodyHtml: "y", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ error: "This target is marked do-not-email." });
  expect(sendMock).not.toHaveBeenCalled();
});

it("refuses a non-approved target", async () => {
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({ id: "t1", triage_status: "NEW", email: "a@b.com" });
  const res = await sendTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "x", bodyHtml: "y", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ error: "Target must be approved before generating outreach" });
  expect(sendMock).not.toHaveBeenCalled();
});

it("records FAILED when Resend errors", async () => {
  sendMock.mockResolvedValue({ data: null, error: { message: "bounce" } });
  const res = await sendTargetEmail({
    targetId: "t1", templateId: "tpl1", subject: "Hi", bodyHtml: "<p>x</p>", includeHomepage: false, promptUsed: "",
  });
  expect(res).toEqual({ error: "Failed to send email." });
  expect(prismadb.crm_Target_Email.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", error_message: "bounce" }) })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest actions/crm/targets/__tests__/send-target-email.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `actions/crm/targets/send-target-email.ts`:

```ts
"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { renderCampaignEmail } from "@/lib/campaigns/render-email";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";
import {
  composeTargetEmailContent,
  buildTargetMergeSource,
  TemplateBodyError,
} from "@/lib/campaigns/compose-target-email";
import { redirectRecipients } from "@/lib/email/redirect";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { writeAuditLog } from "@/lib/audit-log";

export const sendTargetEmail = async ({
  targetId,
  templateId,
  subject,
  bodyHtml,
  includeHomepage,
  promptUsed,
}: {
  targetId: string;
  templateId: string;
  subject: string;
  bodyHtml: string;
  includeHomepage: boolean;
  promptUsed: string;
}): Promise<{ data: { id: string } } | { error: string }> => {
  let user;
  try {
    user = await requireAuthenticated();
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const target = await prismadb.crm_Targets.findFirst({ where: { id: targetId, deletedAt: null } });
  if (!target) return { error: "Target not found" };
  if (target.triage_status !== "APPROVED")
    return { error: "Target must be approved before generating outreach" };
  if (target.do_not_email) return { error: "This target is marked do-not-email." };

  const recipient = target.email ?? target.company_email ?? target.personal_email;
  if (!recipient) return { error: "This target has no email address." };

  const template = await prismadb.crm_campaign_templates.findFirst({
    where: { id: templateId, deletedAt: null },
  });
  if (!template) return { error: "Template not found" };

  const homepage = includeHomepage
    ? await prismadb.crm_Target_Homepage.findFirst({ where: { targetId, deletedAt: null } })
    : null;
  const mergeSource = buildTargetMergeSource(target, homepage);

  let contentHtml: string;
  try {
    contentHtml = composeTargetEmailContent({ templateHtml: template.content_html, bodyHtml, mergeSource });
  } catch (e) {
    if (e instanceof TemplateBodyError) return { error: e.message };
    throw e;
  }
  const resolvedSubject = resolveMergeTags(subject, mergeSource);

  // Draft row first so we have an id + unsubscribe token for the List-Unsubscribe URL.
  const draft = await prismadb.crm_Target_Email.create({
    data: {
      targetId,
      template_id: templateId,
      subject: resolvedSubject,
      body_html: bodyHtml,
      prompt_used: promptUsed,
      included_homepage: includeHomepage && homepage?.status === "READY",
      status: "DRAFT",
      created_by: user.id,
    },
  });

  const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/api/crm/targets/unsubscribe?token=${draft.unsubscribe_token}`;
  const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });
  const from = process.env.RESEND_FROM_EMAIL!;

  const resend = new Resend(process.env.RESEND_CAMPAIGNS_API_KEY || process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from,
    to: redirectRecipients(recipient),
    subject: resolvedSubject,
    html,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
  });

  if (result.error) {
    await prismadb.crm_Target_Email.update({
      where: { id: draft.id },
      data: { status: "FAILED", error_message: result.error.message },
    });
    return { error: "Failed to send email." };
  }

  await prismadb.crm_Target_Email.update({
    where: { id: draft.id },
    data: { status: "SENT", resend_message_id: result.data?.id, sent_at: new Date() },
  });

  await createActivity({
    type: "email",
    title: `Outreach email sent: ${resolvedSubject}`,
    date: new Date(),
    status: "completed",
    metadata: { target_email_id: draft.id },
    links: [{ entityType: "target", entityId: targetId }],
  });

  await writeAuditLog({
    entityType: "target",
    entityId: targetId,
    action: "updated",
    changes: [{ field: "outreach_email_sent", old: null, new: resolvedSubject }],
    userId: user.id,
  });

  revalidatePath("/[locale]/(routes)/campaigns/targets/[targetId]", "page");
  return { data: { id: draft.id } };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest actions/crm/targets/__tests__/send-target-email.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add actions/crm/targets/send-target-email.ts actions/crm/targets/__tests__/send-target-email.test.ts
git commit -m "feat(crm): one-off direct send of a generated target email"
```

---

### Task 8: Unsubscribe route (one-off opt-out)

**Files:**
- Create: `app/api/crm/targets/unsubscribe/route.ts`
- Test: `app/api/crm/targets/unsubscribe/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `prismadb` (`crm_Target_Email`, `crm_Targets`).
- Produces: `GET(req): Promise<Response>` — resolves `?token`, sets the target `do_not_email = true` + `do_not_email_at = now`, returns a small HTML confirmation. Unknown token → generic confirmation (no enumeration), 200.

- [ ] **Step 1: Write the failing test**

Create `app/api/crm/targets/unsubscribe/__tests__/route.test.ts`:

```ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Target_Email: { findUnique: jest.fn() },
    crm_Targets: { update: jest.fn() },
  },
}));
import { prismadb } from "@/lib/prisma";
import { GET } from "@/app/api/crm/targets/unsubscribe/route";

beforeEach(() => jest.clearAllMocks());

it("sets do_not_email for a valid token", async () => {
  (prismadb.crm_Target_Email.findUnique as jest.Mock).mockResolvedValue({ id: "e1", targetId: "t1" });
  const res = await GET(new Request("https://x/api/crm/targets/unsubscribe?token=tok"));
  expect(res.status).toBe(200);
  expect(prismadb.crm_Targets.update).toHaveBeenCalledWith({
    where: { id: "t1" },
    data: { do_not_email: true, do_not_email_at: expect.any(Date) },
  });
});

it("does not update for an unknown token", async () => {
  (prismadb.crm_Target_Email.findUnique as jest.Mock).mockResolvedValue(null);
  const res = await GET(new Request("https://x/api/crm/targets/unsubscribe?token=nope"));
  expect(res.status).toBe(200);
  expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest app/api/crm/targets/unsubscribe/__tests__/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

Create `app/api/crm/targets/unsubscribe/route.ts`:

```ts
import { prismadb } from "@/lib/prisma";

const PAGE = (msg: string) =>
  `<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center"><h2>Rade Engineering</h2><p>${msg}</p></body></html>`;

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  const done = () =>
    new Response(PAGE("You have been unsubscribed. You will not receive further emails from us."), {
      status: 200,
      headers: { "content-type": "text/html" },
    });

  if (!token) return done();
  const row = await prismadb.crm_Target_Email.findUnique({ where: { unsubscribe_token: token } });
  if (row) {
    await prismadb.crm_Targets.update({
      where: { id: row.targetId },
      data: { do_not_email: true, do_not_email_at: new Date() },
    });
  }
  return done();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest app/api/crm/targets/unsubscribe/__tests__/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/targets/unsubscribe
git commit -m "feat(crm): one-off outreach unsubscribe route (sets do_not_email)"
```

---

### Task 9: UI — action dropdown + Generate email drawer

**Files:**
- Create: `app/[locale]/(routes)/campaigns/targets/[targetId]/components/TargetAiMenu.tsx`
- Create: `app/[locale]/(routes)/campaigns/targets/[targetId]/components/GenerateEmailDrawer.tsx`
- Modify: `app/[locale]/(routes)/campaigns/targets/[targetId]/components/BasicView.tsx` (replace `<EnrichButton />` + placeholder `<MoreHorizontal />` at lines 82-85 with `<TargetAiMenu />`)
- Modify: `app/[locale]/(routes)/campaigns/targets/[targetId]/page.tsx` (pass templates + prompts + hasHomepage into `BasicView`) — or load them inside `BasicView` (server component). Load inside `BasicView` to keep `page.tsx` minimal.

**Interfaces:**
- Consumes: `listPrompts` (Task 4), `getTemplates` (`@/actions/campaigns/templates/get-templates`), `generateTargetEmail`/`previewTargetEmail`/`sendTargetEmail` (Tasks 5-7), existing enrich POST endpoint.
- Produces: `<TargetAiMenu targetId triageStatus enrichHref templates prompts hasHomepage />` (client) rendering a shadcn `DropdownMenu` (Enrich / Generate email / Generate homepage[disabled]); `<GenerateEmailDrawer ... />` (client) the drawer. Both keyed with `data-testid` for E2E.

> This task's verification is E2E (Task 12) + manual, not unit. Use the existing shadcn primitives already in `components/ui/` (dropdown-menu, sheet/drawer, select, textarea, button — confirm the exact filenames with `ls components/ui`). Match imports to real filenames (CI is case-sensitive).

- [ ] **Step 1: Confirm available UI primitives**

Run: `ls components/ui | grep -Ei 'dropdown|sheet|drawer|select|textarea|dialog|checkbox'`
Expected: note the exact files (e.g. `dropdown-menu.tsx`, `sheet.tsx`, `select.tsx`, `textarea.tsx`, `checkbox.tsx`). Use these import paths in the components below; if `sheet` is absent use `dialog`.

- [ ] **Step 2: Write `TargetAiMenu.tsx`**

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GenerateEmailDrawer } from "./GenerateEmailDrawer";

type Option = { id: string; name: string };

export function TargetAiMenu(props: {
  targetId: string;
  triageStatus: "NEW" | "APPROVED" | "PASSED";
  templates: Option[];
  prompts: Option[];
  hasHomepage: boolean;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const approved = props.triageStatus === "APPROVED";

  async function enrich() {
    setEnriching(true);
    try {
      const res = await fetch(`/api/crm/targets/${props.targetId}/enrich`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("Enrichment started — you'll be notified when done");
    } catch {
      toast.error("Failed to start enrichment");
    } finally {
      setEnriching(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid="target-ai-menu">
            <Sparkles className="h-4 w-4 mr-1 text-orange-500" />
            {enriching ? "Starting…" : "AI"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={enrich}>Enrich with AI</DropdownMenuItem>
          <DropdownMenuItem
            disabled={!approved}
            data-testid="ai-generate-email"
            onClick={() => setEmailOpen(true)}
          >
            Generate email{!approved ? " (approve first)" : ""}
          </DropdownMenuItem>
          <DropdownMenuItem disabled title="Coming soon">
            Generate homepage (coming soon)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GenerateEmailDrawer
        open={emailOpen}
        onOpenChange={setEmailOpen}
        targetId={props.targetId}
        templates={props.templates}
        prompts={props.prompts}
        hasHomepage={props.hasHomepage}
      />
    </>
  );
}
```

- [ ] **Step 3: Write `GenerateEmailDrawer.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { listPromptBodies } from "@/actions/crm/prompts/list-prompt-bodies";
import { generateTargetEmail } from "@/actions/crm/targets/generate-target-email";
import { previewTargetEmail } from "@/actions/crm/targets/preview-target-email";
import { sendTargetEmail } from "@/actions/crm/targets/send-target-email";

type Option = { id: string; name: string };

export function GenerateEmailDrawer(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetId: string;
  templates: Option[];
  prompts: Option[];
  hasHomepage: boolean;
}) {
  const [promptId, setPromptId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [templateId, setTemplateId] = useState<string>(props.templates[0]?.id ?? "");
  const [includeHomepage, setIncludeHomepage] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [busy, setBusy] = useState<"gen" | "send" | null>(null);

  async function onPickPrompt(id: string) {
    setPromptId(id);
    const bodies = await listPromptBodies({ kind: "EMAIL" });
    setPrompt(bodies.find((p) => p.id === id)?.body ?? "");
  }

  async function onGenerate() {
    setBusy("gen");
    const res = await generateTargetEmail({ targetId: props.targetId, prompt });
    if ("error" in res) { toast.error(res.error); setBusy(null); return; }
    setSubject(res.data.subject);
    setBodyHtml(res.data.body_html);
    const prev = await previewTargetEmail({
      targetId: props.targetId, templateId, subject: res.data.subject,
      bodyHtml: res.data.body_html, includeHomepage,
    });
    if ("error" in prev) toast.error(prev.error);
    else setPreviewHtml(prev.data.html);
    setBusy(null);
  }

  async function onSend() {
    setBusy("send");
    const res = await sendTargetEmail({
      targetId: props.targetId, templateId, subject, bodyHtml, includeHomepage, promptUsed: prompt,
    });
    setBusy(null);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success("Email sent");
    props.onOpenChange(false);
  }

  useEffect(() => { if (!props.open) setPreviewHtml(""); }, [props.open]);

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="generate-email-drawer">
        <SheetHeader><SheetTitle>Generate outreach email</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <Select value={promptId} onValueChange={onPickPrompt}>
            <SelectTrigger data-testid="email-prompt-select"><SelectValue placeholder="Choose a prompt" /></SelectTrigger>
            <SelectContent>
              {props.prompts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Textarea
            data-testid="email-prompt-text"
            placeholder="Guidance for the AI…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />

          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger data-testid="email-template-select"><SelectValue placeholder="Choose a template" /></SelectTrigger>
            <SelectContent>
              {props.templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeHomepage}
              disabled={!props.hasHomepage}
              onCheckedChange={(v) => setIncludeHomepage(Boolean(v))}
            />
            Include homepage preview link + screenshot{!props.hasHomepage ? " (none generated yet)" : ""}
          </label>

          <Button onClick={onGenerate} disabled={!prompt || !templateId || busy !== null} data-testid="email-generate-btn">
            {busy === "gen" ? "Generating…" : "Generate"}
          </Button>

          {subject && (
            <div className="space-y-2">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="email-subject" />
              <iframe title="preview" srcDoc={previewHtml} className="w-full h-96 border rounded" data-testid="email-preview" />
              <Button onClick={onSend} disabled={busy !== null} data-testid="email-send-btn">
                {busy === "send" ? "Sending…" : "Send email"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Add `list-prompt-bodies.ts`** (the drawer needs prompt bodies, not just names)

Create `actions/crm/prompts/list-prompt-bodies.ts`:

```ts
"use server";
import { listPrompts, type AiPromptKind } from "./list-prompts";

export const listPromptBodies = async ({ kind }: { kind: AiPromptKind }) => {
  const prompts = await listPrompts({ kind });
  return prompts.map((p) => ({ id: p.id, name: p.name, body: p.body }));
};
```

- [ ] **Step 5: Wire `BasicView.tsx`**

Replace the `<EnrichButton targetId={data.id} />` line and the placeholder `<MoreHorizontal className="h-5 w-5 text-muted-foreground" />` (lines ~84-85) with:

```tsx
<TargetAiMenu
  targetId={data.id}
  triageStatus={data.triage_status}
  templates={templates}
  prompts={prompts}
  hasHomepage={hasHomepage}
/>
```

At the top of `BasicView` (it is an async server component), load the data (place near the existing target load):

```tsx
import { getTemplates } from "@/actions/campaigns/templates/get-templates";
import { listPrompts } from "@/actions/crm/prompts/list-prompts";
import { TargetAiMenu } from "./TargetAiMenu";
import { prismadb } from "@/lib/prisma";

// inside the component body, before return:
const [templatesRaw, promptsRaw, homepage] = await Promise.all([
  getTemplates(),
  listPrompts({ kind: "EMAIL" }),
  prismadb.crm_Target_Homepage.findFirst({ where: { targetId: data.id, deletedAt: null }, select: { status: true } }),
]);
const templates = (templatesRaw ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }));
const prompts = promptsRaw.map((p) => ({ id: p.id, name: p.name }));
const hasHomepage = homepage?.status === "READY";
```

> Confirm `getTemplates`'s exact return shape first (`Read actions/campaigns/templates/get-templates.ts`); adjust the `.map` if it returns `{ data }`. Remove the now-unused `EnrichButton`/`MoreHorizontal` imports if nothing else uses them.

- [ ] **Step 6: Verify the build compiles and lints**

Run: `pnpm exec tsc --noEmit` then `pnpm lint`
Expected: no errors; no unused-import warnings (`--max-warnings=0`).

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/(routes)/campaigns/targets/[targetId]/components actions/crm/prompts/list-prompt-bodies.ts
git commit -m "feat(crm): target AI dropdown + generate-email drawer"
```

---

### Task 10: Prompt library management page

**Files:**
- Create: `app/[locale]/(routes)/campaigns/prompts/page.tsx`
- Create: `app/[locale]/(routes)/campaigns/prompts/_components/PromptList.tsx`
- Create: `app/[locale]/(routes)/campaigns/prompts/_components/PromptDialog.tsx`

**Interfaces:**
- Consumes: `listPrompts`, `createPrompt`, `updatePrompt`, `deletePrompt` (Task 4).
- Produces: a page listing EMAIL + HOMEPAGE prompts (both scopes visible to the user) with add/edit/delete. Follows the `admin/crm-settings/_components` dialog pattern.

> Verification is manual + the E2E in Task 12 (which creates an EMAIL prompt through this page or seeds one). Keep it minimal: a table grouped by kind, a create dialog (name, body, kind select, scope select), edit + delete. Reuse `components/ui` dialog/select/input/textarea primitives.

- [ ] **Step 1: Write `page.tsx`**

```tsx
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { listPrompts } from "@/actions/crm/prompts/list-prompts";
import { PromptList } from "./_components/PromptList";

const PromptsPage = async () => {
  const [email, homepage] = await Promise.all([
    listPrompts({ kind: "EMAIL" }),
    listPrompts({ kind: "HOMEPAGE" }),
  ]);
  const prompts = [...email, ...homepage].map((p) => ({
    id: p.id, name: p.name, body: p.body, kind: p.kind, scope: p.scope,
  }));
  return (
    <Container title="AI Prompt Library" description="Reusable prompts for email and homepage generation">
      <PromptList prompts={prompts} />
    </Container>
  );
};
export default PromptsPage;
```

- [ ] **Step 2: Write `_components/PromptList.tsx`**

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deletePrompt } from "@/actions/crm/prompts/delete-prompt";
import { PromptDialog } from "./PromptDialog";

type Prompt = { id: string; name: string; body: string; kind: "EMAIL" | "HOMEPAGE"; scope: "ORG" | "USER" };

export function PromptList({ prompts }: { prompts: Prompt[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [creating, setCreating] = useState(false);

  async function onDelete(id: string) {
    const res = await deletePrompt({ id });
    if ("error" in res) toast.error(res.error);
    else { toast.success("Prompt deleted"); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setCreating(true)} data-testid="prompt-new">New prompt</Button>
      <table className="w-full text-sm">
        <thead><tr className="text-left"><th>Name</th><th>Kind</th><th>Scope</th><th /></tr></thead>
        <tbody>
          {prompts.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="py-2">{p.name}</td><td>{p.kind}</td><td>{p.scope}</td>
              <td className="text-right space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(p.id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {creating && <PromptDialog onClose={() => { setCreating(false); router.refresh(); }} />}
      {editing && <PromptDialog prompt={editing} onClose={() => { setEditing(null); router.refresh(); }} />}
    </div>
  );
}
```

- [ ] **Step 3: Write `_components/PromptDialog.tsx`**

```tsx
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { createPrompt } from "@/actions/crm/prompts/create-prompt";
import { updatePrompt } from "@/actions/crm/prompts/update-prompt";

type Prompt = { id: string; name: string; body: string; kind: "EMAIL" | "HOMEPAGE"; scope: "ORG" | "USER" };

export function PromptDialog({ prompt, onClose }: { prompt?: Prompt; onClose: () => void }) {
  const [name, setName] = useState(prompt?.name ?? "");
  const [body, setBody] = useState(prompt?.body ?? "");
  const [kind, setKind] = useState<"EMAIL" | "HOMEPAGE">(prompt?.kind ?? "EMAIL");
  const [scope, setScope] = useState<"ORG" | "USER">(prompt?.scope ?? "USER");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = prompt
      ? await updatePrompt({ id: prompt.id, name, body })
      : await createPrompt({ name, body, kind, scope });
    setBusy(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(prompt ? "Prompt updated" : "Prompt created");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-testid="prompt-dialog">
        <DialogHeader><DialogTitle>{prompt ? "Edit prompt" : "New prompt"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} data-testid="prompt-name" />
          <Textarea placeholder="Prompt body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} data-testid="prompt-body" />
          {!prompt && (
            <div className="flex gap-2">
              <Select value={kind} onValueChange={(v) => setKind(v as "EMAIL" | "HOMEPAGE")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="EMAIL">Email</SelectItem><SelectItem value="HOMEPAGE">Homepage</SelectItem></SelectContent>
              </Select>
              <Select value={scope} onValueChange={(v) => setScope(v as "ORG" | "USER")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="USER">Personal</SelectItem><SelectItem value="ORG">Org-wide (admin)</SelectItem></SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={save} disabled={busy || !name || !body} data-testid="prompt-save">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Verify compile + lint**

Run: `pnpm exec tsc --noEmit` then `pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/(routes)/campaigns/prompts
git commit -m "feat(crm): AI prompt library management page"
```

---

### Task 11: MCP parity — prompt CRUD + email send

**Files:**
- Create: `lib/mcp/tools/crm-ai-prompts.ts`
- Create: `lib/mcp/tools/crm-target-email.ts`
- Modify: `lib/mcp/tools/index.ts` (register both tool arrays)
- Modify: `docs/reference/UPSTREAM_IMPACT_LOG.md` (log the index.ts touch)
- Test: `lib/mcp/__tests__/crm-ai-prompts.test.ts`

**Interfaces:**
- Consumes: `prismadb`, existing MCP helpers (`listResponse`, `itemResponse`, `notFound`, `paginationSchema`, `paginationArgs` from `../helpers`), the send action `sendTargetEmail` (Task 7). Each tool is `{ name, description, schema (zod), handler(args, userId) }` (see `lib/mcp/tools/crm-target-triage.ts`).
- Produces: `crmAiPromptTools` (`crm_list_prompts`, `crm_create_prompt`, `crm_delete_prompt`), `crmTargetEmailTools` (`crm_send_target_email`), registered in `allTools`.

> The MCP handler receives an authenticated `userId` (auth handled by the MCP layer, see `lib/mcp/auth.ts`). Scope every query by `userId` exactly as `crm-target-triage.ts` does (`created_by: userId` / `user_id: userId`). For send, delegate to `sendTargetEmail` — but note the web action derives the user from the session; for the MCP path, call the same DB logic scoped to `userId`. Simplest correct approach: the send tool loads the target by `{ id, created_by: userId }` then calls a shared core. To avoid duplicating send logic, this task wraps `sendTargetEmail` only if it can run under the MCP session; if not, it performs the same steps inline scoped by `userId`. Confirm `lib/mcp/auth.ts` before choosing.

- [ ] **Step 1: Confirm the MCP auth/session contract**

Run: `sed -n '1,60p' lib/mcp/auth.ts` and `sed -n '1,40p' lib/mcp/helpers.ts`
Expected: learn how `userId` is provided to handlers and what `listResponse`/`itemResponse`/`notFound` return. Decide whether `sendTargetEmail` (session-based) is reachable; if not, implement the send tool inline scoped by `userId`.

- [ ] **Step 2: Write the failing test**

Create `lib/mcp/__tests__/crm-ai-prompts.test.ts`:

```ts
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Ai_Prompt: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() } },
}));
import { prismadb } from "@/lib/prisma";
import { crmAiPromptTools } from "@/lib/mcp/tools/crm-ai-prompts";

const list = crmAiPromptTools.find((t) => t.name === "crm_list_prompts")!;
const create = crmAiPromptTools.find((t) => t.name === "crm_create_prompt")!;

beforeEach(() => jest.clearAllMocks());

it("lists org + personal prompts scoped to the user", async () => {
  (prismadb.crm_Ai_Prompt.findMany as jest.Mock).mockResolvedValue([{ id: "p1" }]);
  (prismadb.crm_Ai_Prompt.count as jest.Mock).mockResolvedValue(1);
  await list.handler({ kind: "EMAIL", limit: 50, offset: 0 }, "u1");
  expect(prismadb.crm_Ai_Prompt.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({
      deletedAt: null, kind: "EMAIL", OR: [{ scope: "ORG" }, { scope: "USER", user_id: "u1" }],
    }) })
  );
});

it("creates a personal prompt owned by the user", async () => {
  (prismadb.crm_Ai_Prompt.create as jest.Mock).mockResolvedValue({ id: "p2" });
  await create.handler({ name: "N", body: "B", kind: "EMAIL" }, "u1");
  expect(prismadb.crm_Ai_Prompt.create).toHaveBeenCalledWith({
    data: { name: "N", body: "B", kind: "EMAIL", scope: "USER", user_id: "u1", created_by: "u1" },
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec jest lib/mcp/__tests__/crm-ai-prompts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `crm-ai-prompts.ts`**

```ts
// Fork-owned MCP tools for the AI prompt library. Registered in index.ts so
// upstream-owned tool files stay untouched. See CLAUDE.md Additive-first standard.
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { paginationSchema, paginationArgs, listResponse, itemResponse, notFound } from "../helpers";

export const crmAiPromptTools = [
  {
    name: "crm_list_prompts",
    description: "List AI prompt-library entries (org-wide + the caller's personal) for a kind (EMAIL or HOMEPAGE).",
    schema: z.object({ kind: z.enum(["EMAIL", "HOMEPAGE"]), ...paginationSchema }),
    async handler(args: { kind: "EMAIL" | "HOMEPAGE"; limit: number; offset: number }, userId: string) {
      const where = { deletedAt: null, kind: args.kind, OR: [{ scope: "ORG" }, { scope: "USER", user_id: userId }] };
      const [data, total] = await Promise.all([
        prismadb.crm_Ai_Prompt.findMany({ where, ...paginationArgs(args), orderBy: { name: "asc" } }),
        prismadb.crm_Ai_Prompt.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_prompt",
    description: "Create a PERSONAL AI prompt (owned by the caller). Org-wide prompts are managed in the web UI by admins.",
    schema: z.object({ name: z.string().min(1), body: z.string().min(1), kind: z.enum(["EMAIL", "HOMEPAGE"]) }),
    async handler(args: { name: string; body: string; kind: "EMAIL" | "HOMEPAGE" }, userId: string) {
      const created = await prismadb.crm_Ai_Prompt.create({
        data: { name: args.name, body: args.body, kind: args.kind, scope: "USER", user_id: userId, created_by: userId },
      });
      return itemResponse(created);
    },
  },
  {
    name: "crm_delete_prompt",
    description: "Soft-delete one of the caller's PERSONAL AI prompts by id.",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Ai_Prompt.findFirst({
        where: { id: args.id, scope: "USER", user_id: userId, deletedAt: null },
      });
      if (!existing) notFound("Prompt");
      const updated = await prismadb.crm_Ai_Prompt.update({
        where: { id: args.id }, data: { deletedAt: new Date(), deletedBy: userId },
      });
      return itemResponse(updated);
    },
  },
];
```

- [ ] **Step 5: Write `crm-target-email.ts`** (send tool — inline, scoped by `userId`; adapt per Step 1 findings)

```ts
// Fork-owned MCP tool: send a one-off outreach email to an approved target.
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";
import { renderCampaignEmail } from "@/lib/campaigns/render-email";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";
import { composeTargetEmailContent, buildTargetMergeSource } from "@/lib/campaigns/compose-target-email";
import { redirectRecipients } from "@/lib/email/redirect";
import { itemResponse, notFound } from "../helpers";

export const crmTargetEmailTools = [
  {
    name: "crm_send_target_email",
    description:
      "Send a one-off outreach email to an APPROVED target using a campaign template as the wrapper. Provide the AI-written body HTML and subject. Refuses non-approved or do-not-email targets.",
    schema: z.object({
      target_id: z.string().uuid(),
      template_id: z.string().uuid(),
      subject: z.string().min(1),
      body_html: z.string().min(1),
      include_homepage: z.boolean().optional(),
    }),
    async handler(
      args: { target_id: string; template_id: string; subject: string; body_html: string; include_homepage?: boolean },
      userId: string
    ) {
      const target = await prismadb.crm_Targets.findFirst({
        where: { id: args.target_id, created_by: userId, deletedAt: null },
      });
      if (!target) notFound("Target");
      if (target.triage_status !== "APPROVED") throw new Error("Target must be approved before outreach");
      if (target.do_not_email) throw new Error("Target is marked do-not-email");
      const recipient = target.email ?? target.company_email ?? target.personal_email;
      if (!recipient) throw new Error("Target has no email address");

      const template = await prismadb.crm_campaign_templates.findFirst({
        where: { id: args.template_id, deletedAt: null },
      });
      if (!template) notFound("Template");

      const homepage = args.include_homepage
        ? await prismadb.crm_Target_Homepage.findFirst({ where: { targetId: args.target_id, deletedAt: null } })
        : null;
      const mergeSource = buildTargetMergeSource(target, homepage);
      const contentHtml = composeTargetEmailContent({ templateHtml: template.content_html, bodyHtml: args.body_html, mergeSource });
      const resolvedSubject = resolveMergeTags(args.subject, mergeSource);

      const draft = await prismadb.crm_Target_Email.create({
        data: {
          targetId: args.target_id, template_id: args.template_id, subject: resolvedSubject,
          body_html: args.body_html, included_homepage: Boolean(args.include_homepage) && homepage?.status === "READY",
          status: "DRAFT", created_by: userId,
        },
      });
      const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/api/crm/targets/unsubscribe?token=${draft.unsubscribe_token}`;
      const html = await renderCampaignEmail({ contentHtml, unsubscribeUrl });
      const resend = new Resend(process.env.RESEND_CAMPAIGNS_API_KEY || process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!, to: redirectRecipients(recipient),
        subject: resolvedSubject, html, headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
      });
      if (result.error) {
        await prismadb.crm_Target_Email.update({ where: { id: draft.id }, data: { status: "FAILED", error_message: result.error.message } });
        throw new Error("Failed to send email");
      }
      const sent = await prismadb.crm_Target_Email.update({
        where: { id: draft.id }, data: { status: "SENT", resend_message_id: result.data?.id, sent_at: new Date() },
      });
      return itemResponse(sent);
    },
  },
];
```

- [ ] **Step 6: Register both in `index.ts`**

Add exports + imports + spread entries mirroring the existing lines (e.g. after `crmTargetTriageTools`):

```ts
export { crmAiPromptTools } from "./crm-ai-prompts";
export { crmTargetEmailTools } from "./crm-target-email";
// ...matching import lines...
// ...in allTools array:
  ...crmAiPromptTools,
  ...crmTargetEmailTools,
```

- [ ] **Step 7: Log the upstream touch + run tests**

Append to `docs/reference/UPSTREAM_IMPACT_LOG.md`: file `lib/mcp/tools/index.ts`, "insertion-only: register crmAiPromptTools + crmTargetEmailTools", risk Low.

Run: `pnpm exec jest lib/mcp/__tests__/crm-ai-prompts.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add lib/mcp/tools/crm-ai-prompts.ts lib/mcp/tools/crm-target-email.ts lib/mcp/tools/index.ts lib/mcp/__tests__/crm-ai-prompts.test.ts docs/reference/UPSTREAM_IMPACT_LOG.md
git commit -m "feat(mcp): prompt-library CRUD + send-target-email tools"
```

---

### Task 12: E2E happy path + docs sync + final checks

**Files:**
- Create: `e2e/target-ai-email.spec.ts` (name/location per `docs/testing/e2e-patterns.md`)
- Create/Modify: manual-testing doc (per the doc-sync set) with a matching manual step
- Modify: `docs/reference/PROJECT_STRUCTURE.md` (new routes: `campaigns/prompts`, `api/crm/targets/unsubscribe`; new action dirs)
- Modify: `docs/reference/LESSONS_LEARNED.md` (append any gotcha found)
- Modify: `CUSTOMIZATIONS.md` (record the AI-outreach deviation)
- Modify: `docs/reference/ENVIRONMENT_VARIABLES.md` (note: no NEW required var this phase; state explicitly so the env-doc guard stays green)

**Interfaces:**
- Consumes: the full email flow (Tasks 1-11).

> Read `docs/testing/e2e-patterns.md` FIRST (RSC streaming waits, `{ times: 1 }` one-shot mocks, auth-user FK cleanup order, `maybeSingle()` traps). Mock the Anthropic call at the network layer (route interception) so the test is deterministic and free.

- [ ] **Step 1: Write the E2E happy-path spec**

Create `e2e/target-ai-email.spec.ts` (adapt selectors to the `data-testid`s from Task 9; adapt seeding/login to the existing e2e harness):

```ts
import { test, expect } from "@playwright/test";

test("generate and send an outreach email from an approved target", async ({ page }) => {
  // Preconditions (via seed/fixtures per e2e-patterns.md):
  //  - logged-in admin, an APPROVED target with an email, one EMAIL prompt, one template containing {{body}}.
  // Intercept the Anthropic API so generation is deterministic.
  await page.route("**/api.anthropic.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ subject: "Hi {{company}}", html: "<p>Pitch for {{company}}</p>" }) }] }),
    })
  );
  // Intercept Resend send so no real email leaves.
  await page.route("**/api.resend.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "msg_e2e" }) })
  );

  await page.goto(`/campaigns/targets/${process.env.E2E_APPROVED_TARGET_ID}`);
  await page.getByTestId("target-ai-menu").click();
  await page.getByTestId("ai-generate-email").click();
  await expect(page.getByTestId("generate-email-drawer")).toBeVisible();

  await page.getByTestId("email-prompt-text").fill("Warm, concise, mention their outdated site.");
  await page.getByTestId("email-generate-btn").click();
  await expect(page.getByTestId("email-subject")).toHaveValue(/Hi/);
  await expect(page.getByTestId("email-preview")).toBeVisible();

  await page.getByTestId("email-send-btn").click();
  await expect(page.getByText("Email sent")).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E spec**

Run: `pnpm exec playwright test e2e/target-ai-email.spec.ts`
Expected: PASS (adjust seeding until green).

- [ ] **Step 3: Complete the doc-sync walk**

Update each doc-sync target listed in Files above. For `ENVIRONMENT_VARIABLES.md`, add a note that this phase introduces no new required env var (previews vars arrive with the homepage build). Add the matching manual-test step and confirm manual↔E2E parity.

- [ ] **Step 4: Run the full unit suite + lint + typecheck**

Run: `pnpm exec jest` (or `pnpm test`) then `pnpm lint` then `pnpm exec tsc --noEmit`
Expected: all green, 0 warnings.

- [ ] **Step 5: Regression-verify the gate tests** (per CLAUDE.md)

For the "refuses non-approved" test in Task 5 (or 7): temporarily toggle the gate off (comment the `triage_status !== "APPROVED"` check via a reversible edit, NOT `git checkout`), run that test, confirm it FAILS, then restore and confirm PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e docs CUSTOMIZATIONS.md
git commit -m "test(e2e): target AI email happy path + docs sync"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage:** Entry-point dropdown → Task 9. Prompt library (org+personal, kind) → Tasks 1,4,10,11. AI email generation (Claude, from description, gated) → Task 5. Template merge + preview (extended tags, render pipeline) → Tasks 2,3,6. One-off direct send (Resend campaigns key, redirect guard, activity, audit) → Task 7. Unsubscribe/opt-out → Task 8. Homepage seam (table + tags resolve empty) → Tasks 1,2,3. MCP parity (prompt CRUD + email send; homepage MCP deferred) → Task 11. Upstream-impact logging → Tasks 1,11. Env doc parity → Task 12. Homepage generation itself is intentionally **out of scope** (separate follow-up plan).

**2. Placeholder scan:** No "TBD"/"handle edge cases" left; every code step has real code. Two steps say "confirm X first" (UI primitive filenames in Task 9; MCP auth contract in Task 11) — these are read-then-adapt instructions with concrete fallbacks named, not deferred design.

**3. Type consistency:** `resolveMergeTags(html, MergeTagTarget, escapeHtml?)`, `buildTargetMergeSource(target, homepage)`, `composeTargetEmailContent({templateHtml, bodyHtml, mergeSource})`, `generateTargetEmail({targetId, prompt})→{data:{subject,body_html}}`, `previewTargetEmail(...)→{data:{html,subject}}`, `sendTargetEmail(...)→{data:{id}}`, `listPrompts({kind})`, `listPromptBodies({kind})→{id,name,body}[]` are used consistently across tasks. Enum string values (`EMAIL`/`ORG`/`APPROVED`/`READY`/`SENT`) match Task 1.

**4. Review Focus:** Each of the five listed input classes has a test in its owning task (non-approved → 5/6/7; do_not_email → 7; missing `{{body}}` → 3; no homepage → 2/3; malformed AI → 5). Section is non-empty; check performed.
