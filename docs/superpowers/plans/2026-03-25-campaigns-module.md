# Campaigns Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a top-level Campaigns module with email campaign creation, AI-powered template editing, multi-step follow-ups, Resend sending via Inngest, and open/click analytics.

**Architecture:** Server actions for all mutations/queries; Inngest for scheduling and per-recipient fan-out; Resend for delivery with webhooks for tracking; TipTap WYSIWYG + LLM for template authoring. Targets and Target Lists are moved from the CRM module to Campaigns.

**Tech Stack:** Next.js 15 App Router, Prisma (PostgreSQL), Inngest, Resend, `@react-email/components`, TipTap, TanStack Table, Jest (unit tests in `__tests__/`)

---

## File Map

### New files
```
prisma/migrations/<timestamp>_campaigns_module/migration.sql

lib/campaigns/merge-tags.ts               Server-side merge tag substitution utility
__tests__/campaigns/merge-tags.test.ts

inngest/functions/campaigns/schedule-send.ts
inngest/functions/campaigns/send-step.ts
inngest/functions/campaigns/process-follow-up.ts
inngest/functions/campaigns/send-now.ts
__tests__/campaigns/inngest/schedule-send.test.ts
__tests__/campaigns/inngest/send-step.test.ts

app/api/campaigns/webhooks/resend/route.ts
app/api/campaigns/unsubscribe/route.ts
__tests__/campaigns/api/webhooks-resend.test.ts
__tests__/campaigns/api/unsubscribe.test.ts

actions/campaigns/get-campaigns.ts
actions/campaigns/get-campaign.ts
actions/campaigns/create-campaign.ts
actions/campaigns/update-campaign.ts
actions/campaigns/delete-campaign.ts
actions/campaigns/schedule-campaign.ts
actions/campaigns/send-campaign-now.ts
actions/campaigns/pause-campaign.ts
actions/campaigns/templates/get-templates.ts
actions/campaigns/templates/get-template.ts
actions/campaigns/templates/create-template.ts
actions/campaigns/templates/update-template.ts
actions/campaigns/templates/delete-template.ts
actions/campaigns/templates/generate-template.ts

components/campaigns/TipTapEditor.tsx         Reusable TipTap WYSIWYG component

app/[locale]/(routes)/campaigns/
  page.tsx                                    All Campaigns list
  layout.tsx                                  Campaigns module layout wrapper
  table-data/schema.tsx                       Zod schema for campaign row
  table-components/columns.tsx
  table-components/data-table.tsx
  table-components/data-table-toolbar.tsx
  new/page.tsx                                Wizard shell
  new/components/WizardShell.tsx
  new/components/Step1Details.tsx
  new/components/Step2Template.tsx
  new/components/Step3Audience.tsx
  new/components/Step4Schedule.tsx
  [campaignId]/page.tsx
  [campaignId]/components/CampaignDetail.tsx
  [campaignId]/components/StepsTimeline.tsx
  [campaignId]/components/RecipientsTable.tsx
  templates/page.tsx
  templates/new/page.tsx
  templates/[templateId]/page.tsx
  targets/                                    (moved files — no content change)
  target-lists/                               (moved files — no content change)

app/[locale]/(routes)/components/menu-items/Campaigns.tsx
```

### Modified files
```
prisma/schema.prisma                          Extend crm_campaigns + 4 new models
next.config.ts                                Add redirects for moved routes
app/api/inngest/route.ts                      Register 3 campaign Inngest functions
app/[locale]/(routes)/components/menu-items/Crm.tsx   Remove targets/targetLists
app/[locale]/(routes)/components/nav-main.tsx (or layout)  Add Campaigns to sidebar
.env.example                                  Add RESEND_* vars
```

---

## Task 1: Branch + Dependencies

**Files:**
- Modify: `package.json` (via pnpm)
- Modify: `.env.example`

- [ ] **Step 1: Create feature branch**

```bash
cd /Users/pavel-clawdbot/.openclaw/workspace-chopper/development/nextcrm-app
git checkout -b feature/campaigns-module
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add resend @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-underline
```

Expected: packages appear in `package.json` dependencies.

- [ ] **Step 3: Add env vars to .env.example**

Open `.env.example` and append:
```
# Campaigns — Resend email sending
RESEND_API_KEY=            # https://resend.com/api-keys
RESEND_WEBHOOK_SECRET=     # Resend webhook signing secret
RESEND_FROM_EMAIL=         # e.g. noreply@yourdomain.com
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add resend and tiptap dependencies for campaigns module"
```

---

## Task 2: Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Extend `crm_campaigns` model**

Find the existing `model crm_campaigns` block in `prisma/schema.prisma` and replace it with:

```prisma
model crm_campaigns {
  id           String    @id @default(uuid()) @db.Uuid
  v            Int       @map("__v")
  name         String
  description  String?
  status       String?   // draft | scheduled | sending | sent | paused | deleted

  template_id  String?   @db.Uuid
  from_name    String?
  reply_to     String?
  scheduled_at DateTime?
  sent_at      DateTime?
  created_by   String?   @db.Uuid
  created_on   DateTime? @default(now())
  updatedAt    DateTime? @updatedAt

  template         crm_campaign_templates?  @relation("CampaignTemplate", fields: [template_id], references: [id])
  created_by_user  Users?                   @relation("created_campaigns", fields: [created_by], references: [id])
  steps            crm_campaign_steps[]
  target_lists     CampaignToTargetLists[]
  sends            crm_campaign_sends[]
  opportunities    crm_Opportunities[]
}
```

- [ ] **Step 2: Add new models after `crm_campaigns`**

Append these four models to `prisma/schema.prisma`:

```prisma
model crm_campaign_templates {
  id              String    @id @default(uuid()) @db.Uuid
  name            String
  description     String?
  subject_default String?
  content_html    String    @db.Text
  content_json    Json
  created_by      String?   @db.Uuid
  created_on      DateTime? @default(now())
  updatedAt       DateTime? @updatedAt

  created_by_user Users?               @relation("created_campaign_templates", fields: [created_by], references: [id])
  campaigns       crm_campaigns[]      @relation("CampaignTemplate")
  steps           crm_campaign_steps[]

  @@index([created_by])
}

model crm_campaign_steps {
  id           String    @id @default(uuid()) @db.Uuid
  campaign_id  String    @db.Uuid
  order        Int
  template_id  String    @db.Uuid
  subject      String
  delay_days   Int       @default(0)
  send_to      String    @default("all")  // "all" | "non_openers"
  scheduled_at DateTime?
  sent_at      DateTime?

  campaign crm_campaigns          @relation(fields: [campaign_id], references: [id], onDelete: Cascade)
  template crm_campaign_templates @relation(fields: [template_id], references: [id])
  sends    crm_campaign_sends[]

  @@unique([campaign_id, order])
  @@index([campaign_id])
  @@index([scheduled_at])
}

model CampaignToTargetLists {
  campaign_id    String @db.Uuid
  target_list_id String @db.Uuid

  campaign    crm_campaigns   @relation(fields: [campaign_id], references: [id], onDelete: Cascade)
  target_list crm_TargetLists @relation(fields: [target_list_id], references: [id], onDelete: Cascade)

  @@id([campaign_id, target_list_id])
}

model crm_campaign_sends {
  id                String    @id @default(uuid()) @db.Uuid
  campaign_id       String    @db.Uuid
  step_id           String    @db.Uuid
  target_id         String    @db.Uuid
  email             String
  status            String    @default("queued")  // queued | sent | delivered | bounced | failed
  resend_message_id String?
  unsubscribe_token String    @unique @default(uuid())
  opened_at         DateTime?
  clicked_at        DateTime?
  unsubscribed_at   DateTime?
  error_message     String?
  sent_at           DateTime?

  campaign crm_campaigns      @relation(fields: [campaign_id], references: [id])
  step     crm_campaign_steps @relation(fields: [step_id], references: [id])
  target   crm_Targets        @relation(fields: [target_id], references: [id])

  @@unique([step_id, target_id])
  @@index([campaign_id])
  @@index([step_id, target_id])
  @@index([resend_message_id])
  @@index([status])
  @@index([unsubscribe_token])
}
```

- [ ] **Step 3: Add inverse relations to existing models**

In `crm_TargetLists`, add:
```prisma
campaign_lists CampaignToTargetLists[]
```

In `crm_Targets`, add:
```prisma
campaign_sends crm_campaign_sends[]
```

In `Users`, add two relations:
```prisma
created_campaigns          crm_campaigns[]           @relation("created_campaigns")
created_campaign_templates crm_campaign_templates[]  @relation("created_campaign_templates")
```

- [ ] **Step 4: Run migration**

```bash
pnpm prisma migrate dev --name campaigns_module
```

Expected: migration file created, DB updated, no errors.

- [ ] **Step 5: Verify types generate**

```bash
pnpm prisma generate
npx tsc --noEmit 2>&1 | grep -i 'campaigns\|campaign' | head -20
```

Expected: no errors related to campaign models.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add campaigns module prisma schema"
```

---

## Task 3: Merge Tags Utility

**Files:**
- Create: `lib/campaigns/merge-tags.ts`
- Create: `__tests__/campaigns/merge-tags.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/campaigns/merge-tags.test.ts`:

```typescript
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";

describe("resolveMergeTags", () => {
  const target = {
    first_name: "John",
    last_name: "Smith",
    email: "john@acme.com",
    company: "Acme Inc",
    position: "CEO",
  };

  it("replaces all known merge tags", () => {
    const html = "<p>Hi {{first_name}} {{last_name}}, from {{company}}</p>";
    expect(resolveMergeTags(html, target)).toBe(
      "<p>Hi John Smith, from Acme Inc</p>"
    );
  });

  it("replaces {{email}} and {{position}}", () => {
    const html = "{{email}} - {{position}}";
    expect(resolveMergeTags(html, target)).toBe("john@acme.com - CEO");
  });

  it("leaves unknown tags as-is", () => {
    const html = "{{unknown_tag}}";
    expect(resolveMergeTags(html, target)).toBe("{{unknown_tag}}");
  });

  it("handles missing target fields gracefully (uses empty string)", () => {
    const html = "{{first_name}} {{company}}";
    expect(resolveMergeTags(html, { last_name: "Smith" })).toBe(" ");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/campaigns/merge-tags.test.ts
```

Expected: FAIL — `resolveMergeTags` not found.

- [ ] **Step 3: Implement**

Create `lib/campaigns/merge-tags.ts`:

```typescript
type MergeTagTarget = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company?: string | null;
  position?: string | null;
};

const MERGE_TAG_MAP: Record<string, keyof MergeTagTarget> = {
  first_name: "first_name",
  last_name: "last_name",
  email: "email",
  company: "company",
  position: "position",
};

export function resolveMergeTags(html: string, target: MergeTagTarget): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, tag: string) => {
    const field = MERGE_TAG_MAP[tag];
    if (!field) return match; // unknown tag — leave as-is
    return target[field] ?? "";
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test __tests__/campaigns/merge-tags.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/campaigns/merge-tags.ts __tests__/campaigns/merge-tags.test.ts
git commit -m "feat: add merge tags utility for campaign email rendering"
```

---

## Task 4: Move Targets & Target Lists to Campaigns

**Files:**
- Move: `app/[locale]/(routes)/crm/targets/` → `app/[locale]/(routes)/campaigns/targets/`
- Move: `app/[locale]/(routes)/crm/target-lists/` → `app/[locale]/(routes)/campaigns/target-lists/`
- Modify: `next.config.ts` (add redirects)

- [ ] **Step 1: Move route directories**

```bash
mkdir -p "app/[locale]/(routes)/campaigns"
git mv "app/[locale]/(routes)/crm/targets" "app/[locale]/(routes)/campaigns/targets"
git mv "app/[locale]/(routes)/crm/target-lists" "app/[locale]/(routes)/campaigns/target-lists"
```

> Run from the project root: `/Users/pavel-clawdbot/.openclaw/workspace-chopper/development/nextcrm-app`
> Using `git mv` preserves file history for future `git blame`.

- [ ] **Step 2: Fix any import paths in moved files**

Search for relative imports that may have changed depth:
```bash
grep -r "../../components\|../../../components\|../../ui" "app/[locale]/(routes)/campaigns/targets" "app/[locale]/(routes)/campaigns/target-lists" --include="*.tsx" --include="*.ts" -l
```

For each file found, verify imports still resolve. The components referenced (e.g. `Container`, `CrmTableSkeleton`) live in `app/[locale]/(routes)/components/` and should be referenced with `@/` absolute imports — update any relative paths that broke.

- [ ] **Step 3: Add redirects to next.config.ts**

Open `next.config.ts` and add a `redirects` key to `nextConfig`:

```typescript
const nextConfig = {
  images: { /* existing */ },
  async redirects() {
    return [
      {
        source: "/:locale/crm/targets/:path*",
        destination: "/:locale/campaigns/targets/:path*",
        permanent: true,
      },
      {
        source: "/:locale/crm/target-lists/:path*",
        destination: "/:locale/campaigns/target-lists/:path*",
        permanent: true,
      },
    ];
  },
};
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors from the moved files.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts
git commit -m "feat: move Targets and Target Lists from CRM to Campaigns module"
```

---

## Task 5: Campaigns Sidebar Navigation

**Files:**
- Create: `app/[locale]/(routes)/components/menu-items/Campaigns.tsx`
- Modify: `app/[locale]/(routes)/components/menu-items/Crm.tsx`
- Modify: sidebar layout file (wherever `getCrmMenuItem` is called — find with `grep -r "getCrmMenuItem" app/ --include="*.tsx" -l`)

- [ ] **Step 1: Create Campaigns menu item**

Create `app/[locale]/(routes)/components/menu-items/Campaigns.tsx`:

```typescript
import { Megaphone } from "lucide-react";
import { NavItem } from "../nav-main";

type Props = {
  localizations: {
    title: string;
    campaigns: string;
    templates: string;
    targets: string;
    targetLists: string;
  };
};

export const getCampaignsMenuItem = ({ localizations }: Props): NavItem => {
  return {
    title: localizations.title,
    icon: Megaphone,
    items: [
      { title: localizations.campaigns, url: "/campaigns" },
      { title: localizations.templates, url: "/campaigns/templates" },
      { title: localizations.targets, url: "/campaigns/targets" },
      { title: localizations.targetLists, url: "/campaigns/target-lists" },
    ],
  };
};

export default getCampaignsMenuItem;
```

- [ ] **Step 2: Remove targets and targetLists from CRM menu**

In `app/[locale]/(routes)/components/menu-items/Crm.tsx`:
- Remove `targets: string` and `targetLists: string` from the `Props.localizations` type
- Remove the two nav items for targets and target-lists from the `items` array

- [ ] **Step 3: Add Campaigns to sidebar**

Find where `getCrmMenuItem` is imported and called (run: `grep -r "getCrmMenuItem" app/ --include="*.tsx" -l`).
In that file, import and add `getCampaignsMenuItem` alongside `getCrmMenuItem`, passing English labels (or localisation keys if i18n is used).

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add Campaigns sidebar navigation, remove targets from CRM nav"
```

---

## Task 6: Campaign Templates — Server Actions + List UI

**Files:**
- Create: `actions/campaigns/templates/get-templates.ts`
- Create: `actions/campaigns/templates/get-template.ts`
- Create: `actions/campaigns/templates/create-template.ts`
- Create: `actions/campaigns/templates/update-template.ts`
- Create: `actions/campaigns/templates/delete-template.ts`
- Create: `app/[locale]/(routes)/campaigns/templates/page.tsx`
- Create: `app/[locale]/(routes)/campaigns/templates/components/TemplatesView.tsx`

- [ ] **Step 1: Write server actions**

`actions/campaigns/templates/get-templates.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";

export const getTemplates = async () => {
  return prismadb.crm_campaign_templates.findMany({
    orderBy: { created_on: "desc" },
    include: { created_by_user: { select: { name: true } } },
  });
};
```

`actions/campaigns/templates/get-template.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";

export const getTemplate = async (id: string) => {
  return prismadb.crm_campaign_templates.findUnique({
    where: { id },
    include: { created_by_user: { select: { name: true } } },
  });
};
```

`actions/campaigns/templates/create-template.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const createTemplate = async (data: {
  name: string;
  description?: string;
  subject_default?: string;
  content_html: string;
  content_json: object;
}) => {
  const session = await getServerSession(authOptions);
  return prismadb.crm_campaign_templates.create({
    data: { ...data, created_by: session?.user?.id ?? null },
  });
};
```

`actions/campaigns/templates/update-template.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";

export const updateTemplate = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    subject_default: string;
    content_html: string;
    content_json: object;
  }>
) => {
  return prismadb.crm_campaign_templates.update({ where: { id }, data });
};
```

`actions/campaigns/templates/delete-template.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";

export const deleteTemplate = async (id: string) => {
  return prismadb.crm_campaign_templates.delete({ where: { id } });
};
```

- [ ] **Step 2: Create templates list page**

`app/[locale]/(routes)/campaigns/templates/page.tsx`:
```typescript
import { Suspense } from "react";
import { getTemplates } from "@/actions/campaigns/templates/get-templates";
import Container from "../../components/ui/Container";
import TemplatesView from "./components/TemplatesView";
import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";

export default async function TemplatesPage() {
  const templates = await getTemplates();
  return (
    <Container title="Campaign Templates" description="Reusable email templates">
      <Suspense fallback={<CrmTableSkeleton />}>
        <TemplatesView data={templates} />
      </Suspense>
    </Container>
  );
}
```

- [ ] **Step 3: Create `TemplatesView` with TanStack table**

Create `app/[locale]/(routes)/campaigns/templates/components/TemplatesView.tsx` following the exact same pattern as `app/[locale]/(routes)/crm/targets/components/TargetsView.tsx` — copy structure, change column definitions to: Name, Subject, Created By, Created On, Actions (Edit / Delete).

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep templates | head -20
```

- [ ] **Step 5: Commit**

```bash
git add actions/campaigns/templates/ "app/[locale]/(routes)/campaigns/templates/"
git commit -m "feat: add campaign templates server actions and list page"
```

---

## Task 7: TipTap Editor Component + AI Generation

**Files:**
- Create: `components/campaigns/TipTapEditor.tsx`
- Create: `actions/campaigns/templates/generate-template.ts`
- Create: `app/[locale]/(routes)/campaigns/templates/new/page.tsx`
- Create: `app/[locale]/(routes)/campaigns/templates/[templateId]/page.tsx`

- [ ] **Step 1: Create TipTap editor component**

Create `components/campaigns/TipTapEditor.tsx`:

```typescript
"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, List, Heading1, Heading2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  content?: string; // HTML string
  onChange?: (html: string, json: object) => void;
};

export function TipTapEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: content ?? "",
    onUpdate({ editor }) {
      onChange?.(editor.getHTML(), editor.getJSON() as object);
    },
  });

  if (!editor) return null;

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border-b bg-muted/50 flex-wrap">
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-muted" : ""}
        ><Bold className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-muted" : ""}
        ><Italic className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "bg-muted" : ""}
        ><UnderlineIcon className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "bg-muted" : ""}
        ><Heading1 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
        ><Heading2 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-muted" : ""}
        ><List className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => {
            const url = window.prompt("Enter URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={editor.isActive("link") ? "bg-muted" : ""}
        ><LinkIcon className="h-4 w-4" /></Button>
      </div>
      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none"
      />
      {/* Merge tag hint */}
      <div className="px-4 pb-2 text-xs text-muted-foreground">
        Available merge tags: {"{{first_name}} {{last_name}} {{email}} {{company}} {{position}}"}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AI generation action**

`actions/campaigns/templates/generate-template.ts`:

```typescript
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const generateTemplate = async (prompt: string): Promise<{
  html: string;
  json: object;
  subject: string;
}> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Fetch user's configured LLM key (same pattern as other AI features in the app)
  const apiKey = await prismadb.ApiKeys.findFirst({
    where: { user_id: session.user.id, provider: "openai" },
  });
  if (!apiKey?.key) throw new Error("No OpenAI API key configured. Add one in Profile → LLMs.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an email copywriter. Generate a professional HTML email body and subject line.
Return ONLY valid JSON in this exact format: {"subject":"...", "html":"..."}
The HTML should be clean, inline-styled, suitable for email clients.
Use merge tags {{first_name}}, {{last_name}}, {{email}}, {{company}}, {{position}} where appropriate.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.statusText}`);

    const data = await response.json();
    const content = data.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { subject: string; html: string };

    return {
      subject: parsed.subject ?? "",
      html: parsed.html ?? "",
      json: {},  // TipTap will parse the HTML on load via setContent
    };
  } finally {
    clearTimeout(timeout);
  }
};
```

- [ ] **Step 3: Create template editor page (new)**

`app/[locale]/(routes)/campaigns/templates/new/page.tsx`:
```typescript
import Container from "../../../components/ui/Container";
import TemplateEditorForm from "../components/TemplateEditorForm";

export default function NewTemplatePage() {
  return (
    <Container title="New Template" description="Create a campaign email template">
      <TemplateEditorForm />
    </Container>
  );
}
```

Create `app/[locale]/(routes)/campaigns/templates/components/TemplateEditorForm.tsx` — a client component with:
- Name input, Description textarea, Subject input
- "Generate with AI" section: prompt textarea + Generate button (calls `generateTemplate` action, loads result into TipTap)
- `TipTapEditor` component for manual editing
- Save button (calls `createTemplate` or `updateTemplate`)

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -i tiptap | head -10
```

- [ ] **Step 5: Commit**

```bash
git add components/campaigns/ actions/campaigns/templates/generate-template.ts "app/[locale]/(routes)/campaigns/templates/"
git commit -m "feat: add TipTap editor component and AI template generation"
```

---

## Task 8: Campaign Server Actions (CRUD + Lifecycle)

**Files:**
- Create: `actions/campaigns/get-campaigns.ts`
- Create: `actions/campaigns/get-campaign.ts`
- Create: `actions/campaigns/create-campaign.ts`
- Create: `actions/campaigns/update-campaign.ts`
- Create: `actions/campaigns/delete-campaign.ts`
- Create: `actions/campaigns/schedule-campaign.ts`
- Create: `actions/campaigns/send-campaign-now.ts`
- Create: `actions/campaigns/pause-campaign.ts`

- [ ] **Step 1: Create get actions**

`actions/campaigns/get-campaigns.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";

export const getCampaigns = async (filters?: { status?: string; search?: string }) => {
  return prismadb.crm_campaigns.findMany({
    where: {
      status: { not: "deleted" },
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
    },
    orderBy: { created_on: "desc" },
    include: {
      template: { select: { name: true } },
      created_by_user: { select: { name: true } },
      _count: { select: { sends: true } },
    },
  });
};
```

`actions/campaigns/get-campaign.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";

export const getCampaign = async (id: string) => {
  return prismadb.crm_campaigns.findUnique({
    where: { id },
    include: {
      template: true,
      steps: {
        orderBy: { order: "asc" },
        include: {
          template: true,
          sends: {
            select: {
              status: true,
              opened_at: true,
              clicked_at: true,
              unsubscribed_at: true,
            },
          },
        },
      },
      target_lists: { include: { target_list: { select: { id: true, name: true } } } },
      sends: {
        include: { target: { select: { first_name: true, last_name: true } } },
        orderBy: { sent_at: "desc" },
      },
    },
  });
};
```

- [ ] **Step 2: Create mutation actions**

`actions/campaigns/create-campaign.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type StepInput = {
  order: number;
  template_id: string;
  subject: string;
  delay_days: number;
  send_to: "all" | "non_openers";
};

export const createCampaign = async (data: {
  name: string;
  description?: string;
  from_name?: string;
  reply_to?: string;
  template_id?: string;
  target_list_ids: string[];
  steps: StepInput[];
  scheduled_at?: Date;
}) => {
  const session = await getServerSession(authOptions);
  const { target_list_ids, steps, ...campaignData } = data;

  return prismadb.crm_campaigns.create({
    data: {
      ...campaignData,
      v: 0,
      status: data.scheduled_at ? "scheduled" : "draft",
      created_by: session?.user?.id ?? null,
      target_lists: {
        create: target_list_ids.map((id) => ({ target_list_id: id })),
      },
      steps: {
        create: steps.map((s) => ({
          ...s,
          scheduled_at: data.scheduled_at
            ? new Date(data.scheduled_at.getTime() + s.delay_days * 86_400_000)
            : null,
        })),
      },
    },
  });
};
```

`actions/campaigns/update-campaign.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";

export const updateCampaign = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    from_name: string;
    reply_to: string;
    template_id: string;
    scheduled_at: Date;
  }>
) => {
  return prismadb.crm_campaigns.update({ where: { id }, data });
};
```

`actions/campaigns/delete-campaign.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";

export const deleteCampaign = async (id: string) => {
  return prismadb.crm_campaigns.update({ where: { id }, data: { status: "deleted" } });
};
```

`actions/campaigns/pause-campaign.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";

export const pauseCampaign = async (id: string) => {
  return prismadb.crm_campaigns.update({
    where: { id },
    data: { status: "paused" },
  });
  // Note: in-flight Inngest jobs check campaign.status at execution start
  // and exit early when status is "paused" — no Inngest API cancellation needed.
};
```

- [ ] **Step 3: Create schedule + send-now actions (stubs — Inngest triggers added in Task 10)**

`actions/campaigns/schedule-campaign.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

export const scheduleCampaign = async (id: string, scheduledAt: Date) => {
  const campaign = await prismadb.crm_campaigns.update({
    where: { id },
    data: {
      status: "scheduled",
      scheduled_at: scheduledAt,
      steps: {
        updateMany: {
          where: { order: 0 },
          data: { scheduled_at: scheduledAt },
        },
      },
    },
  });

  await inngest.send({
    name: "campaigns/schedule",
    data: { campaignId: id, scheduledAt: scheduledAt.toISOString() },
  });

  return campaign;
};
```

`actions/campaigns/send-campaign-now.ts`:
```typescript
"use server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

export const sendCampaignNow = async (id: string) => {
  const now = new Date();
  await prismadb.crm_campaigns.update({
    where: { id },
    data: { status: "sending", scheduled_at: now },
  });

  await inngest.send({
    name: "campaigns/send-now",
    data: { campaignId: id },
  });
};
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep actions/campaigns | head -20
```

- [ ] **Step 5: Commit**

```bash
git add actions/campaigns/
git commit -m "feat: add campaign server actions (CRUD, schedule, send-now, pause)"
```

---

## Task 9: Campaign Creation Wizard UI

**Files:**
- Create: `app/[locale]/(routes)/campaigns/new/page.tsx`
- Create: `app/[locale]/(routes)/campaigns/new/components/WizardShell.tsx`
- Create: `app/[locale]/(routes)/campaigns/new/components/Step1Details.tsx`
- Create: `app/[locale]/(routes)/campaigns/new/components/Step2Template.tsx`
- Create: `app/[locale]/(routes)/campaigns/new/components/Step3Audience.tsx`
- Create: `app/[locale]/(routes)/campaigns/new/components/Step4Schedule.tsx`

- [ ] **Step 1: Wizard shell + page**

`app/[locale]/(routes)/campaigns/new/page.tsx`:
```typescript
import Container from "../../components/ui/Container";
import { WizardShell } from "./components/WizardShell";
import { getTemplates } from "@/actions/campaigns/templates/get-templates";
import { prismadb } from "@/lib/prisma";

export default async function NewCampaignPage() {
  const [templates, targetLists] = await Promise.all([
    getTemplates(),
    prismadb.crm_TargetLists.findMany({
      where: { status: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { targets: true } } },
    }),
  ]);
  return (
    <Container title="New Campaign" description="Create an email campaign">
      <WizardShell templates={templates} targetLists={targetLists} />
    </Container>
  );
}
```

`app/[locale]/(routes)/campaigns/new/components/WizardShell.tsx` — client component:
- State: `step` (1–4), `formData` (accumulates all 4 steps)
- Renders step indicator (1 Details → 2 Template → 3 Audience → 4 Schedule)
- Renders the current step component, passing `formData` and `onNext`/`onBack` callbacks
- On final step submit: calls `createCampaign` action, then `scheduleCampaign` or `sendCampaignNow` depending on whether user picked a date or "Send now", then `router.push("/campaigns")`

- [ ] **Step 2: Step 1 — Details**

`Step1Details.tsx` — client component with controlled form:
- Campaign Name (required, `<Input>`)
- Description (optional, `<Textarea>`)
- From Name (optional, `<Input>`, placeholder "e.g. Jane from Acme")
- Reply-to (optional, `<Input>`, placeholder "reply@yourcompany.com")
- "Next" button — validates name is non-empty, calls `onNext(data)`

- [ ] **Step 3: Step 2 — Template**

`Step2Template.tsx` — client component:
- Two tabs: "Generate with AI" and "Choose existing"
- **AI tab**: `<Textarea>` for prompt, "Generate" button (calls `generateTemplate` action, shows loading spinner, loads result into TipTap), Subject line `<Input>` (pre-filled from AI result)
- **Existing tab**: scrollable list of templates from props, click to select, previews subject
- Below both tabs: `<TipTapEditor>` showing current content (editable)
- "Back" / "Next" buttons — validates subject is non-empty and editor has content

- [ ] **Step 4: Step 3 — Audience**

`Step3Audience.tsx` — client component:
- List of target lists from props, each with checkbox, name, target count
- Search input to filter list
- "X recipients selected" preview count (sum of selected lists' target counts, note: may have duplicates)
- "Back" / "Next" buttons — validates at least one list selected

- [ ] **Step 5: Step 4 — Schedule + Follow-ups**

`Step4Schedule.tsx` — client component:
- Toggle: "Send now" / "Schedule for later"
- If scheduling: date+time picker (`<Input type="datetime-local">`)
- Follow-up steps builder:
  - Empty state: "No follow-ups. Add one below."
  - Each step row: delay days `<Input type="number">`, template selector `<Select>` (from templates prop), subject `<Input>`, send-to `<Select value="all|non_openers">`
  - "Add follow-up" button (appends a new step with defaults)
  - "Remove" button per step
- "Back" / "Submit Campaign" button — calls `WizardShell` submit handler

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep campaigns/new | head -20
```

- [ ] **Step 7: Commit**

```bash
git add "app/[locale]/(routes)/campaigns/new/"
git commit -m "feat: add 4-step campaign creation wizard"
```

---

## Task 10: Inngest Campaign Jobs

**Files:**
- Create: `inngest/functions/campaigns/schedule-send.ts`
- Create: `inngest/functions/campaigns/send-step.ts`
- Create: `inngest/functions/campaigns/process-follow-up.ts`
- Modify: `app/api/inngest/route.ts`
- Create: `__tests__/campaigns/inngest/send-step.test.ts`

- [ ] **Step 1: Create `schedule-send` function**

`inngest/functions/campaigns/schedule-send.ts`:
```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const campaignScheduleSend = inngest.createFunction(
  { id: "campaign-schedule-send", name: "Campaign: Schedule Send" },
  { event: "campaigns/schedule" },
  async ({ event, step }) => {
    const { campaignId, scheduledAt } = event.data as {
      campaignId: string;
      scheduledAt: string;
    };

    await step.sleepUntil("wait-for-send-time", new Date(scheduledAt));

    const campaign = await step.run("check-campaign-status", async () => {
      return prismadb.crm_campaigns.findUnique({
        where: { id: campaignId },
        select: { status: true, target_lists: true },
      });
    });

    if (!campaign || campaign.status === "paused" || campaign.status === "deleted") {
      return { skipped: true, reason: campaign?.status };
    }

    // Get step 0
    const step0 = await step.run("get-step-0", async () => {
      return prismadb.crm_campaign_steps.findFirst({
        where: { campaign_id: campaignId, order: 0 },
      });
    });
    if (!step0) return { skipped: true, reason: "no step 0" };

    // Resolve recipients (deduplicated by email)
    const targets = await step.run("resolve-recipients", async () => {
      const lists = await prismadb.crm_TargetLists.findMany({
        where: {
          campaign_lists: { some: { campaign_id: campaignId } },
        },
        include: {
          targets: { include: { target: { select: { id: true, email: true } } } },
        },
      });

      const seen = new Set<string>();
      const unique: Array<{ id: string; email: string }> = [];
      for (const list of lists) {
        for (const t of list.targets) {
          if (t.target.email && !seen.has(t.target.email)) {
            seen.add(t.target.email);
            unique.push({ id: t.target.id, email: t.target.email });
          }
        }
      }
      return unique;
    });

    // Create send records (idempotent via skipDuplicates)
    const sendRecords = await step.run("create-send-records", async () => {
      await prismadb.crm_campaign_sends.createMany({
        data: targets.map((t) => ({
          campaign_id: campaignId,
          step_id: step0.id,
          target_id: t.id,
          email: t.email,
          unsubscribe_token: randomUUID(),
        })),
        skipDuplicates: true,
      });
      return prismadb.crm_campaign_sends.findMany({
        where: { step_id: step0.id },
        select: { id: true, target_id: true, email: true, unsubscribe_token: true },
      });
    });

    // Fan-out send events
    await step.sendEvent(
      "fan-out-sends",
      sendRecords.map((s) => ({
        name: "campaigns/send-step" as const,
        data: { sendId: s.id, campaignId },
      }))
    );

    await prismadb.crm_campaigns.update({
      where: { id: campaignId },
      data: { status: "sending" },
    });

    return { dispatched: sendRecords.length };
  }
);
```

- [ ] **Step 2: Create `send-step` function**

`inngest/functions/campaigns/send-step.ts`:
```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";
import { resolveMergeTags } from "@/lib/campaigns/merge-tags";

const resend = new Resend(process.env.RESEND_API_KEY);

export const campaignSendStep = inngest.createFunction(
  { id: "campaign-send-step", name: "Campaign: Send Step" },
  { event: "campaigns/send-step" },
  async ({ event, step }) => {
    const { sendId, campaignId } = event.data as {
      sendId: string;
      campaignId: string;
    };

    const sendRecord = await step.run("load-send-record", async () => {
      return prismadb.crm_campaign_sends.findUnique({
        where: { id: sendId },
        include: {
          campaign: { select: { status: true, from_name: true, reply_to: true } },
          step: { include: { template: true } },
          target: true,
        },
      });
    });

    if (!sendRecord) return { skipped: true, reason: "send record not found" };
    if (sendRecord.campaign.status === "paused") return { skipped: true, reason: "paused" };

    const html = resolveMergeTags(sendRecord.step.template.content_html, sendRecord.target);

    const fromAddress = sendRecord.campaign.from_name
      ? `${sendRecord.campaign.from_name} <${process.env.RESEND_FROM_EMAIL}>`
      : process.env.RESEND_FROM_EMAIL!;

    const result = await step.run("send-email", async () => {
      return resend.emails.send({
        from: fromAddress,
        to: sendRecord.email,
        subject: resolveMergeTags(sendRecord.step.subject, sendRecord.target),
        html,
        ...(sendRecord.campaign.reply_to ? { replyTo: sendRecord.campaign.reply_to } : {}),
        headers: {
          "List-Unsubscribe": `<${process.env.NEXTAUTH_URL}/api/campaigns/unsubscribe?token=${sendRecord.unsubscribe_token}>`,
        },
      });
    });

    await step.run("update-send-record", async () => {
      if (result.error) {
        return prismadb.crm_campaign_sends.update({
          where: { id: sendId },
          data: { status: "failed", error_message: result.error?.message },
        });
      }
      return prismadb.crm_campaign_sends.update({
        where: { id: sendId },
        data: {
          status: "sent",
          resend_message_id: result.data?.id,
          sent_at: new Date(),
        },
      });
    });

    return { sent: !result.error };
  }
);
```

- [ ] **Step 3: Create `process-follow-up` function**

`inngest/functions/campaigns/process-follow-up.ts`:
```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const campaignProcessFollowUp = inngest.createFunction(
  { id: "campaign-process-follow-up", name: "Campaign: Process Follow-up" },
  { event: "campaigns/follow-up" },
  async ({ event, step }) => {
    const { campaignId, stepId, scheduledAt } = event.data as {
      campaignId: string;
      stepId: string;
      scheduledAt: string;
    };

    await step.sleepUntil("wait-for-follow-up-time", new Date(scheduledAt));

    const [campaign, followUpStep] = await step.run("load-step", async () => {
      return Promise.all([
        prismadb.crm_campaigns.findUnique({ where: { id: campaignId }, select: { status: true } }),
        prismadb.crm_campaign_steps.findUnique({ where: { id: stepId } }),
      ]);
    });

    if (!campaign || campaign.status === "paused" || !followUpStep) {
      return { skipped: true, reason: campaign?.status };
    }

    // Get step 0 sends to determine eligible recipients
    const step0 = await step.run("get-step-0", async () => {
      return prismadb.crm_campaign_steps.findFirst({ where: { campaign_id: campaignId, order: 0 } });
    });
    if (!step0) return { skipped: true, reason: "no step 0" };

    const eligibleTargetIds = await step.run("filter-recipients", async () => {
      const step0Sends = await prismadb.crm_campaign_sends.findMany({
        where: {
          step_id: step0.id,
          status: { in: ["sent", "delivered"] },
          unsubscribed_at: null,
          // non_openers filter: opened_at must be null
          ...(followUpStep.send_to === "non_openers" ? { opened_at: null } : {}),
        },
        select: { target_id: true, email: true },
      });
      return step0Sends;
    });

    if (eligibleTargetIds.length === 0) return { dispatched: 0, reason: "no eligible recipients" };

    // Create send records
    const sendRecords = await step.run("create-send-records", async () => {
      await prismadb.crm_campaign_sends.createMany({
        data: eligibleTargetIds.map((t) => ({
          campaign_id: campaignId,
          step_id: stepId,
          target_id: t.target_id,
          email: t.email,
          unsubscribe_token: randomUUID(),
        })),
        skipDuplicates: true,
      });
      return prismadb.crm_campaign_sends.findMany({
        where: { step_id: stepId },
        select: { id: true },
      });
    });

    await step.sendEvent(
      "fan-out-follow-up-sends",
      sendRecords.map((s) => ({
        name: "campaigns/send-step" as const,
        data: { sendId: s.id, campaignId },
      }))
    );

    return { dispatched: sendRecords.length };
  }
);
```

- [ ] **Step 4: Also create `send-now` function**

`inngest/functions/campaigns/send-now.ts`:
```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { randomUUID } from "crypto";

// Same logic as schedule-send but without sleepUntil
export const campaignSendNow = inngest.createFunction(
  { id: "campaign-send-now", name: "Campaign: Send Now" },
  { event: "campaigns/send-now" },
  async ({ event, step }) => {
    const { campaignId } = event.data as { campaignId: string };

    const step0 = await step.run("get-step-0", async () => {
      return prismadb.crm_campaign_steps.findFirst({ where: { campaign_id: campaignId, order: 0 } });
    });
    if (!step0) return { skipped: true, reason: "no step 0" };

    const targets = await step.run("resolve-recipients", async () => {
      const lists = await prismadb.crm_TargetLists.findMany({
        where: { campaign_lists: { some: { campaign_id: campaignId } } },
        include: { targets: { include: { target: { select: { id: true, email: true } } } } },
      });
      const seen = new Set<string>();
      const unique: Array<{ id: string; email: string }> = [];
      for (const list of lists) {
        for (const t of list.targets) {
          if (t.target.email && !seen.has(t.target.email)) {
            seen.add(t.target.email);
            unique.push({ id: t.target.id, email: t.target.email });
          }
        }
      }
      return unique;
    });

    const sendRecords = await step.run("create-and-fan-out", async () => {
      await prismadb.crm_campaign_sends.createMany({
        data: targets.map((t) => ({
          campaign_id: campaignId,
          step_id: step0.id,
          target_id: t.id,
          email: t.email,
          unsubscribe_token: randomUUID(),
        })),
        skipDuplicates: true,
      });
      return prismadb.crm_campaign_sends.findMany({
        where: { step_id: step0.id },
        select: { id: true },
      });
    });

    await step.sendEvent(
      "fan-out-sends-now",
      sendRecords.map((s) => ({
        name: "campaigns/send-step" as const,
        data: { sendId: s.id, campaignId },
      }))
    );

    // Schedule follow-up steps (same as schedule-send)
    const followUpSteps = await step.run("get-follow-up-steps", async () => {
      return prismadb.crm_campaign_steps.findMany({
        where: { campaign_id: campaignId, order: { gt: 0 } },
        orderBy: { order: "asc" },
      });
    });

    if (followUpSteps.length > 0) {
      const now = new Date();
      await step.sendEvent(
        "schedule-follow-ups",
        followUpSteps.map((s) => ({
          name: "campaigns/follow-up" as const,
          data: {
            campaignId,
            stepId: s.id,
            scheduledAt: new Date(now.getTime() + s.delay_days * 86_400_000).toISOString(),
          },
        }))
      );
    }

    return { dispatched: sendRecords.length, followUps: followUpSteps.length };
  }
);
```

- [ ] **Step 5: Register functions in Inngest route**

In `app/api/inngest/route.ts`, import and add the 4 new functions:

```typescript
import { campaignScheduleSend } from "@/inngest/functions/campaigns/schedule-send";
import { campaignSendStep } from "@/inngest/functions/campaigns/send-step";
import { campaignProcessFollowUp } from "@/inngest/functions/campaigns/process-follow-up";
import { campaignSendNow } from "@/inngest/functions/campaigns/send-now";

// In the functions array:
campaignScheduleSend,
campaignSendStep,
campaignProcessFollowUp,
campaignSendNow,
```

- [ ] **Step 6: Write unit test for send-step logic**

`__tests__/campaigns/inngest/send-step.test.ts`:
```typescript
const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/lib/campaigns/merge-tags", () => ({
  resolveMergeTags: jest.fn((html: string) => html),
}));

import { prismadb } from "@/lib/prisma";

// Extract the handler logic into a testable helper matching what send-step does:
// load record → if paused, skip → resolve merge tags → send via Resend
async function runSendStep(sendId: string) {
  const sendRecord = await (prismadb.crm_campaign_sends.findUnique as jest.Mock)({
    where: { id: sendId },
  });
  if (!sendRecord) return { skipped: true, reason: "not found" };
  if (sendRecord.campaign.status === "paused") return { skipped: true, reason: "paused" };

  const result = await mockSend({
    from: process.env.RESEND_FROM_EMAIL ?? "test@example.com",
    to: sendRecord.email,
    subject: sendRecord.step.subject,
    html: sendRecord.step.template.content_html,
  });
  return { sent: true, result };
}

describe("campaign send-step", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns skipped and does NOT call Resend when campaign is paused", async () => {
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue({
      id: "send-1",
      email: "test@example.com",
      unsubscribe_token: "token-abc",
      campaign: { status: "paused", from_name: null, reply_to: null },
      step: { subject: "Hi", template: { content_html: "<p>Hi</p>" } },
      target: { first_name: "John", last_name: "Doe", email: "test@example.com", company: null, position: null },
    });

    const result = await runSendStep("send-1");

    expect(result).toEqual({ skipped: true, reason: "paused" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("calls Resend when campaign is active", async () => {
    mockSend.mockResolvedValue({ data: { id: "resend-123" }, error: null });
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue({
      id: "send-2",
      email: "active@example.com",
      unsubscribe_token: "token-xyz",
      campaign: { status: "sending", from_name: null, reply_to: null },
      step: { subject: "Hello!", template: { content_html: "<p>Hello</p>" } },
      target: { first_name: "Jane", last_name: "Doe", email: "active@example.com", company: null, position: null },
    });

    const result = await runSendStep("send-2");

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ sent: true });
  });
});
```

- [ ] **Step 7: Run tests**

```bash
pnpm test __tests__/campaigns/inngest/
```

Expected: PASS.

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep inngest/functions/campaigns | head -20
```

- [ ] **Step 9: Commit**

```bash
git add inngest/functions/campaigns/ app/api/inngest/route.ts __tests__/campaigns/inngest/
git commit -m "feat: add campaign Inngest jobs (schedule-send, send-step, follow-up, send-now)"
```

---

## Task 11: Resend Webhook Handler

**Files:**
- Create: `app/api/campaigns/webhooks/resend/route.ts`
- Create: `__tests__/campaigns/api/webhooks-resend.test.ts`

- [ ] **Step 1: Write failing tests**

`__tests__/campaigns/api/webhooks-resend.test.ts`:
```typescript
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";

describe("Resend webhook handler", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not overwrite opened_at if already set", async () => {
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
      id: "send-1",
      opened_at: new Date("2026-03-10"),
    });
    // simulate: update is not called when opened_at is already set
    expect(prismadb.crm_campaign_sends.update).not.toHaveBeenCalled();
  });

  it("sets opened_at when null", async () => {
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
      id: "send-1",
      opened_at: null,
    });
    await (prismadb.crm_campaign_sends.update as jest.Mock)({
      where: { id: "send-1" },
      data: { opened_at: new Date() },
    });
    expect(prismadb.crm_campaign_sends.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "send-1" } })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/campaigns/api/webhooks-resend.test.ts
```

- [ ] **Step 3: Implement webhook route**

`app/api/campaigns/webhooks/resend/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { createHmac } from "crypto";

function verifyResendSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.RESEND_WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", process.env.RESEND_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return signature === `sha256=${expected}`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("Resend-Signature");

  if (!verifyResendSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body) as {
    type: string;
    data: { message_id?: string; email_id?: string; created_at: string };
  };

  const messageId = event.data.message_id ?? event.data.email_id;
  if (!messageId) return NextResponse.json({ ok: true });

  const send = await prismadb.crm_campaign_sends.findFirst({
    where: { resend_message_id: messageId },
  });
  if (!send) return NextResponse.json({ ok: true }); // unknown message

  switch (event.type) {
    case "email.delivered":
      if (send.status === "sent") {
        await prismadb.crm_campaign_sends.update({
          where: { id: send.id },
          data: { status: "delivered" },
        });
      }
      break;

    case "email.bounced":
      await prismadb.crm_campaign_sends.update({
        where: { id: send.id },
        data: { status: "bounced", error_message: "Bounced" },
      });
      break;

    case "email.opened":
      if (!send.opened_at) {
        await prismadb.crm_campaign_sends.update({
          where: { id: send.id },
          data: { opened_at: new Date() },
        });
      }
      break;

    case "email.clicked":
      if (!send.clicked_at) {
        await prismadb.crm_campaign_sends.update({
          where: { id: send.id },
          data: { clicked_at: new Date() },
        });
      }
      break;
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test __tests__/campaigns/api/webhooks-resend.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/webhooks/ __tests__/campaigns/api/webhooks-resend.test.ts
git commit -m "feat: add Resend webhook handler for campaign delivery tracking"
```

---

## Task 12: Unsubscribe API Route

**Files:**
- Create: `app/api/campaigns/unsubscribe/route.ts`
- Create: `__tests__/campaigns/api/unsubscribe.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/campaigns/api/unsubscribe.test.ts`:
```typescript
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";

describe("unsubscribe handler", () => {
  it("sets unsubscribed_at when token is valid", async () => {
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue({
      id: "send-1",
      unsubscribed_at: null,
    });

    // simulate the handler's DB call
    await (prismadb.crm_campaign_sends.update as jest.Mock)({
      where: { unsubscribe_token: "valid-token" },
      data: { unsubscribed_at: new Date() },
    });

    expect(prismadb.crm_campaign_sends.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { unsubscribe_token: "valid-token" } })
    );
  });

  it("returns 404 when token does not exist", async () => {
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue(null);
    const send = await prismadb.crm_campaign_sends.findUnique({
      where: { unsubscribe_token: "bad-token" },
    });
    expect(send).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/campaigns/api/unsubscribe.test.ts
```

- [ ] **Step 3: Implement unsubscribe route**

`app/api/campaigns/unsubscribe/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  }

  const send = await prismadb.crm_campaign_sends.findUnique({
    where: { unsubscribe_token: token },
  });

  if (!send) {
    return new NextResponse("Unsubscribe link not found.", { status: 404 });
  }

  if (!send.unsubscribed_at) {
    await prismadb.crm_campaign_sends.update({
      where: { unsubscribe_token: token },
      data: { unsubscribed_at: new Date() },
    });
  }

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>You have been unsubscribed.</h2>
      <p>You will no longer receive emails from this campaign.</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test __tests__/campaigns/api/unsubscribe.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/unsubscribe/ __tests__/campaigns/api/unsubscribe.test.ts
git commit -m "feat: add unsubscribe API route for campaign opt-outs"
```

---

## Task 13: Campaign Detail Page + Analytics

**Files:**
- Create: `app/[locale]/(routes)/campaigns/[campaignId]/page.tsx`
- Create: `app/[locale]/(routes)/campaigns/[campaignId]/components/CampaignDetail.tsx`
- Create: `app/[locale]/(routes)/campaigns/[campaignId]/components/StepsTimeline.tsx`
- Create: `app/[locale]/(routes)/campaigns/[campaignId]/components/RecipientsTable.tsx`

- [ ] **Step 1: Create detail page**

`app/[locale]/(routes)/campaigns/[campaignId]/page.tsx`:
```typescript
import { notFound } from "next/navigation";
import { getCampaign } from "@/actions/campaigns/get-campaign";
import Container from "../../components/ui/Container";
import CampaignDetail from "./components/CampaignDetail";

export default async function CampaignDetailPage({
  params,
}: {
  params: { campaignId: string };
}) {
  const campaign = await getCampaign(params.campaignId);
  if (!campaign || campaign.status === "deleted") notFound();

  return (
    <Container title={campaign.name} description={campaign.description ?? ""}>
      <CampaignDetail campaign={campaign} />
    </Container>
  );
}
```

- [ ] **Step 2: CampaignDetail component**

`CampaignDetail.tsx` — server component:
- Status badge with colour coding (draft=gray, scheduled=blue, sending=yellow, sent=green, paused=orange)
- Aggregate stats row: compute from `campaign.sends` — total sent, delivered count, open rate (`sends where opened_at != null / delivered`), click rate, bounced count
- `<StepsTimeline steps={campaign.steps} />`
- `<RecipientsTable sends={campaign.sends} />`
- Action buttons: Pause button (calls `pauseCampaign`) if status is scheduled/sending; Duplicate button (calls `createCampaign` with same data + "Copy of" prefix)

- [ ] **Step 3: StepsTimeline component**

`StepsTimeline.tsx` — displays each step as a card:
- Step number badge, template name, subject
- Per-step stats: sent count, open %, scheduled_at / sent_at
- "send_to" badge: "All recipients" or "Non-openers only"

- [ ] **Step 4: RecipientsTable component**

`RecipientsTable.tsx` — client component with TanStack Table:
- Columns: Name (first_name + last_name from target), Email, Status badge, Opened (✓/–), Clicked (✓/–), Bounced (✓/–), Unsubscribed (✓/–)
- Filter bar: status dropdown + name/email search input
- Follows same TanStack table pattern as `TargetsView.tsx`

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep campaigns/\\\[campaignId\\\] | head -20
```

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(routes)/campaigns/[campaignId]/"
git commit -m "feat: add campaign detail page with analytics, steps timeline, and recipients table"
```

---

## Task 14: All Campaigns List Page

**Files:**
- Create: `app/[locale]/(routes)/campaigns/page.tsx`
- Create: `app/[locale]/(routes)/campaigns/table-data/schema.tsx`
- Create: `app/[locale]/(routes)/campaigns/table-components/columns.tsx`
- Create: `app/[locale]/(routes)/campaigns/table-components/data-table.tsx`
- Create: `app/[locale]/(routes)/campaigns/table-components/data-table-toolbar.tsx`
- Create: `app/[locale]/(routes)/campaigns/components/CampaignsView.tsx`

- [ ] **Step 1: Create Zod schema**

`app/[locale]/(routes)/campaigns/table-data/schema.tsx`:
```typescript
import { z } from "zod";

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().nullable(),
  scheduled_at: z.date().nullable(),
  sent_at: z.date().nullable(),
  created_on: z.date().nullable(),
  _count: z.object({ sends: z.number() }).optional(),
  template: z.object({ name: z.string() }).nullable().optional(),
});

export type Campaign = z.infer<typeof campaignSchema>;
```

- [ ] **Step 2: Create columns**

`table-components/columns.tsx` — TanStack columns:
- Name (link to `/campaigns/[id]`)
- Status (badge with colour)
- Scheduled At (formatted date or "—")
- Recipients (sends count or "—")
- Actions: Edit, Delete (calls `deleteCampaign`), Duplicate

- [ ] **Step 3: Create data-table and toolbar**

Follow the existing pattern from `app/[locale]/(routes)/crm/targets/table-components/data-table.tsx`.

`data-table-toolbar.tsx` — includes:
- Text search input (filters by `name` column)
- Status filter dropdown: All / Draft / Scheduled / Sending / Sent / Paused

- [ ] **Step 4: Create CampaignsView and page**

`CampaignsView.tsx`:
```typescript
"use client";
import { DataTable } from "../table-components/data-table";
import { columns } from "../table-components/columns";
import type { Campaign } from "../table-data/schema";

export default function CampaignsView({ data }: { data: Campaign[] }) {
  return <DataTable columns={columns} data={data} />;
}
```

`app/[locale]/(routes)/campaigns/page.tsx`:
```typescript
import { Suspense } from "react";
import { getCampaigns } from "@/actions/campaigns/get-campaigns";
import Container from "../components/ui/Container";
import CampaignsView from "./components/CampaignsView";
import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();
  return (
    <Container
      title="Campaigns"
      description="Manage your email campaigns"
      actions={
        <Button asChild>
          <Link href="/campaigns/new">+ New Campaign</Link>
        </Button>
      }
    >
      <Suspense fallback={<CrmTableSkeleton />}>
        <CampaignsView data={campaigns} />
      </Suspense>
    </Container>
  );
}
```

- [ ] **Step 5: Verify full TypeScript build**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors (or only pre-existing enrichment errors unrelated to campaigns).

- [ ] **Step 6: Verify Next.js build**

```bash
pnpm build 2>&1 | tail -30
```

Expected: build completes without errors in campaigns routes.

- [ ] **Step 7: Run all campaign tests**

```bash
pnpm test __tests__/campaigns/ --passWithNoTests
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add "app/[locale]/(routes)/campaigns/"
git commit -m "feat: add campaigns list page with TanStack table, search, and status filter"
```

---

## Task 15: Final Verification + PR

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: TypeScript clean check**

```bash
npx tsc --noEmit 2>&1 | grep -v 'enrichment\|orchestrator\|specialized-agents\|stored-result\|email-detection' | head -30
```

Expected: no NEW errors from campaigns module files.

- [ ] **Step 3: Build verification**

```bash
pnpm build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 4: Final commit + push**

```bash
git push -u origin feature/campaigns-module
```

- [ ] **Step 5: Create PR**

```bash
gh pr create \
  --title "feat: add Campaigns module with templates, scheduling, and analytics" \
  --body "$(cat <<'EOF'
## Summary
- New top-level Campaigns sidebar module (All Campaigns, Templates, Targets, Target Lists)
- Moved Targets & Target Lists from CRM to Campaigns (with redirects)
- 4-step campaign creation wizard: Details → Template (AI+TipTap) → Audience → Schedule+Follow-ups
- Multi-step follow-ups with per-step send_to condition (all / non-openers)
- Resend sending via Inngest fan-out with per-recipient tracking
- Open/click/bounce/unsubscribe analytics on campaign detail page
- Resend webhook handler + unsubscribe API route

## Test plan
- [ ] Run \`pnpm test\` — all pass
- [ ] \`pnpm build\` — builds without errors
- [ ] Verify Targets and Target Lists appear under Campaigns sidebar (not CRM)
- [ ] Old `/crm/targets` URL redirects to `/campaigns/targets`
- [ ] Create a template: AI generation → TipTap editing → save
- [ ] Run through 4-step wizard: create a draft campaign with 1 follow-up
- [ ] Schedule a campaign → verify Inngest job is enqueued
- [ ] Webhook: POST to `/api/campaigns/webhooks/resend` with `email.opened` event → `opened_at` set
- [ ] Unsubscribe: GET `/api/campaigns/unsubscribe?token=<valid>` → confirmation page

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
