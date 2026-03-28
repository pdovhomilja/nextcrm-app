# E2B Agent Enrichment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `AgentOrchestrator`-based Inngest enrichment with an E2B sandbox agent that uses `agent-browser` CLI for real browser research, and introduce `crm_Target_Contact` to store multiple C-level contacts per Target.

**Architecture:** Each `enrich/target.run` Inngest event spawns an E2B sandbox, uploads and runs a Node.js agent script that runs a Claude Sonnet tool-use loop over `agent-browser` CLI commands, writes typed JSON to stdout, then Inngest applies the result to the DB and fans out per-contact enrichment events. A new `enrich/target.contact.run` event handles individual contact enrichment.

**Tech Stack:** Next.js App Router, Prisma + PostgreSQL, Inngest, E2B (`e2b` npm package), `agent-browser` CLI (Rust binary), `@anthropic-ai/sdk`, Tailwind + shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-03-26-e2b-agent-enrichment-design.md`

**Critical notes:**
- `prisma db push` (NOT `migrate dev`) — live DB has drift from migration history
- Auth import: `import { authOptions } from "@/lib/auth"`
- `getApiKey("ANTHROPIC", triggeredBy)` works via existing 3-tier key resolution
- E2B template must be built and deployed before the Inngest function can use it — Task 3 includes the CLI step
- Tests go in `__tests__/enrichment/` (jest testMatch: `**/__tests__/**/*.test.ts`)
- Target detail page is at `app/[locale]/(routes)/campaigns/targets/[targetId]/`
- Toast notifications use `sonner` (already installed)

---

## File Map

**New files:**
- `prisma/schema.prisma` — add `crm_Target_Contact` model + back-relations
- `e2b.Dockerfile` — E2B template: Node.js + agent-browser + Chrome
- `e2b.toml` — E2B template config
- `lib/enrichment/e2b/agent-script.ts` — exports agent script content as a string (bundleable)
- `lib/enrichment/e2b/apply-result.ts` — pure fn: parse agent output, build DB updates
- `inngest/functions/enrich-target-contact.ts` — per-contact enrichment (Mode 2)
- `app/[locale]/(routes)/campaigns/targets/[targetId]/components/TargetContactsTable.tsx` — contacts table
- `__tests__/enrichment/e2b-apply-result.test.ts` — unit tests for apply-result logic

**Modified files:**
- `inngest/functions/enrich-target.ts` — replace AgentEnrichmentStrategy with E2B sandbox call
- `app/api/inngest/route.ts` — register `enrichTargetContact`
- `app/[locale]/(routes)/campaigns/targets/[targetId]/components/BasicView.tsx` — add TargetContactsTable
- `package.json` — add `e2b` dependency

---

## Task 1: Prisma schema — add crm_Target_Contact

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add crm_Target_Contact model**

In `prisma/schema.prisma`, after the `crm_Target_Enrichment` model block, add:

```prisma
model crm_Target_Contact {
  id           String                @id @default(uuid()) @db.Uuid
  targetId     String                @db.Uuid
  contactId    String?               @db.Uuid
  name         String?
  email        String?
  title        String?
  phone        String?
  linkedinUrl  String?
  source       String                @default("manual")
  enrichStatus crm_Enrichment_Status @default(PENDING)
  enrichedAt   DateTime?
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt

  target   crm_Targets    @relation(fields: [targetId], references: [id], onDelete: Cascade)
  contact  crm_Contacts?  @relation("target_contact_link", fields: [contactId], references: [id], onDelete: SetNull)

  @@unique([targetId, email])
  @@unique([targetId, linkedinUrl])
  @@index([targetId])
  @@index([enrichStatus])
}
```

- [ ] **Step 2: Add back-relation to crm_Targets**

Inside the `crm_Targets` model block, after the `enrichments` relation line, add:

```prisma
  target_contacts  crm_Target_Contact[]
```

- [ ] **Step 3: Add back-relation to crm_Contacts**

Inside the `crm_Contacts` model block, add:

```prisma
  target_contact_links  crm_Target_Contact[]  @relation("target_contact_link")
```

- [ ] **Step 4: Push schema to DB**

```bash
pnpm prisma db push
```

Expected output: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Verify generated client**

```bash
pnpm prisma generate
```

Expected output: `Generated Prisma Client` with no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add crm_Target_Contact model for multi-contact enrichment"
```

---

## Task 2: Install E2B package

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install e2b SDK**

```bash
pnpm add e2b
```

- [ ] **Step 2: Verify installation**

```bash
node -e "const { Sandbox } = require('e2b'); console.log('ok')"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add e2b SDK dependency"
```

---

## Task 3: E2B template — Dockerfile + build

**Files:**
- Create: `e2b.Dockerfile`
- Create: `e2b.toml`

- [ ] **Step 1: Create e2b.Dockerfile**

Create `e2b.Dockerfile` at repo root:

```dockerfile
FROM e2b/nodejs:latest

# Install agent-browser globally and download Chrome
RUN npm install -g agent-browser tsx @anthropic-ai/sdk
RUN agent-browser install

# Verify
RUN agent-browser --version
```

- [ ] **Step 2: Create e2b.toml**

Create `e2b.toml` at repo root:

```toml
[template]
dockerfile = "e2b.Dockerfile"
name = "nextcrm-enrichment"
```

- [ ] **Step 3: Install E2B CLI and build template**

```bash
npx e2b auth login
npx e2b template build --name nextcrm-enrichment
```

Expected output includes a template ID like `nextcrm-enrichment-abc123`. Copy this ID.

- [ ] **Step 4: Store template ID in .env**

Add to `.env.local`:

```
E2B_API_KEY=e2b_***
E2B_ENRICHMENT_TEMPLATE=nextcrm-enrichment
```

- [ ] **Step 5: Commit**

```bash
git add e2b.Dockerfile e2b.toml
git commit -m "feat: add E2B sandbox template for agent enrichment"
```

---

## Task 4: Agent script module + tests

**Files:**
- Create: `lib/enrichment/e2b/agent-script.ts`
- Create: `lib/enrichment/e2b/apply-result.ts`
- Create: `__tests__/enrichment/e2b-apply-result.test.ts`

### Step 4a: Write failing tests first

- [ ] **Step 1: Write the failing tests**

Create `__tests__/enrichment/e2b-apply-result.test.ts`:

```typescript
import {
  resolveCompanyDomain,
  filterByConfidence,
  buildContactUpsertKey,
} from "@/lib/enrichment/e2b/apply-result";

describe("resolveCompanyDomain", () => {
  it("returns website domain when website is provided", () => {
    expect(resolveCompanyDomain({
      companyWebsite: "https://acme.com",
      email: "john@gmail.com",
      companyName: "Acme",
    })).toBe("acme.com");
  });

  it("returns email domain when email is corporate (non-personal)", () => {
    expect(resolveCompanyDomain({
      companyWebsite: null,
      email: "john@acme.com",
      companyName: "Acme",
    })).toBe("acme.com");
  });

  it("returns null when email is personal Gmail", () => {
    expect(resolveCompanyDomain({
      companyWebsite: null,
      email: "john@gmail.com",
      companyName: "Acme",
    })).toBeNull();
  });

  it("returns null when no website and no email", () => {
    expect(resolveCompanyDomain({
      companyWebsite: null,
      email: null,
      companyName: "Acme",
    })).toBeNull();
  });
});

describe("filterByConfidence", () => {
  it("removes fields with confidence below 0.6", () => {
    const result = filterByConfidence(
      { company_website: "https://acme.com", company_phone: "+1 415 000 0000" },
      { company_website: 0.9, company_phone: 0.5 }
    );
    expect(result).toEqual({ company_website: "https://acme.com" });
  });

  it("keeps fields with no confidence entry (assume high)", () => {
    const result = filterByConfidence({ company_name: "Acme" }, {});
    expect(result).toEqual({ company_name: "Acme" });
  });
});

describe("buildContactUpsertKey", () => {
  it("prefers email as dedup key when present", () => {
    expect(buildContactUpsertKey("target-1", { email: "a@b.com", linkedinUrl: null }))
      .toEqual({ targetId_email: { targetId: "target-1", email: "a@b.com" } });
  });

  it("falls back to linkedinUrl when no email", () => {
    expect(buildContactUpsertKey("target-1", { email: null, linkedinUrl: "https://linkedin.com/in/foo" }))
      .toEqual({ targetId_linkedinUrl: { targetId: "target-1", linkedinUrl: "https://linkedin.com/in/foo" } });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm jest __tests__/enrichment/e2b-apply-result.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/enrichment/e2b/apply-result'`

- [ ] **Step 3: Create apply-result.ts**

Create `lib/enrichment/e2b/apply-result.ts`:

```typescript
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'aol.com', 'protonmail.com', 'me.com',
]);

export interface AgentOutput {
  target: Record<string, string | null>;
  contacts: Array<{
    name: string | null;
    email: string | null;
    title: string | null;
    linkedinUrl: string | null;
    phone: string | null;
    source: string;
  }>;
  confidence: Record<string, number>;
}

export interface DomainContext {
  companyWebsite: string | null;
  email: string | null;
  companyName: string;
}

/** Returns the known company domain, or null if it must be searched. */
export function resolveCompanyDomain(ctx: DomainContext): string | null {
  if (ctx.companyWebsite) {
    try {
      return new URL(ctx.companyWebsite).hostname.replace(/^www\./, '');
    } catch { /* ignore */ }
  }
  if (ctx.email) {
    const domain = ctx.email.split('@')[1];
    if (domain && !PERSONAL_EMAIL_DOMAINS.has(domain.toLowerCase())) {
      return domain;
    }
  }
  return null;
}

/** Removes fields from the result whose confidence is below threshold. */
export function filterByConfidence(
  fields: Record<string, string | null>,
  confidence: Record<string, number>,
  threshold = 0.6
): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => {
      const score = confidence[key];
      return score === undefined || score >= threshold;
    })
  );
}

/** Builds the Prisma where clause for contact upsert dedup. */
export function buildContactUpsertKey(
  targetId: string,
  contact: { email: string | null; linkedinUrl: string | null }
): Record<string, unknown> {
  if (contact.email) {
    return { targetId_email: { targetId, email: contact.email } };
  }
  return { targetId_linkedinUrl: { targetId, linkedinUrl: contact.linkedinUrl } };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm jest __tests__/enrichment/e2b-apply-result.test.ts --no-coverage
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Create agent-script.ts**

Create `lib/enrichment/e2b/agent-script.ts`:

```typescript
export interface AgentScriptParams {
  email: string;
  companyName: string;
  companyWebsite: string;
  targetName: string;
  knownDomain: string | null;
}

/** Returns the complete Node.js enrichment agent script as a string.
 *  This is uploaded to the E2B sandbox at runtime. */
export function getAgentScript(params: AgentScriptParams): string {
  const { email, companyName, companyWebsite, targetName, knownDomain } = params;

  const domainInstruction = companyWebsite
    ? `The company website is known: ${companyWebsite}. Open it directly — do not search for the domain.`
    : knownDomain
    ? `Derive the company domain from the email: ${knownDomain}. Open https://${knownDomain} directly.`
    : `Search for "${companyName} official website" to discover the company domain.`;

  const contactInstruction = targetName
    ? `Also specifically find ${targetName}'s job title and LinkedIn URL.`
    : '';

  return `
import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const tools = [
  {
    name: 'browser_open',
    description: 'Navigate to a URL in the browser',
    input_schema: { type: 'object', properties: { url: { type: 'string', description: 'Full URL including https://' } }, required: ['url'] },
  },
  {
    name: 'browser_snapshot',
    description: 'Get the accessible text tree of the current page with interactive element refs like @e1, @e2',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'browser_click',
    description: 'Click an element by its ref from the snapshot (e.g. @e3)',
    input_schema: { type: 'object', properties: { ref: { type: 'string' } }, required: ['ref'] },
  },
  {
    name: 'browser_extract',
    description: 'Extract specific information from the current page using a natural language prompt',
    input_schema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
  },
  {
    name: 'web_search',
    description: 'Search the web and return results',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
];

function runBrowser(args) {
  try {
    return execSync('agent-browser ' + args.map(a => JSON.stringify(a)).join(' '), {
      encoding: 'utf8',
      timeout: 30000,
    });
  } catch (e) {
    return e.stdout || e.stderr || 'error: ' + e.message;
  }
}

function executeTool(name, input) {
  if (name === 'browser_open')     return runBrowser(['open', input.url]);
  if (name === 'browser_snapshot') return runBrowser(['snapshot']);
  if (name === 'browser_click')    return runBrowser(['click', input.ref]);
  if (name === 'browser_extract')  return runBrowser(['extract', input.prompt]);
  if (name === 'web_search')       return runBrowser(['search', input.query]);
  return 'unknown tool';
}

const systemPrompt = \`You are an expert B2B researcher. Your job is to find all data needed to start outreach to a company.

Known information:
- Company name: ${companyName || 'unknown'}
- Company website: ${companyWebsite || 'not known'}
- Contact email: ${email || 'not known'}
- Contact name: ${targetName || 'not known'}

Research strategy (follow this order):
1. ${domainInstruction}
2. From the company homepage, extract: company description, industry, employee count, HQ location/city, main phone number, LinkedIn company URL, Twitter/X URL.
3. Open /contact or /about pages if homepage lacks address or phone.
4. Search for C-level contacts at "${companyName}": search "CEO OR CTO OR CFO OR CMO OR \\"VP Sales\\" OR \\"Head of Sales\\" ${companyName} site:linkedin.com".
5. For each C-level person found in search results, record their name, title, and LinkedIn URL.
${contactInstruction}

When you have gathered sufficient data (or exhausted reasonable research steps), output ONLY a valid JSON object in this exact format and nothing else:

{
  "target": {
    "company_website": "string or null",
    "industry": "string or null",
    "employees": "string or null",
    "city": "string or null",
    "company_phone": "string or null",
    "social_linkedin": "string or null",
    "social_x": "string or null",
    "description": "string or null"
  },
  "contacts": [
    {
      "name": "string",
      "email": null,
      "title": "string or null",
      "linkedinUrl": "string or null",
      "phone": null,
      "source": "enriched"
    }
  ],
  "confidence": {
    "fieldName": 0.9
  }
}

Rules:
- Output ONLY the JSON — no explanation, no markdown, no code fences
- Set confidence for any field you are not certain about (0.0 to 1.0)
- Set null for fields you could not find
- Do not search for information you already have
\`;

async function main() {
  const messages = [{ role: 'user', content: 'Research this company and return the JSON result.' }];

  for (let i = 0; i < 25; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      if (textBlock) {
        const text = textBlock.text.trim();
        const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
        if (jsonMatch) {
          process.stdout.write(jsonMatch[0]);
          process.exit(0);
        }
      }
      process.stderr.write('No JSON in agent response\\n');
      process.exit(1);
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = {
        role: 'user',
        content: response.content
          .filter(b => b.type === 'tool_use')
          .map(b => ({
            type: 'tool_result',
            tool_use_id: b.id,
            content: executeTool(b.name, b.input),
          })),
      };
      messages.push(toolResults);
    }
  }

  process.stderr.write('Max iterations reached\\n');
  process.exit(1);
}

main().catch(e => { process.stderr.write(e.message + '\\n'); process.exit(1); });
`.trim();
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/enrichment/e2b/ __tests__/enrichment/e2b-apply-result.test.ts
git commit -m "feat: add E2B agent script and apply-result helpers"
```

---

## Task 5: Update enrich-target Inngest function

**Files:**
- Modify: `inngest/functions/enrich-target.ts`

- [ ] **Step 1: Replace the function body**

Replace the entire contents of `inngest/functions/enrich-target.ts` with:

```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { isFieldEmpty } from "@/lib/enrichment/utils/field-utils";
import { getApiKey } from "@/lib/api-keys";
import { getAgentScript } from "@/lib/enrichment/e2b/agent-script";
import { resolveCompanyDomain, filterByConfidence, buildContactUpsertKey, type AgentOutput } from "@/lib/enrichment/e2b/apply-result";
import { Sandbox } from "e2b";
import type { EnrichmentField } from "@/lib/enrichment/types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** Exported for unit testing. */
export function shouldSkipTargetEnrichment(lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return false;
  return Date.now() - lastCompletedAt.getTime() < SEVEN_DAYS_MS;
}

const TARGET_FIELD_MAP: Record<string, string> = {
  company_website:  "company_website",
  industry:         "industry",
  employees:        "employees",
  city:             "city",
  company_phone:    "company_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  description:      "description",
};

export const enrichTarget = inngest.createFunction(
  {
    id: "enrich-target",
    name: "Enrich Target",
    triggers: [{ event: "enrich/target.run" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { targetId, enrichmentId, triggeredBy } = event.data as {
      targetId: string;
      enrichmentId: string;
      fields: EnrichmentField[];
      triggeredBy?: string;
    };

    // Resolve API keys
    const anthropicKey = await step.run("resolve-api-key", () =>
      getApiKey("ANTHROPIC", triggeredBy)
    );

    if (!anthropicKey) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "FAILED", error: "NO_API_KEY: configure ANTHROPIC key in admin or profile settings" },
      });
      return;
    }

    // Load target
    const target = await step.run("load-target", () =>
      prismadb.crm_Targets.findUnique({
        where: { id: targetId },
        select: {
          id: true, first_name: true, last_name: true,
          email: true, company: true, company_website: true,
          industry: true, employees: true, city: true,
          company_phone: true, social_linkedin: true, social_x: true, description: true,
        },
      })
    );

    if (!target?.company && !target?.email) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "No email or company on target" },
      });
      return { skipped: "no email or company" };
    }

    // 7-day dedup check
    const recentEnrichment = await prismadb.crm_Target_Enrichment.findFirst({
      where: { targetId, status: "COMPLETED", createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) } },
      select: { createdAt: true },
    });

    if (shouldSkipTargetEnrichment(recentEnrichment?.createdAt ?? null)) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "Enriched within last 7 days" },
      });
      return { skipped: "recently enriched" };
    }

    await prismadb.crm_Target_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "RUNNING" },
    });

    // Run E2B enrichment agent
    const agentOutput = await step.run("run-e2b-agent", async (): Promise<AgentOutput> => {
      const knownDomain = resolveCompanyDomain({
        companyWebsite: target.company_website ?? null,
        email: target.email ?? null,
        companyName: target.company ?? "",
      });

      const script = getAgentScript({
        email: target.email ?? "",
        companyName: target.company ?? "",
        companyWebsite: target.company_website ?? "",
        targetName: [target.first_name, target.last_name].filter(Boolean).join(" "),
        knownDomain,
      });

      const sandbox = await Sandbox.create({
        template: process.env.E2B_ENRICHMENT_TEMPLATE ?? "nextcrm-enrichment",
        timeoutMs: SANDBOX_TIMEOUT_MS,
        apiKey: process.env.E2B_API_KEY,
      });

      try {
        await sandbox.files.write("/home/user/agent.mjs", script);
        const result = await sandbox.commands.run("node /home/user/agent.mjs", {
          envs: { ANTHROPIC_API_KEY: anthropicKey },
        });

        if (result.exitCode !== 0) {
          throw new Error(`Agent exited ${result.exitCode}: ${result.stderr}`);
        }

        return JSON.parse(result.stdout) as AgentOutput;
      } finally {
        await sandbox.kill().catch(() => {});
      }
    });

    // Apply target fields (empty fields only)
    await step.run("apply-target-fields", async () => {
      const filtered = filterByConfidence(agentOutput.target, agentOutput.confidence);
      const updates: Record<string, string> = {};

      for (const [agentKey, value] of Object.entries(filtered)) {
        const dbColumn = TARGET_FIELD_MAP[agentKey];
        if (!dbColumn || !value) continue;
        const current = (target as unknown as Record<string, string | null>)[dbColumn];
        if (isFieldEmpty(current)) updates[dbColumn] = value;
      }

      if (Object.keys(updates).length > 0) {
        await prismadb.crm_Targets.update({ where: { id: targetId }, data: updates });
      }
      return { applied: Object.keys(updates) };
    });

    // Upsert discovered contacts
    const contactIds = await step.run("upsert-contacts", async () => {
      const ids: string[] = [];
      for (const contact of agentOutput.contacts ?? []) {
        if (!contact.name && !contact.email && !contact.linkedinUrl) continue;
        const where = buildContactUpsertKey(targetId, contact);
        const upserted = await prismadb.crm_Target_Contact.upsert({
          where: where as Parameters<typeof prismadb.crm_Target_Contact.upsert>[0]["where"],
          create: {
            targetId,
            name: contact.name,
            email: contact.email,
            title: contact.title,
            linkedinUrl: contact.linkedinUrl,
            phone: contact.phone,
            source: "enriched",
            enrichStatus: contact.title && contact.linkedinUrl ? "COMPLETED" : "PENDING",
            enrichedAt: contact.title && contact.linkedinUrl ? new Date() : null,
          },
          update: {
            title: contact.title ?? undefined,
            linkedinUrl: contact.linkedinUrl ?? undefined,
            name: contact.name ?? undefined,
            enrichStatus: contact.title && contact.linkedinUrl ? "COMPLETED" : "PENDING",
            enrichedAt: contact.title && contact.linkedinUrl ? new Date() : null,
          },
          select: { id: true, enrichStatus: true },
        });
        if (upserted.enrichStatus === "PENDING") ids.push(upserted.id);
      }
      return ids;
    });

    // Fan out contact enrichment for contacts still needing enrichment
    if (contactIds.length > 0) {
      await step.sendEvent(
        "fan-out-contact-enrichment",
        contactIds.map((contactId) => ({
          name: "enrich/target.contact.run",
          data: { contactId, triggeredBy },
        }))
      );
    }

    await prismadb.crm_Target_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "COMPLETED" },
    });

    return { enriched: true, contactsFound: agentOutput.contacts?.length ?? 0 };
  }
);
```

- [ ] **Step 2: Check LSP diagnostics**

Open the file in your editor and confirm zero TypeScript errors. Pay attention to:
- `Sandbox` import from `e2b`
- `prismadb.crm_Target_Contact` — requires Task 1 schema push + `pnpm prisma generate`
- `buildContactUpsertKey` return type matching Prisma's `upsert where`

- [ ] **Step 3: Run existing unit test**

```bash
pnpm jest __tests__/enrichment/enrich-target-job.test.ts --no-coverage
```

Expected: PASS — the `shouldSkipTargetEnrichment` export is preserved.

- [ ] **Step 4: Commit**

```bash
git add inngest/functions/enrich-target.ts
git commit -m "feat: replace AgentEnrichmentStrategy with E2B sandbox agent in enrich-target"
```

---

## Task 6: New enrich-target-contact Inngest function

**Files:**
- Create: `inngest/functions/enrich-target-contact.ts`

- [ ] **Step 1: Create the function**

Create `inngest/functions/enrich-target-contact.ts`:

```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import { getAgentScript } from "@/lib/enrichment/e2b/agent-script";
import { resolveCompanyDomain, filterByConfidence, type AgentOutput } from "@/lib/enrichment/e2b/apply-result";
import { isFieldEmpty } from "@/lib/enrichment/utils/field-utils";
import { Sandbox } from "e2b";

const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000;

export const enrichTargetContact = inngest.createFunction(
  {
    id: "enrich-target-contact",
    name: "Enrich Target Contact",
    triggers: [{ event: "enrich/target.contact.run" }],
    retries: 2,
  },
  async ({ event, step }) => {
    const { contactId, triggeredBy } = event.data as {
      contactId: string;
      triggeredBy?: string;
    };

    const contact = await step.run("load-contact", () =>
      prismadb.crm_Target_Contact.findUnique({
        where: { id: contactId },
        select: {
          id: true, name: true, email: true, title: true, linkedinUrl: true, phone: true,
          target: {
            select: { company: true, company_website: true, email: true },
          },
        },
      })
    );

    if (!contact) return { skipped: "contact not found" };
    if (contact.title && contact.linkedinUrl) {
      await prismadb.crm_Target_Contact.update({
        where: { id: contactId },
        data: { enrichStatus: "COMPLETED", enrichedAt: new Date() },
      });
      return { skipped: "already enriched" };
    }

    const anthropicKey = await step.run("resolve-api-key", () =>
      getApiKey("ANTHROPIC", triggeredBy)
    );

    if (!anthropicKey) {
      await prismadb.crm_Target_Contact.update({
        where: { id: contactId },
        data: { enrichStatus: "FAILED" },
      });
      return;
    }

    await prismadb.crm_Target_Contact.update({
      where: { id: contactId },
      data: { enrichStatus: "RUNNING" },
    });

    const agentOutput = await step.run("run-e2b-agent", async (): Promise<AgentOutput> => {
      const knownDomain = resolveCompanyDomain({
        companyWebsite: contact.target.company_website ?? null,
        email: contact.email ?? contact.target.email ?? null,
        companyName: contact.target.company ?? "",
      });

      // Mode 2: contact-only enrichment script
      // Reuse getAgentScript — the system prompt focuses on finding the person
      const script = getAgentScript({
        email: contact.email ?? contact.target.email ?? "",
        companyName: contact.target.company ?? "",
        companyWebsite: contact.target.company_website ?? "",
        targetName: contact.name ?? "",
        knownDomain,
      });

      const sandbox = await Sandbox.create({
        template: process.env.E2B_ENRICHMENT_TEMPLATE ?? "nextcrm-enrichment",
        timeoutMs: SANDBOX_TIMEOUT_MS,
        apiKey: process.env.E2B_API_KEY,
      });

      try {
        await sandbox.files.write("/home/user/agent.mjs", script);
        const result = await sandbox.commands.run("node /home/user/agent.mjs", {
          envs: { ANTHROPIC_API_KEY: anthropicKey },
        });

        if (result.exitCode !== 0) {
          throw new Error(`Agent exited ${result.exitCode}: ${result.stderr}`);
        }

        return JSON.parse(result.stdout) as AgentOutput;
      } finally {
        await sandbox.kill().catch(() => {});
      }
    });

    await step.run("apply-contact-fields", async () => {
      const filtered = filterByConfidence(agentOutput.target, agentOutput.confidence);

      // Find the person in contacts array that matches our contact name
      const personData = (agentOutput.contacts ?? []).find(
        (c) => c.name && contact.name && c.name.toLowerCase().includes(contact.name.split(' ')[0]?.toLowerCase() ?? '')
      );

      const updates: Record<string, unknown> = {};

      if (isFieldEmpty(contact.title) && personData?.title) updates.title = personData.title;
      if (isFieldEmpty(contact.linkedinUrl) && personData?.linkedinUrl) updates.linkedinUrl = personData.linkedinUrl;
      if (isFieldEmpty(contact.phone) && personData?.phone) updates.phone = personData.phone;

      updates.enrichStatus = "COMPLETED";
      updates.enrichedAt = new Date();

      await prismadb.crm_Target_Contact.update({ where: { id: contactId }, data: updates });
      return { applied: Object.keys(updates) };
    });

    return { enriched: true };
  }
);
```

- [ ] **Step 2: Check LSP diagnostics — zero errors expected**

- [ ] **Step 3: Commit**

```bash
git add inngest/functions/enrich-target-contact.ts
git commit -m "feat: add enrich-target-contact Inngest function"
```

---

## Task 7: Register enrichTargetContact in Inngest route

**Files:**
- Modify: `app/api/inngest/route.ts`

- [ ] **Step 1: Add import**

In `app/api/inngest/route.ts`, add after the `enrichTargetsBulk` import line:

```typescript
import { enrichTargetContact } from "@/inngest/functions/enrich-target-contact";
```

- [ ] **Step 2: Add to functions array**

In the `functions: [...]` array, add `enrichTargetContact` after `enrichTargetsBulk`:

```typescript
    enrichTarget,
    enrichTargetsBulk,
    enrichTargetContact,
```

- [ ] **Step 3: Commit**

```bash
git add app/api/inngest/route.ts
git commit -m "feat: register enrichTargetContact in Inngest serve route"
```

---

## Task 8: TargetContacts UI table

**Files:**
- Create: `app/[locale]/(routes)/campaigns/targets/[targetId]/components/TargetContactsTable.tsx`
- Modify: `app/[locale]/(routes)/campaigns/targets/[targetId]/components/BasicView.tsx`

- [ ] **Step 1: Create TargetContactsTable component**

Create `app/[locale]/(routes)/campaigns/targets/[targetId]/components/TargetContactsTable.tsx`:

```typescript
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TargetContact {
  id: string;
  name: string | null;
  email: string | null;
  title: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  source: string;
  enrichStatus: string;
}

interface Props {
  targetId: string;
  contacts: TargetContact[];
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  COMPLETED: { label: "Enriched", variant: "default" },
  RUNNING:   { label: "Running", variant: "secondary" },
  PENDING:   { label: "Pending", variant: "outline" },
  FAILED:    { label: "Failed", variant: "destructive" },
  SKIPPED:   { label: "Skipped", variant: "outline" },
};

export function TargetContactsTable({ targetId, contacts: initialContacts }: Props) {
  const [contacts, setContacts] = useState(initialContacts);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/targets/${targetId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: TargetContact = await res.json();
      setContacts((prev) => [...prev, created]);
      setOpen(false);
      setForm({ name: "", email: "" });
      toast.success("Contact added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnrichContact(contactId: string) {
    try {
      const res = await fetch(`/api/crm/targets/${targetId}/contacts/${contactId}/enrich`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      setContacts((prev) =>
        prev.map((c) => c.id === contactId ? { ...c, enrichStatus: "RUNNING" } : c)
      );
      toast.success("Enrichment started — you'll be notified when done");
    } catch {
      toast.error("Failed to start enrichment");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Contacts</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Add Contact</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@acme.com"
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Adding…" : "Add Contact"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts yet. Run enrichment to discover C-level contacts, or add one manually.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const badge = STATUS_BADGE[contact.enrichStatus] ?? STATUS_BADGE.PENDING;
              return (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name ?? "—"}</TableCell>
                  <TableCell>{contact.title ?? "—"}</TableCell>
                  <TableCell>{contact.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {(contact.enrichStatus === "PENDING" || contact.enrichStatus === "FAILED") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEnrichContact(contact.id)}
                      >
                        Enrich
                      </Button>
                    )}
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-sm text-blue-600 hover:underline"
                      >
                        LinkedIn
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add TargetContactsTable to BasicView**

Read `app/[locale]/(routes)/campaigns/targets/[targetId]/components/BasicView.tsx` first, then add the contacts table at the bottom of the component, passing `target.target_contacts` as the `contacts` prop and `target.id` as `targetId`.

The import to add:
```typescript
import { TargetContactsTable } from "./TargetContactsTable";
```

Verify `prismadb.crm_Targets.findUnique` in the page's data fetch includes:
```typescript
target_contacts: {
  select: {
    id: true, name: true, email: true, title: true,
    phone: true, linkedinUrl: true, source: true, enrichStatus: true,
  },
  orderBy: { createdAt: 'asc' },
},
```

If the page fetches target data server-side (in `page.tsx`), add the `target_contacts` include there and pass it as a prop to `BasicView`.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/\(routes\)/campaigns/targets/\[targetId\]/components/
git commit -m "feat: add TargetContactsTable with add contact and enrich actions"
```

---

## Task 9: API routes for contact management

**Files:**
- Create: `app/api/crm/targets/[id]/contacts/route.ts`
- Create: `app/api/crm/targets/[id]/contacts/[contactId]/enrich/route.ts`

- [ ] **Step 1: Create POST /api/crm/targets/[id]/contacts**

Create `app/api/crm/targets/[id]/contacts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id: targetId } = await params;
  const { name, email } = await request.json() as { name?: string; email?: string };

  if (!name && !email) {
    return new NextResponse("name or email required", { status: 400 });
  }

  const contact = await prismadb.crm_Target_Contact.create({
    data: {
      targetId,
      name: name ?? null,
      email: email ?? null,
      source: "manual",
      enrichStatus: "PENDING",
    },
  });

  return NextResponse.json(contact);
}
```

- [ ] **Step 2: Create POST /api/crm/targets/[id]/contacts/[contactId]/enrich**

Create `app/api/crm/targets/[id]/contacts/[contactId]/enrich/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inngest } from "@/inngest/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { contactId } = await params;

  await inngest.send({
    name: "enrich/target.contact.run",
    data: { contactId, triggeredBy: session.user.id },
  });

  return NextResponse.json({ queued: true });
}
```

- [ ] **Step 3: Check LSP diagnostics — zero errors**

- [ ] **Step 4: Commit**

```bash
git add app/api/crm/targets/
git commit -m "feat: add contact create and enrich API routes"
```

---

## Note on toast notifications

The `enrichTargetContact` and `enrichTarget` functions complete silently in the background. To notify the user, the existing `EnrichButton` component in `BasicView.tsx` should poll the `crm_Target_Enrichment` status or the target's `target_contacts` enrichStatus. The simplest approach: after clicking "Enrich", the UI polls `GET /api/crm/targets/[id]` every 5 seconds until all contacts show `COMPLETED`, then fires `toast.success("Enrichment complete")`. This is a UI-layer concern and can be added as a follow-up — the backend is self-contained without it.

---

## Task 10: Final check and smoke test

- [ ] **Step 1: Run full test suite**

```bash
pnpm jest --no-coverage
```

Expected: all existing tests pass, new tests pass.

- [ ] **Step 2: Build check**

```bash
pnpm build
```

Expected: no TypeScript errors, no build failures.

- [ ] **Step 3: Smoke test with Inngest dev**

Start the dev server and Inngest dev server:

```bash
pnpm dev
npx inngest-cli@latest dev
```

Send a test event in the Inngest dashboard:

```json
{
  "name": "enrich/target.run",
  "data": {
    "targetId": "<real-target-id-from-db>",
    "enrichmentId": "<real-enrichment-id>",
    "fields": [],
    "triggeredBy": null
  }
}
```

Expected: Inngest shows the function running, E2B sandbox is created, agent runs, target fields and contacts are written to DB.
