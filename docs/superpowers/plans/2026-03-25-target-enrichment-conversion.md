# Target Enrichment from Company Name + New Fields + Convert to Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow enrichment to start from company name (no email required), add richer contact/company fields to targets, and let a fully-enriched target be converted to a CRM Account + Contact in one click.

**Architecture:** Three loosely-coupled layers — (1) DB schema is the shared foundation; (2) enrichment pipeline removes the email hard-gate and passes a `companyContext` object instead; (3) the convert action maps target fields to Account + Contact via a single Prisma transaction. All changes are additive; no existing fields are modified or removed.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma ORM + PostgreSQL, shadcn/ui (AlertDialog, toast), Vercel AI SDK (not used here), Firecrawl + OpenAI (enrichment agents).

---

## Important Context

- Schema changes **already applied** to `prisma/schema.prisma` (new fields + FK relations added in prior session).
- Migration SQL **not yet run** — must be applied before any other task.
- The `prisma migrate dev` command requires an interactive TTY; use the manual-SQL approach below.
- `.env.dev` contains `DATABASE_URL` for the dev database at `10.100.90.10:5433`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | ✅ Already modified | 11 new columns + FK relations on `crm_Targets` |
| `prisma/migrations/20260325000010_add_target_enrichment_fields/migration.sql` | Create | Safe additive SQL migration |
| `lib/enrichment/agent-architecture/orchestrator.ts` | Modify | Add `buildCompanyNameContext()`, remove email hard-block |
| `lib/enrichment/strategies/agent-enrichment-strategy.ts` | Modify | Pass `identityOverride` through, remove email guard |
| `app/api/crm/targets/enrich/route.ts` | Modify | Fetch company fields, remove 422 email block |
| `app/api/crm/targets/enrich-bulk/route.ts` | Modify | Same pattern as single enrich route |
| `actions/crm/targets/update-target.ts` | Modify | Add 8 new optional fields to type |
| `actions/crm/targets/import-targets.ts` | Modify | Map new fields from CSV rows |
| `actions/crm/targets/suggest-mapping.ts` | Modify | Add new field names + aliases |
| `actions/crm/targets/convert-target.ts` | Create | Transaction: create Account + Contact, stamp target |
| `app/[locale]/(routes)/campaigns/targets/components/BulkEnrichTargetsModal.tsx` | Modify | Add 7 new preset fields |
| `app/[locale]/(routes)/campaigns/targets/components/UpdateTargetForm.tsx` | Modify | New form sections + convert button |
| `app/[locale]/(routes)/campaigns/targets/components/NewTargetForm.tsx` | Modify | New form sections |
| `components/modals/ImportTargetsModal.tsx` | Modify | Add new fields to TARGET_FIELDS list |

---

## Task 1: Run the Database Migration

**Files:**
- Create: `prisma/migrations/20260325000010_add_target_enrichment_fields/migration.sql`

- [ ] **Step 1.1: Create the migration directory and SQL file**

```bash
mkdir -p prisma/migrations/20260325000010_add_target_enrichment_fields
```

Create `prisma/migrations/20260325000010_add_target_enrichment_fields/migration.sql`:

```sql
-- AddColumn: new enrichment fields on crm_Targets (safe, additive, idempotent)
ALTER TABLE "crm_Targets"
  ADD COLUMN IF NOT EXISTS "personal_email"       TEXT,
  ADD COLUMN IF NOT EXISTS "company_email"        TEXT,
  ADD COLUMN IF NOT EXISTS "company_phone"        TEXT,
  ADD COLUMN IF NOT EXISTS "city"                 TEXT,
  ADD COLUMN IF NOT EXISTS "country"              TEXT,
  ADD COLUMN IF NOT EXISTS "industry"             TEXT,
  ADD COLUMN IF NOT EXISTS "employees"            TEXT,
  ADD COLUMN IF NOT EXISTS "description"          TEXT,
  ADD COLUMN IF NOT EXISTS "converted_at"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "converted_account_id" UUID,
  ADD COLUMN IF NOT EXISTS "converted_contact_id" UUID;

CREATE INDEX IF NOT EXISTS "crm_Targets_converted_account_id_idx" ON "crm_Targets"("converted_account_id");
CREATE INDEX IF NOT EXISTS "crm_Targets_converted_contact_id_idx" ON "crm_Targets"("converted_contact_id");
```

- [ ] **Step 1.2: Apply migration using DATABASE_URL from .env.dev**

```bash
export $(grep -v '^#' .env.dev | xargs) && npx prisma migrate deploy
```

Expected: `1 migration applied`

- [ ] **Step 1.3: Regenerate Prisma client**

```bash
export $(grep -v '^#' .env.dev | xargs) && npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 1.4: Verify columns exist**

```bash
export $(grep -v '^#' .env.dev | xargs) && npx prisma db execute --stdin <<'SQL'
SELECT column_name FROM information_schema.columns
WHERE table_name = 'crm_Targets' AND column_name IN
('personal_email','company_email','company_phone','city','country','industry','employees','description','converted_at','converted_account_id','converted_contact_id');
SQL
```

Expected: 11 rows returned.

- [ ] **Step 1.5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add enrichment + conversion fields to crm_Targets schema"
```

---

## Task 2: Enrichment from Company Name — Orchestrator

**Files:**
- Modify: `lib/enrichment/agent-architecture/orchestrator.ts` (lines 19-44, 278-293)

- [ ] **Step 2.1: Extend `enrichRow` signature and remove email guard**

In `orchestrator.ts`, change lines 19-44:

```typescript
async enrichRow(
  row: Record<string, string>,
  fields: EnrichmentField[],
  emailColumn: string,
  onProgress?: (field: string, value: unknown) => void,
  onAgentProgress?: (message: string, type: 'info' | 'success' | 'warning' | 'agent') => void,
  // NEW: allow company-name-only enrichment
  identityOverride?: { companyName?: string; companyWebsite?: string }
): Promise<RowEnrichmentResult> {
  const email = row[emailColumn] || null;
  const companyName = identityOverride?.companyName || null;

  if (!email && !companyName) {
    return {
      rowIndex: 0,
      originalData: row,
      enrichments: {},
      status: 'error',
      error: 'Enrichment requires at least an email or company name',
    };
  }

  console.log(`[Orchestrator] Starting enrichment — email: ${email ?? 'none'}, company: ${companyName ?? 'none'}`);
```

- [ ] **Step 2.2: Add `buildCompanyNameContext` private method**

After the `extractEmailContext` method (around line 278), add:

```typescript
private buildCompanyNameContext(companyName: string, companyWebsite?: string): EmailContext {
  let domain = '';
  if (companyWebsite) {
    try {
      domain = new URL(companyWebsite).hostname.replace(/^www\./, '');
    } catch {
      // ignore malformed URL
    }
  }
  return {
    email: '',
    domain,
    companyDomain: domain || undefined,
    personalName: undefined,
    companyNameGuess: companyName,
    isPersonalEmail: false,
  };
}
```

- [ ] **Step 2.3: Use context based on which input is available**

Replace the `const emailContext = this.extractEmailContext(email);` line (line ~49) with:

```typescript
const emailContext = email
  ? this.extractEmailContext(email)
  : this.buildCompanyNameContext(companyName!, identityOverride?.companyWebsite);

const displayIdentity = emailContext.companyNameGuess || emailContext.domain || email || companyName || 'unknown';
console.log(`[Orchestrator] Email context: domain=${emailContext.domain}, company=${emailContext.companyNameGuess || 'unknown'}`);
```

Also update line 70 to use `displayIdentity`:
```typescript
onAgentProgress(`Planning enrichment strategy for ${displayIdentity}`, 'info');
```

And update line 76:
```typescript
const context: OrchestrationContext = { email: email || '', emailContext, discoveredData: {} };
```

- [ ] **Step 2.4: Commit**

```bash
git add lib/enrichment/agent-architecture/orchestrator.ts
git commit -m "feat: support company-name-only enrichment in AgentOrchestrator"
```

---

## Task 3: Enrichment from Company Name — Strategy Layer

**Files:**
- Modify: `lib/enrichment/strategies/agent-enrichment-strategy.ts` (lines 15-60)

- [ ] **Step 3.1: Extend signature and remove email guard**

Replace lines 15-60 with:

```typescript
async enrichRow(
  row: CSVRow,
  fields: EnrichmentField[],
  emailColumn: string,
  onProgress?: (field: string, value: unknown) => void,
  onAgentProgress?: (message: string, type: 'info' | 'success' | 'warning' | 'agent') => void,
  identityOverride?: { companyName?: string; companyWebsite?: string }
): Promise<RowEnrichmentResult> {
  const email = row[emailColumn] || null;
  console.log(`[AgentEnrichmentStrategy] Starting enrichment — email: ${email ?? 'none'}, company: ${identityOverride?.companyName ?? 'none'}`);
  console.log(`[AgentEnrichmentStrategy] Requested fields: ${fields.map(f => f.name).join(', ')}`);

  // Only run skip-list check when we have an email
  if (email) {
    const skipList = await loadSkipList();
    if (shouldSkipEmail(email, skipList)) {
      const skipReason = getSkipReason(email, skipList);
      console.log(`[AgentEnrichmentStrategy] Skipping email ${email}: ${skipReason}`);
      return {
        rowIndex: 0,
        originalData: row,
        enrichments: {},
        status: 'skipped',
        error: skipReason,
      };
    }
  }

  try {
    console.log(`[AgentEnrichmentStrategy] Delegating to AgentOrchestrator`);
    const result = await this.orchestrator.enrichRow(
      row,
      fields,
      emailColumn,
      onProgress,
      onAgentProgress,
      identityOverride   // pass through
    );

    const filteredEnrichments: Record<string, EnrichmentResult> = {};
    for (const [key, enrichment] of Object.entries(result.enrichments)) {
      if (enrichment.value !== null) {
        filteredEnrichments[key] = enrichment as EnrichmentResult;
      }
    }

    const enrichedCount = Object.keys(filteredEnrichments).length;
    console.log(`[AgentEnrichmentStrategy] Orchestrator returned ${enrichedCount} enriched fields`);

    return { ...result, enrichments: filteredEnrichments };
  } catch (error) {
    console.error('[AgentEnrichmentStrategy] Enrichment error:', error);
    return {
      rowIndex: 0,
      originalData: row,
      enrichments: {},
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

- [ ] **Step 3.2: Commit**

```bash
git add lib/enrichment/strategies/agent-enrichment-strategy.ts
git commit -m "feat: pass identityOverride through strategy layer, skip email guard"
```

---

## Task 4: Enrichment API Route — Remove Email Gate

**Files:**
- Modify: `app/api/crm/targets/enrich/route.ts` (lines 34-85)
- Modify: `app/api/crm/targets/enrich-bulk/route.ts`

- [ ] **Step 4.1: Update single-enrich route**

Replace lines 34-85 in `route.ts`:

```typescript
const target = await prismadb.crm_Targets.findUnique({
  where: { id: targetId },
  select: { id: true, email: true, company: true, company_website: true },
});

if (!target) {
  return NextResponse.json({ error: "Target not found" }, { status: 404 });
}
if (!target.email && !target.company) {
  return NextResponse.json(
    { error: "Target needs at least an email or company name to enrich." },
    { status: 422 }
  );
}
```

Then update the `strategy.enrichRow` call (line 77):

```typescript
const result = await strategy.enrichRow(
  { email: target.email ?? '' },
  fields,
  "email",
  undefined,
  (message: string, type: string, sourceUrl?: string) => {
    enqueue({ type: "agent_progress", message, messageType: type, sourceUrl });
  },
  {
    companyName: target.company ?? undefined,
    companyWebsite: target.company_website ?? undefined,
  }
);
```

- [ ] **Step 4.2: Apply same pattern to bulk-enrich route**

In `app/api/crm/targets/enrich-bulk/route.ts`, find where targets are fetched and update the `select` to include `company` and `company_website`. Find any email guard and replace with `!email && !company` check. Pass `identityOverride` to strategy calls.

- [ ] **Step 4.3: Commit**

```bash
git add app/api/crm/targets/enrich/route.ts app/api/crm/targets/enrich-bulk/route.ts
git commit -m "feat: unlock enrichment for targets without email (company name fallback)"
```

---

## Task 5: Actions + Import + Mapping — New Fields

**Files:**
- Modify: `actions/crm/targets/update-target.ts`
- Modify: `actions/crm/targets/import-targets.ts`
- Modify: `actions/crm/targets/suggest-mapping.ts`

- [ ] **Step 5.1: Update `update-target.ts` type signature**

Add 8 new optional fields to the `data` parameter type (after `social_facebook?`):

```typescript
personal_email?: string;
company_email?: string;
company_phone?: string;
city?: string;
country?: string;
industry?: string;
employees?: string;
description?: string;
// Note: converted_* fields are NOT included — set only by convert-target action
```

- [ ] **Step 5.2: Update `import-targets.ts` — extend `valid.push`**

In the `valid.push({...})` block, add after `social_facebook`:

```typescript
personal_email: row.personal_email || null,
company_email: row.company_email || null,
company_phone: row.company_phone || null,
city: row.city || null,
country: row.country || null,
industry: row.industry || null,
employees: row.employees || null,
description: row.description || null,
```

- [ ] **Step 5.3: Update `suggest-mapping.ts`**

Extend `TARGET_FIELDS` array:

```typescript
const TARGET_FIELDS = [
  "last_name", "first_name", "email", "mobile_phone", "office_phone",
  "company", "position", "company_website", "personal_website",
  "social_linkedin", "social_x", "social_instagram", "social_facebook",
  // NEW
  "personal_email", "company_email", "company_phone",
  "city", "country", "industry", "employees", "description",
];
```

Extend `aliases`:

```typescript
// personal_email
personalemail: "personal_email",
directemail: "personal_email",
myemail: "personal_email",
// company_email
companyemail: "company_email",
infoemail: "company_email",
contactemail: "company_email",
genericemail: "company_email",
// company_phone
companyphone: "company_phone",
mainphone: "company_phone",
switchboard: "company_phone",
hqphone: "company_phone",
// city
location: "city",
hqcity: "city",
headquarterscity: "city",
// country
hqcountry: "country",
nation: "country",
// industry
sector: "industry",
vertical: "industry",
businesstype: "industry",
// employees
headcount: "employees",
numemployees: "employees",
teamsize: "employees",
companysize: "employees",
// description
about: "description",
bio: "description",
summary: "description",
companydescription: "description",
```

- [ ] **Step 5.4: Update `ImportTargetsModal.tsx` — add new fields to TARGET_FIELDS**

In `components/modals/ImportTargetsModal.tsx`, extend the `TARGET_FIELDS` array to include:

```typescript
{ key: "personal_email", label: "Personal Email", required: false },
{ key: "company_email",  label: "Company Email",  required: false },
{ key: "company_phone",  label: "Company Phone",  required: false },
{ key: "city",           label: "City",           required: false },
{ key: "country",        label: "Country",        required: false },
{ key: "industry",       label: "Industry",       required: false },
{ key: "employees",      label: "Employees",      required: false },
{ key: "description",    label: "Description",    required: false },
```

- [ ] **Step 5.5: Commit**

```bash
git add actions/crm/targets/ components/modals/ImportTargetsModal.tsx
git commit -m "feat: add 8 new fields to target actions, import, and column mapping"
```

---

## Task 6: UI — New Form Fields + Enrichment Presets

**Files:**
- Modify: `app/[locale]/(routes)/campaigns/targets/components/UpdateTargetForm.tsx`
- Modify: `app/[locale]/(routes)/campaigns/targets/components/NewTargetForm.tsx`
- Modify: `app/[locale]/(routes)/campaigns/targets/components/BulkEnrichTargetsModal.tsx`

- [ ] **Step 6.1: Extend Zod schema in both forms**

In `UpdateTargetForm.tsx` and `NewTargetForm.tsx`, add to the `z.object({})`:

```typescript
personal_email: z.string().optional(),
company_email:  z.string().optional(),
company_phone:  z.string().optional(),
city:           z.string().optional(),
country:        z.string().optional(),
industry:       z.string().optional(),
employees:      z.string().optional(),
description:    z.string().optional(),
```

- [ ] **Step 6.2: Add new form field groups to `UpdateTargetForm`**

After the existing phone fields, add:

```tsx
{/* Contact Emails */}
<div className="grid grid-cols-2 gap-4">
  <FormField control={form.control} name="personal_email" render={({ field }) => (
    <FormItem><FormLabel>Personal Email</FormLabel>
      <FormControl><Input placeholder="john@personal.com" {...field} value={field.value ?? ''} /></FormControl>
    </FormItem>
  )} />
  <FormField control={form.control} name="company_email" render={({ field }) => (
    <FormItem><FormLabel>Company Email</FormLabel>
      <FormControl><Input placeholder="info@company.com" {...field} value={field.value ?? ''} /></FormControl>
    </FormItem>
  )} />
</div>

{/* Company Phone */}
<FormField control={form.control} name="company_phone" render={({ field }) => (
  <FormItem><FormLabel>Company Phone</FormLabel>
    <FormControl><Input placeholder="+1 800 000 0000" {...field} value={field.value ?? ''} /></FormControl>
  </FormItem>
)} />

{/* Location */}
<div className="grid grid-cols-2 gap-4">
  <FormField control={form.control} name="city" render={({ field }) => (
    <FormItem><FormLabel>City</FormLabel>
      <FormControl><Input placeholder="Prague" {...field} value={field.value ?? ''} /></FormControl>
    </FormItem>
  )} />
  <FormField control={form.control} name="country" render={({ field }) => (
    <FormItem><FormLabel>Country</FormLabel>
      <FormControl><Input placeholder="Czech Republic" {...field} value={field.value ?? ''} /></FormControl>
    </FormItem>
  )} />
</div>

{/* Company Info */}
<div className="grid grid-cols-2 gap-4">
  <FormField control={form.control} name="industry" render={({ field }) => (
    <FormItem><FormLabel>Industry</FormLabel>
      <FormControl><Input placeholder="SaaS" {...field} value={field.value ?? ''} /></FormControl>
    </FormItem>
  )} />
  <FormField control={form.control} name="employees" render={({ field }) => (
    <FormItem><FormLabel>Employees</FormLabel>
      <FormControl><Input placeholder="50-200" {...field} value={field.value ?? ''} /></FormControl>
    </FormItem>
  )} />
</div>
<FormField control={form.control} name="description" render={({ field }) => (
  <FormItem><FormLabel>Description</FormLabel>
    <FormControl><Input placeholder="Short company description" {...field} value={field.value ?? ''} /></FormControl>
  </FormItem>
)} />
```

Also add converted status banner (read-only) before the Submit button in `UpdateTargetForm`:

```tsx
{initialData?.converted_at && (
  <div className="rounded-md border p-3 bg-muted text-sm text-muted-foreground">
    Converted to Account + Contact on {new Date(initialData.converted_at).toLocaleDateString()}
  </div>
)}
```

Apply same new field groups to `NewTargetForm.tsx` (without the converted banner).

- [ ] **Step 6.3: Add new enrichment presets to `BulkEnrichTargetsModal`**

In `BulkEnrichTargetsModal.tsx`, add to `TARGET_PRESET_FIELDS`:

```typescript
{ name: "company_email", displayName: "Company Email",  description: "Generic company contact email (info@...)" },
{ name: "company_phone", displayName: "Company Phone",  description: "Main company switchboard number" },
{ name: "city",          displayName: "City",           description: "Company HQ city" },
{ name: "country",       displayName: "Country",        description: "Company HQ country" },
{ name: "industry",      displayName: "Industry",       description: "Company industry / sector" },
{ name: "employees",     displayName: "Employees",      description: "Number of employees" },
{ name: "description",   displayName: "Description",    description: "Short company description" },
```

- [ ] **Step 6.4: Commit**

```bash
git add "app/[locale]/(routes)/campaigns/targets/components/"
git commit -m "feat: add new target fields to forms and enrichment preset selector"
```

---

## Task 7: Convert Target → Account + Contact

**Files:**
- Create: `actions/crm/targets/convert-target.ts`
- Modify: `app/[locale]/(routes)/campaigns/targets/components/UpdateTargetForm.tsx`

- [ ] **Step 7.1: Create the convert server action**

Create `actions/crm/targets/convert-target.ts`:

```typescript
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function convertTarget(
  targetId: string
): Promise<{ accountId: string; contactId: string } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const target = await prismadb.crm_Targets.findUnique({ where: { id: targetId } });
  if (!target) return { error: "Target not found" };

  // Guard: need at least a name for the Account and Contact
  if (!target.company && !target.last_name) {
    return { error: "Target needs a company name or last name to convert" };
  }

  // Idempotency: already converted
  if (target.converted_at && target.converted_account_id && target.converted_contact_id) {
    return {
      accountId: target.converted_account_id,
      contactId: target.converted_contact_id,
    };
  }

  try {
    const [account, contact] = await prismadb.$transaction(async (tx) => {
      const acct = await tx.crm_Accounts.create({
        data: {
          v: 0,
          name: target.company || target.last_name,
          email: target.company_email ?? undefined,
          office_phone: target.company_phone ?? undefined,
          website: target.company_website ?? undefined,
          billing_city: target.city ?? undefined,
          billing_country: target.country ?? undefined,
          employees: target.employees ?? undefined,
          description: target.description ?? undefined,
          status: "Active",
          createdBy: (session.user as any).id,
        },
      });

      const ctct = await tx.crm_Contacts.create({
        data: {
          v: 0,
          first_name: target.first_name ?? undefined,
          last_name: target.last_name,
          email: target.email ?? undefined,
          personal_email: target.personal_email ?? undefined,
          mobile_phone: target.mobile_phone ?? undefined,
          office_phone: target.office_phone ?? undefined,
          position: target.position ?? undefined,
          social_linkedin: target.social_linkedin ?? undefined,
          social_twitter: target.social_x ?? undefined,
          social_instagram: target.social_instagram ?? undefined,
          social_facebook: target.social_facebook ?? undefined,
          accountsIDs: acct.id,
          created_by: (session.user as any).id,
        },
      });

      await tx.crm_Targets.update({
        where: { id: targetId },
        data: {
          converted_at: new Date(),
          converted_account_id: acct.id,
          converted_contact_id: ctct.id,
          updatedBy: (session.user as any).id,
        },
      });

      return [acct, ctct];
    });

    revalidatePath("/[locale]/(routes)/campaigns/targets", "page");
    revalidatePath("/[locale]/(routes)/crm/accounts", "page");

    return { accountId: account.id, contactId: contact.id };
  } catch (error) {
    console.error("[convertTarget] Error:", error);
    return { error: "Failed to convert target" };
  }
}
```

- [ ] **Step 7.2: Add `ConvertTargetButton` inline to `UpdateTargetForm`**

Add import at top:
```typescript
import { convertTarget } from "@/actions/crm/targets/convert-target";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
```

Add handler inside the component:
```typescript
const router = useRouter();
const [converting, setConverting] = useState(false);

const handleConvert = async () => {
  setConverting(true);
  const result = await convertTarget(initialData.id);
  setConverting(false);
  if ("error" in result) {
    toast.error(result.error);
  } else {
    toast.success("Converted! Account and Contact created.");
    router.refresh();
  }
};
```

Add button before the submit button:
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      type="button"
      variant="outline"
      disabled={!!initialData?.converted_at || converting}
    >
      {initialData?.converted_at ? "Already Converted" : "Convert to Account"}
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Convert to Account + Contact?</AlertDialogTitle>
      <AlertDialogDescription>
        This creates a new Account from &quot;{initialData?.company || initialData?.last_name}&quot;
        and a new Contact for &quot;{initialData?.first_name} {initialData?.last_name}&quot;.
        The target will be marked as converted.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConvert} disabled={converting}>
        {converting ? "Converting..." : "Convert"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 7.3: Commit**

```bash
git add actions/crm/targets/convert-target.ts "app/[locale]/(routes)/campaigns/targets/components/UpdateTargetForm.tsx"
git commit -m "feat: add convert-target action and Convert to Account button"
```

---

## Task 8: Push + Create PR

- [ ] **Step 8.1: Push branch**

```bash
git push
```

- [ ] **Step 8.2: Create PR targeting `dev`**

```bash
gh pr create --base dev \
  --title "feat: enrichment from company name + new target fields + convert to account" \
  --body "$(cat <<'EOF'
## Summary
- Enrichment now works from company name alone — no email required
- 11 new fields on crm_Targets: personal_email, company_email, company_phone, city, country, industry, employees, description + conversion tracking fields
- One-click "Convert to Account" creates a linked Account + Contact from any enriched target

## Test plan
- [ ] Import firmycz CSV (company-only, no email) → trigger enrich → confirm runs
- [ ] Verify enriched fields (city, country, company_email) appear on target
- [ ] Click "Convert to Account" → confirm Account + Contact created in CRM
- [ ] Click again → confirm idempotent (same IDs returned, no duplicates)
EOF
)"
```

---

## Verification

1. **Enrichment without email:** Import `public/tmp/firmycz_callcentra_scraped.csv` → go to any target → click Enrich → confirm SSE stream starts (no 422 error)
2. **New fields populated:** After enrichment, confirm `city`, `country`, `company_email` appear on target detail
3. **Column mapping:** On next CSV import, confirm `City`, `Country`, `Description` auto-map correctly
4. **Convert:** Click "Convert to Account" on an enriched target → navigate to CRM Accounts → confirm new account exists with company data → confirm new Contact linked to account
5. **Idempotency:** Click "Convert" again → button shows "Already Converted", no new records created
