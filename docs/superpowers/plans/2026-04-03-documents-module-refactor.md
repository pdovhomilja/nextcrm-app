# Documents Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the /documents module to support bulk upload, auto-classification, AI enrichment (text extraction, embeddings, summaries), document versioning, duplicate detection, batch actions, and vector-powered search — both globally and on the documents page.

**Architecture:** Single bulk dropzone replaces 3 upload buttons. Inngest orchestrator function handles text extraction → embedding → summary → AI classification as sequential steps with individual retry; thumbnail generation runs as a separate parallel Inngest function. Vector search extends the existing `unifiedSearch` server action. Documents link to Accounts via existing junction table with upload-from-account-context support.

**Tech Stack:** Next.js 16, React 19, Prisma 7.5, pgvector (1536-dim, text-embedding-3-small), Inngest (step functions), MinIO/S3, OpenAI API, pdf-parse, mammoth, sharp, pdfjs-dist, shadcn/ui, TanStack Table.

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `prisma/migrations/YYYYMMDD_documents_enrichment/migration.sql` | Schema migration: new fields, enums, chunks table, embeddings table |
| `actions/documents/check-duplicate.ts` | Server action: check content_hash for duplicate detection |
| `actions/documents/create-document-version.ts` | Server action: create versioned document record |
| `actions/documents/bulk-link-to-account.ts` | Server action: link multiple docs to an Account |
| `actions/documents/bulk-change-type.ts` | Server action: change system type for multiple docs |
| `actions/documents/bulk-delete-documents.ts` | Server action: delete multiple docs from DB + MinIO |
| `actions/documents/retry-enrichment.ts` | Server action: re-emit Inngest event for failed docs |
| `actions/documents/get-document-versions.ts` | Server action: return version history for a document |
| `actions/documents/unlink-from-account.ts` | Server action: remove junction record |
| `inngest/functions/documents/enrich-document.ts` | Inngest orchestrator: extract → embed → summarize → classify |
| `inngest/functions/documents/generate-thumbnail.ts` | Inngest function: generate thumbnail for uploaded document |
| `app/[locale]/(routes)/documents/components/bulk-upload-modal.tsx` | New bulk upload dropzone with multi-file queue |
| `app/[locale]/(routes)/documents/components/batch-actions-bar.tsx` | Batch action toolbar for selected rows |
| `app/[locale]/(routes)/documents/components/document-detail-panel.tsx` | Document detail side panel (summary, versions, linking) |
| `app/[locale]/(routes)/documents/components/processing-status-badge.tsx` | Processing status badge component |
| `actions/documents/search-documents.ts` | Server action: semantic + keyword search for documents (used by ⌘J and content search) |

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add new fields to Documents, new enum, new models |
| `actions/documents/create-document.ts` | Accept content_hash, processing_status, emit Inngest event |
| `actions/fulltext/unified-search.ts` | Add Documents to keyword + semantic search |
| `app/api/inngest/route.ts` | Register 2 new Inngest functions |
| `app/api/upload/presigned-url/route.ts` | Accept all MIME types in unified flow |
| `app/[locale]/(routes)/documents/page.tsx` | Replace 3 buttons with single upload button |
| `app/[locale]/(routes)/documents/data/schema.tsx` | Extend Zod schema with new fields |
| `app/[locale]/(routes)/documents/data/data.tsx` | Add document system types and processing statuses |
| `app/[locale]/(routes)/documents/components/columns.tsx` | Add thumbnail, summary, type badge, account, status columns |
| `app/[locale]/(routes)/documents/components/data-table.tsx` | Enable row selection, integrate batch actions bar |
| `app/[locale]/(routes)/documents/components/data-table-toolbar.tsx` | Add content search toggle, type/status/account filters |
| `app/[locale]/(routes)/documents/components/data-table-row-actions.tsx` | Add version upload, link to account actions |
| `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx` | Pass accountId to DocumentsView |
| `app/[locale]/(routes)/crm/components/DocumentsView.tsx` | Add upload button, accountId prop for context upload |
| `actions/documents/get-documents.ts` | Include new fields in select |
| `components/CommandComponent.tsx` | Add document search results to ⌘J command palette |

---

## Task 1: Database Schema Changes

**Files:**
- Modify: `prisma/schema.prisma:605-655` (Documents model + enum)
- Modify: `prisma/schema.prisma:1184-1230` (after embeddings section)
- Create: migration SQL (via `prisma migrate dev`)

- [ ] **Step 1: Add new fields to Documents model in Prisma schema**

Open `prisma/schema.prisma` and replace the Documents model (line 605-648) with:

```prisma
model Documents {
  id                     String    @id @default(uuid()) @db.Uuid
  v                      Int?      @map("__v")
  date_created           DateTime? @default(now())
  createdAt              DateTime? @default(now())
  last_updated           DateTime? @updatedAt
  updatedAt              DateTime? @updatedAt
  document_name          String
  created_by_user        String?   @db.Uuid
  createdBy              String?   @db.Uuid
  description            String?
  document_type          String?   @db.Uuid
  favourite              Boolean?
  document_file_mimeType String
  document_file_url      String
  status                 String?
  visibility             String?
  tags                   Json?     @db.JsonB
  key                    String?
  size                   Int?
  assigned_user          String?   @db.Uuid
  connected_documents    String[]

  // --- New enrichment fields ---
  content_text       String?
  summary            String?
  content_hash       String?
  thumbnail_url      String?
  processing_status  DocumentProcessingStatus @default(PENDING)
  processing_error   String?
  version            Int                      @default(1)
  parent_document_id String?                  @db.Uuid

  created_by           Users?                        @relation("created_by_user", fields: [created_by_user], references: [id])
  assigned_to_user     Users?                        @relation("assigned_to_user", fields: [assigned_user], references: [id])
  documents_type       Documents_Types?              @relation(fields: [document_type], references: [id])
  document_system_type DocumentSystemType?           @default(OTHER)
  parent_document      Documents?                    @relation("DocumentVersions", fields: [parent_document_id], references: [id])
  child_versions       Documents[]                   @relation("DocumentVersions")
  opportunities        DocumentsToOpportunities[]
  contacts             DocumentsToContacts[]
  tasks                DocumentsToTasks[]
  crm_accounts_tasks   DocumentsToCrmAccountsTasks[]
  leads                DocumentsToLeads[]
  accounts             DocumentsToAccounts[]
  chunks               crm_Document_Chunks[]

  @@index([created_by_user])
  @@index([assigned_user])
  @@index([document_type])
  @@index([createdBy])
  @@index([status])
  @@index([visibility])
  @@index([favourite])
  @@index([createdAt])
  @@index([document_system_type])
  @@index([content_hash])
  @@index([parent_document_id])
  @@index([processing_status])
}
```

- [ ] **Step 2: Add the new enum after DocumentSystemType**

After the existing `DocumentSystemType` enum (line 650-655), add:

```prisma
enum DocumentProcessingStatus {
  PENDING
  PROCESSING
  READY
  FAILED
}
```

- [ ] **Step 3: Add document chunks and embeddings models**

After the `crm_Embeddings_Opportunities` model (after line 1230), add:

```prisma
model crm_Embeddings_Documents {
  id           String   @id @default(uuid()) @db.Uuid
  document_id  String   @unique @db.Uuid
  embedding    Unsupported("vector(1536)")
  content_hash String
  /// Must be set explicitly on upsert — @default(now()) only fires on INSERT
  embedded_at  DateTime @default(now())
  document     Documents @relation(fields: [document_id], references: [id], onDelete: Cascade)

  @@map("crm_Embeddings_Documents")
}

model crm_Document_Chunks {
  id           String   @id @default(uuid()) @db.Uuid
  document_id  String   @db.Uuid
  chunk_index  Int
  chunk_text   String
  embedding    Unsupported("vector(1536)")
  embedded_at  DateTime @default(now())
  document     Documents @relation(fields: [document_id], references: [id], onDelete: Cascade)

  @@index([document_id])
  @@map("crm_Document_Chunks")
}
```

Also add the relation to the Documents model — it's already included in Step 1 (`chunks crm_Document_Chunks[]`). You also need to add the `crm_Embeddings_Documents` relation. Add this line to the Documents model relations section:

```prisma
  embedding_record     crm_Embeddings_Documents?
```

- [ ] **Step 4: Run the migration**

```bash
pnpm prisma migrate dev --name documents_enrichment
```

Expected: Migration creates successfully, Prisma client regenerates.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(documents): add enrichment fields, chunks table, and embeddings model"
```

---

## Task 2: Update Document Data Schema and Static Data

**Files:**
- Modify: `app/[locale]/(routes)/documents/data/schema.tsx`
- Modify: `app/[locale]/(routes)/documents/data/data.tsx`

- [ ] **Step 1: Update the Zod schema**

Replace the content of `app/[locale]/(routes)/documents/data/schema.tsx`:

```tsx
import { z } from "zod";

export const documentSchema = z.object({
  id: z.string(),
  document_name: z.string(),
  document_file_url: z.string(),
  document_file_mimeType: z.string(),
  description: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  processing_status: z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]),
  document_system_type: z.enum(["RECEIPT", "CONTRACT", "OFFER", "OTHER"]).nullable().optional(),
  content_hash: z.string().nullable().optional(),
  version: z.number(),
  parent_document_id: z.string().nullable().optional(),
  createdAt: z.date().nullable().optional(),
  assigned_to_user: z.object({
    name: z.string().nullable(),
  }).nullable().optional(),
  accounts: z.array(z.object({
    account: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })).optional(),
});

export type DocumentRow = z.infer<typeof documentSchema>;

// Keep backward compat alias
export const taskSchema = documentSchema;
export type Task = DocumentRow;
```

- [ ] **Step 2: Update static data for filters**

Replace the content of `app/[locale]/(routes)/documents/data/data.tsx`:

```tsx
import {
  CheckCircledIcon,
  CircleIcon,
  CrossCircledIcon,
  StopwatchIcon,
} from "@radix-ui/react-icons";

export const labels = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "documentation", label: "Documentation" },
];

export const documentSystemTypes = [
  { value: "RECEIPT", label: "Receipt" },
  { value: "CONTRACT", label: "Contract" },
  { value: "OFFER", label: "Offer" },
  { value: "OTHER", label: "Other" },
];

export const processingStatuses = [
  { value: "PENDING", label: "Pending", icon: CircleIcon },
  { value: "PROCESSING", label: "Processing", icon: StopwatchIcon },
  { value: "READY", label: "Ready", icon: CheckCircledIcon },
  { value: "FAILED", label: "Failed", icon: CrossCircledIcon },
];

// Keep legacy exports for any remaining references
export const statuses = processingStatuses;
export const priorities = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(routes)/documents/data/
git commit -m "feat(documents): update Zod schema and static filter data for enrichment fields"
```

---

## Task 3: Update Server Actions — create, get, duplicate check

**Files:**
- Modify: `actions/documents/create-document.ts`
- Modify: `actions/documents/get-documents.ts`
- Create: `actions/documents/check-duplicate.ts`

- [ ] **Step 1: Update createDocument to accept new fields and emit Inngest event**

Replace `actions/documents/create-document.ts`:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";

interface CreateDocumentInput {
  name: string;
  url: string;
  key: string;
  size: number;
  mimeType: string;
  contentHash?: string;
  accountId?: string;
}

export async function createDocument(input: CreateDocumentInput) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const document = await prismadb.documents.create({
    data: {
      v: 0,
      document_name: input.name,
      description: "new document",
      document_file_url: input.url,
      key: input.key,
      size: input.size,
      document_file_mimeType: input.mimeType,
      content_hash: input.contentHash ?? null,
      processing_status: "PENDING",
      createdBy: session.user.id,
      assigned_user: session.user.id,
      ...(input.accountId
        ? { accounts: { create: { account_id: input.accountId } } }
        : {}),
    },
  });

  await inngest.send({
    name: "document/uploaded",
    data: { documentId: document.id },
  });

  revalidatePath("/[locale]/(routes)/documents");
  return document;
}
```

- [ ] **Step 2: Update getDocuments to include new fields and relations**

Read the current `actions/documents/get-documents.ts` and update its Prisma query to select new fields. The select should include:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export const getDocuments = async () => {
  const session = await getSession();
  if (!session) return [];

  const documents = await prismadb.documents.findMany({
    where: {
      parent_document_id: null, // Only show root documents, not old versions
    },
    orderBy: { date_created: "desc" },
    include: {
      created_by: { select: { id: true, name: true, email: true } },
      assigned_to_user: { select: { id: true, name: true, email: true } },
      accounts: {
        select: {
          account: { select: { id: true, name: true } },
        },
      },
    },
  });

  return documents;
};
```

- [ ] **Step 3: Create checkDuplicate server action**

Create `actions/documents/check-duplicate.ts`:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

interface DuplicateResult {
  isDuplicate: boolean;
  existingDocument?: {
    id: string;
    name: string;
    createdAt: Date | null;
    accountName?: string;
  };
}

export async function checkDuplicate(contentHash: string): Promise<DuplicateResult> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const existing = await prismadb.documents.findFirst({
    where: { content_hash: contentHash },
    select: {
      id: true,
      document_name: true,
      createdAt: true,
      accounts: {
        select: { account: { select: { name: true } } },
        take: 1,
      },
    },
  });

  if (!existing) return { isDuplicate: false };

  return {
    isDuplicate: true,
    existingDocument: {
      id: existing.id,
      name: existing.document_name,
      createdAt: existing.createdAt,
      accountName: existing.accounts[0]?.account.name,
    },
  };
}
```

- [ ] **Step 4: Verify the actions compile**

```bash
pnpm tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors in the modified files.

- [ ] **Step 5: Commit**

```bash
git add actions/documents/create-document.ts actions/documents/get-documents.ts actions/documents/check-duplicate.ts
git commit -m "feat(documents): update createDocument with Inngest event, add checkDuplicate action"
```

---

## Task 4: Bulk Document Server Actions

**Files:**
- Create: `actions/documents/create-document-version.ts`
- Create: `actions/documents/bulk-link-to-account.ts`
- Create: `actions/documents/bulk-change-type.ts`
- Create: `actions/documents/bulk-delete-documents.ts`
- Create: `actions/documents/retry-enrichment.ts`
- Create: `actions/documents/get-document-versions.ts`
- Create: `actions/documents/unlink-from-account.ts`

- [ ] **Step 1: Create version upload action**

Create `actions/documents/create-document-version.ts`:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";

interface CreateVersionInput {
  parentDocumentId: string;
  url: string;
  key: string;
  size: number;
  mimeType: string;
  contentHash?: string;
}

export async function createDocumentVersion(input: CreateVersionInput) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const parent = await prismadb.documents.findUnique({
    where: { id: input.parentDocumentId },
    select: { id: true, document_name: true, version: true, accounts: { select: { account_id: true } } },
  });
  if (!parent) throw new Error("Parent document not found");

  const newVersion = parent.version + 1;

  const [newDoc] = await prismadb.$transaction([
    prismadb.documents.create({
      data: {
        v: 0,
        document_name: parent.document_name,
        description: `Version ${newVersion}`,
        document_file_url: input.url,
        key: input.key,
        size: input.size,
        document_file_mimeType: input.mimeType,
        content_hash: input.contentHash ?? null,
        processing_status: "PENDING",
        version: newVersion,
        parent_document_id: input.parentDocumentId,
        createdBy: session.user.id,
        assigned_user: session.user.id,
      },
    }),
    prismadb.documents.update({
      where: { id: input.parentDocumentId },
      data: {
        document_file_url: input.url,
        key: input.key,
        size: input.size,
        version: newVersion,
      },
    }),
  ]);

  await inngest.send({
    name: "document/uploaded",
    data: { documentId: input.parentDocumentId },
  });

  revalidatePath("/[locale]/(routes)/documents");
  return newDoc;
}
```

- [ ] **Step 2: Create bulk link to account action**

Create `actions/documents/bulk-link-to-account.ts`:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function bulkLinkToAccount(documentIds: string[], accountId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await prismadb.documentsToAccounts.createMany({
    data: documentIds.map((document_id) => ({ document_id, account_id: accountId })),
    skipDuplicates: true,
  });

  revalidatePath("/[locale]/(routes)/documents");
}
```

- [ ] **Step 3: Create bulk change type action**

Create `actions/documents/bulk-change-type.ts`:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { DocumentSystemType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function bulkChangeType(documentIds: string[], systemType: DocumentSystemType) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await prismadb.documents.updateMany({
    where: { id: { in: documentIds } },
    data: { document_system_type: systemType },
  });

  revalidatePath("/[locale]/(routes)/documents");
}
```

- [ ] **Step 4: Create bulk delete action**

Create `actions/documents/bulk-delete-documents.ts`:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";

export async function bulkDeleteDocuments(documentIds: string[]) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const documents = await prismadb.documents.findMany({
    where: { id: { in: documentIds } },
    select: { id: true, key: true },
  });

  // Delete from MinIO
  await Promise.allSettled(
    documents.map((doc) =>
      doc.key
        ? minioClient.send(new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: doc.key }))
        : Promise.resolve()
    )
  );

  // Delete from DB (cascade handles chunks, embeddings, junction tables)
  await prismadb.documents.deleteMany({
    where: { id: { in: documentIds } },
  });

  revalidatePath("/[locale]/(routes)/documents");
}
```

- [ ] **Step 5: Create retry enrichment action**

Create `actions/documents/retry-enrichment.ts`:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { revalidatePath } from "next/cache";

export async function retryEnrichment(documentId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await prismadb.documents.update({
    where: { id: documentId },
    data: { processing_status: "PENDING", processing_error: null },
  });

  await inngest.send({
    name: "document/uploaded",
    data: { documentId },
  });

  revalidatePath("/[locale]/(routes)/documents");
}
```

- [ ] **Step 6: Create get document versions action**

Create `actions/documents/get-document-versions.ts`:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export async function getDocumentVersions(documentId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const versions = await prismadb.documents.findMany({
    where: {
      OR: [
        { id: documentId },
        { parent_document_id: documentId },
      ],
    },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      document_file_url: true,
      createdAt: true,
      size: true,
      created_by: { select: { name: true } },
    },
  });

  return versions;
}
```

- [ ] **Step 7: Create unlink from account action**

Create `actions/documents/unlink-from-account.ts`:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function unlinkFromAccount(documentId: string, accountId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await prismadb.documentsToAccounts.delete({
    where: {
      document_id_account_id: { document_id: documentId, account_id: accountId },
    },
  });

  revalidatePath("/[locale]/(routes)/documents");
  revalidatePath(`/[locale]/(routes)/crm/accounts/${accountId}`);
}
```

- [ ] **Step 8: Verify compilation**

```bash
pnpm tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No type errors.

- [ ] **Step 9: Commit**

```bash
git add actions/documents/
git commit -m "feat(documents): add bulk actions, versioning, and account linking server actions"
```

---

## Task 5: Inngest Enrichment Pipeline — Orchestrator

**Files:**
- Create: `inngest/functions/documents/enrich-document.ts`
- Modify: `app/api/inngest/route.ts`

- [ ] **Step 1: Install text extraction dependencies**

```bash
pnpm add pdf-parse mammoth
pnpm add -D @types/pdf-parse
```

- [ ] **Step 2: Create the enrichment orchestrator function**

Create `inngest/functions/documents/enrich-document.ts`:

```ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import {
  generateEmbedding,
  toVectorLiteral,
  computeContentHash,
} from "@/inngest/lib/embedding-utils";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHUNK_SIZE = 512; // tokens (approx 4 chars per token)
const CHUNK_OVERLAP = 50;
const MAX_SINGLE_EMBED_CHARS = 8000 * 4; // ~8000 tokens

async function fetchFileBuffer(key: string): Promise<Buffer> {
  const response = await minioClient.send(
    new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key })
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function extractText(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (mimeType === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text || null;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || null;
  }

  if (mimeType === "text/plain") {
    return buffer.toString("utf-8") || null;
  }

  return null; // images and unsupported types
}

function chunkText(text: string): string[] {
  const charChunkSize = CHUNK_SIZE * 4;
  const charOverlap = CHUNK_OVERLAP * 4;
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + charChunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - charOverlap;
    if (end === text.length) break;
  }
  return chunks;
}

function classifyByFilename(name: string): "RECEIPT" | "CONTRACT" | "OFFER" | "OTHER" {
  const lower = name.toLowerCase();
  if (/invoice|receipt|bill|payment/.test(lower)) return "RECEIPT";
  if (/contract|agreement|nda|terms/.test(lower)) return "CONTRACT";
  if (/offer|quote|proposal|estimate/.test(lower)) return "OFFER";
  return "OTHER";
}

export const enrichDocument = inngest.createFunction(
  {
    id: "document-enrich",
    name: "Enrich Document",
    triggers: [{ event: "document/uploaded" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { documentId } = event.data as { documentId: string };

    const document = await step.run("load-document", async () => {
      const doc = await prismadb.documents.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          key: true,
          document_name: true,
          document_file_mimeType: true,
          document_system_type: true,
        },
      });
      if (!doc) throw new Error(`Document ${documentId} not found`);
      return doc;
    });

    // Step 1: Extract text
    const contentText = await step.run("extract-text", async () => {
      if (!document.key) return null;

      const buffer = await fetchFileBuffer(document.key);
      const text = await extractText(buffer, document.document_file_mimeType);

      await prismadb.documents.update({
        where: { id: documentId },
        data: {
          content_text: text,
          processing_status: "PROCESSING",
        },
      });

      return text;
    });

    if (!contentText) {
      // Images and unsupported types — apply filename-based classification only
      await step.run("classify-by-filename", async () => {
        const systemType = classifyByFilename(document.document_name);
        await prismadb.documents.update({
          where: { id: documentId },
          data: {
            document_system_type: systemType,
            processing_status: "READY",
          },
        });
      });
      return { documentId, status: "ready", enriched: false };
    }

    // Step 2: Generate embeddings
    await step.run("generate-embedding", async () => {
      if (contentText.length <= MAX_SINGLE_EMBED_CHARS) {
        // Single embedding on the document
        const embedding = await generateEmbedding(contentText);
        const vector = toVectorLiteral(embedding);
        const hash = computeContentHash(contentText);

        await prismadb.$executeRaw`
          INSERT INTO "crm_Embeddings_Documents" ("id", "document_id", "embedding", "content_hash", "embedded_at")
          VALUES (gen_random_uuid(), ${documentId}::uuid, ${vector}::vector, ${hash}, NOW())
          ON CONFLICT ("document_id")
          DO UPDATE SET "embedding" = EXCLUDED."embedding",
                        "content_hash" = EXCLUDED."content_hash",
                        "embedded_at" = NOW()
        `;
      } else {
        // Chunked embeddings
        const chunks = chunkText(contentText);

        // Delete old chunks if re-processing
        await prismadb.crm_Document_Chunks.deleteMany({
          where: { document_id: documentId },
        });

        for (let i = 0; i < chunks.length; i++) {
          const embedding = await generateEmbedding(chunks[i]);
          const vector = toVectorLiteral(embedding);

          await prismadb.$executeRaw`
            INSERT INTO "crm_Document_Chunks" ("id", "document_id", "chunk_index", "chunk_text", "embedding", "embedded_at")
            VALUES (gen_random_uuid(), ${documentId}::uuid, ${i}, ${chunks[i]}, ${vector}::vector, NOW())
          `;
        }
      }
    });

    // Step 3: Generate summary
    const summary = await step.run("generate-summary", async () => {
      const truncated = contentText.slice(0, 12000); // ~3000 tokens for summary input
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Summarize the following document in 2-3 concise sentences. Focus on the key purpose and contents.",
          },
          { role: "user", content: truncated },
        ],
        max_tokens: 200,
      });

      const summaryText = response.choices[0]?.message?.content ?? null;
      await prismadb.documents.update({
        where: { id: documentId },
        data: { summary: summaryText },
      });
      return summaryText;
    });

    // Step 4: AI classification
    await step.run("ai-classify", async () => {
      const truncated = contentText.slice(0, 4000);
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Classify this document into exactly one of these categories: RECEIPT, CONTRACT, OFFER, OTHER. Respond with only the category name, nothing else.",
          },
          {
            role: "user",
            content: `Document name: ${document.document_name}\n\nSummary: ${summary}\n\nContent excerpt:\n${truncated}`,
          },
        ],
        max_tokens: 10,
      });

      const raw = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "OTHER";
      const systemType = ["RECEIPT", "CONTRACT", "OFFER", "OTHER"].includes(raw)
        ? (raw as "RECEIPT" | "CONTRACT" | "OFFER" | "OTHER")
        : "OTHER";

      await prismadb.documents.update({
        where: { id: documentId },
        data: {
          document_system_type: systemType,
          processing_status: "READY",
        },
      });
    });

    return { documentId, status: "ready", enriched: true };
  }
);
```

- [ ] **Step 3: Commit**

```bash
git add inngest/functions/documents/ pnpm-lock.yaml package.json
git commit -m "feat(documents): add Inngest enrichment orchestrator with text extraction, embedding, summary, classification"
```

---

## Task 6: Inngest Thumbnail Generator

**Files:**
- Create: `inngest/functions/documents/generate-thumbnail.ts`
- Modify: `app/api/inngest/route.ts`

- [ ] **Step 1: Install thumbnail dependencies**

```bash
pnpm add sharp
pnpm add -D @types/sharp
```

Note: `pdfjs-dist` is heavy and complex for server-side rendering. For MVP, we'll use a simpler approach: sharp for image thumbnails, and a PDF-specific approach using pdf-parse to detect page count + a generic PDF icon for now. Full PDF first-page rendering can be added later with `pdfjs-dist` + canvas.

- [ ] **Step 2: Create the thumbnail generator function**

Create `inngest/functions/documents/generate-thumbnail.ts`:

```ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";
import sharp from "sharp";

const THUMB_WIDTH = 200;
const THUMB_HEIGHT = 200;

async function fetchFileBuffer(key: string): Promise<Buffer> {
  const response = await minioClient.send(
    new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key })
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export const generateDocumentThumbnail = inngest.createFunction(
  {
    id: "document-generate-thumbnail",
    name: "Generate Document Thumbnail",
    triggers: [{ event: "document/uploaded" }],
    retries: 2,
  },
  async ({ event }) => {
    const { documentId } = event.data as { documentId: string };

    const document = await prismadb.documents.findUnique({
      where: { id: documentId },
      select: { id: true, key: true, document_file_mimeType: true },
    });
    if (!document?.key) return { skipped: "no key" };

    const isImage = document.document_file_mimeType.startsWith("image/");
    if (!isImage) {
      // For non-image files (PDF, DOCX), skip thumbnail for now.
      // PDF first-page rendering requires pdfjs-dist + canvas which is complex server-side.
      return { skipped: "non-image file" };
    }

    const buffer = await fetchFileBuffer(document.key);
    const thumbnail = await sharp(buffer)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover" })
      .png()
      .toBuffer();

    const thumbnailKey = `thumbnails/${documentId}.png`;

    await minioClient.send(
      new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: "image/png",
      })
    );

    const thumbnailUrl = `${process.env.NEXT_PUBLIC_MINIO_ENDPOINT}/${MINIO_BUCKET}/${thumbnailKey}`;

    await prismadb.documents.update({
      where: { id: documentId },
      data: { thumbnail_url: thumbnailUrl },
    });

    return { documentId, thumbnailUrl };
  }
);
```

- [ ] **Step 3: Register both new Inngest functions**

Update `app/api/inngest/route.ts`. Add these imports at the top:

```ts
import { enrichDocument } from "@/inngest/functions/documents/enrich-document";
import { generateDocumentThumbnail } from "@/inngest/functions/documents/generate-thumbnail";
```

Add to the `functions` array:

```ts
    enrichDocument,
    generateDocumentThumbnail,
```

- [ ] **Step 4: Commit**

```bash
git add inngest/functions/documents/generate-thumbnail.ts app/api/inngest/route.ts pnpm-lock.yaml package.json
git commit -m "feat(documents): add thumbnail generator and register Inngest functions"
```

---

## Task 7: Extend Unified Search with Documents

**Files:**
- Modify: `actions/fulltext/unified-search.ts`

- [ ] **Step 1: Add documents to the UnifiedSearchResults interface**

In `actions/fulltext/unified-search.ts`, add `documents` to the interface (line 18-26):

```ts
export interface UnifiedSearchResults {
  accounts: SearchResult[];
  contacts: SearchResult[];
  leads: SearchResult[];
  opportunities: SearchResult[];
  projects: SearchResult[];
  tasks: SearchResult[];
  users: SearchResult[];
  documents: SearchResult[];
}
```

- [ ] **Step 2: Add document keyword search to the Promise.all**

In the `Promise.all` block (starting around line 77), add a keyword search for documents after the `kwUsers` query:

```ts
      // Add after the kwUsers query:
      prismadb.documents.findMany({
        where: {
          parent_document_id: null,
          OR: [
            { document_name: { contains: query, mode: "insensitive" } },
            { summary: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: {
          id: true,
          document_name: true,
          summary: true,
          document_system_type: true,
          accounts: { select: { account: { select: { name: true } } }, take: 1 },
        },
      }),
```

Add the corresponding destructured variable: `kwDocuments`.

- [ ] **Step 3: Add document semantic search**

Add a semantic search query for documents in the same `Promise.all`:

```ts
      // Semantic search against document embeddings
      queryVec
        ? prismadb.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT d.id, 1 - (e.embedding <=> ${queryVec}::vector) AS similarity
            FROM "Documents" d
            LEFT JOIN "crm_Embeddings_Documents" e ON e.document_id = d.id
            WHERE e.embedding IS NOT NULL AND d."parent_document_id" IS NULL
            ORDER BY e.embedding <=> ${queryVec}::vector
            LIMIT 10`
        : noSemantic,
      // Also search document chunks for long-document semantic matches
      queryVec
        ? prismadb.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT DISTINCT c."document_id" AS id,
                   MAX(1 - (c.embedding <=> ${queryVec}::vector)) AS similarity
            FROM "crm_Document_Chunks" c
            JOIN "Documents" d ON d.id = c."document_id"
            WHERE d."parent_document_id" IS NULL
            GROUP BY c."document_id"
            ORDER BY similarity DESC
            LIMIT 10`
        : noSemantic,
```

Add the corresponding destructured variables: `semDocuments` and `semDocChunks`.

- [ ] **Step 4: Merge document results**

After the existing merge logic, add document result merging:

```ts
    // Merge chunk semantic results into document semantic results
    const allSemDocs = [...semDocuments];
    for (const chunk of semDocChunks) {
      const existing = allSemDocs.find((d) => d.id === chunk.id);
      if (existing) {
        existing.similarity = Math.max(existing.similarity, chunk.similarity);
      } else {
        allSemDocs.push(chunk);
      }
    }

    const kwDocumentIds = new Set(kwDocuments.map((r) => r.id));

    const extraDocuments = queryVec
      ? await prismadb.documents.findMany({
          where: {
            parent_document_id: null,
            id: { in: allSemDocs.map((r) => r.id).filter((id) => !kwDocumentIds.has(id)) },
          },
          select: {
            id: true,
            document_name: true,
            summary: true,
            document_system_type: true,
            accounts: { select: { account: { select: { name: true } } }, take: 1 },
          },
        })
      : [];

    const documents = mergeResults(
      kwDocumentIds,
      semMap(allSemDocs),
      [...kwDocuments, ...extraDocuments].map((r) => ({
        id: r.id,
        title: r.document_name,
        subtitle: r.summary ?? r.accounts?.[0]?.account?.name ?? "",
        url: `/${locale}/documents?highlight=${r.id}`,
      }))
    );
```

- [ ] **Step 5: Add documents to the return statement**

Update the return statement to include `documents`:

```ts
    return { accounts, contacts, leads, opportunities, projects, tasks, users, documents };
```

- [ ] **Step 6: Verify compilation**

```bash
pnpm tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add actions/fulltext/unified-search.ts
git commit -m "feat(search): add documents to unified search with keyword + vector similarity"
```

---

## Task 8: Processing Status Badge Component

**Files:**
- Create: `app/[locale]/(routes)/documents/components/processing-status-badge.tsx`

- [ ] **Step 1: Create the badge component**

Create `app/[locale]/(routes)/documents/components/processing-status-badge.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", className: "bg-muted text-muted-foreground" },
  PROCESSING: { label: "Processing", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  READY: { label: "Ready", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
} as const;

interface ProcessingStatusBadgeProps {
  status: keyof typeof STATUS_CONFIG;
}

export function ProcessingStatusBadge({ status }: ProcessingStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/(routes)/documents/components/processing-status-badge.tsx
git commit -m "feat(documents): add processing status badge component"
```

---

## Task 9: Update Columns and Data Table

**Files:**
- Modify: `app/[locale]/(routes)/documents/components/columns.tsx`
- Modify: `app/[locale]/(routes)/documents/components/data-table.tsx`
- Modify: `app/[locale]/(routes)/documents/components/data-table-toolbar.tsx`

- [ ] **Step 1: Rewrite columns with new fields**

Replace `app/[locale]/(routes)/documents/components/columns.tsx`:

```tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentRow } from "../data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { ProcessingStatusBadge } from "./processing-status-badge";
import moment from "moment";

const MIME_LABELS: Record<string, { label: string; className: string }> = {
  "application/pdf": { label: "PDF", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  "image/": { label: "IMG", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  "application/vnd.openxmlformats": { label: "DOCX", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  "application/msword": { label: "DOC", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  "text/plain": { label: "TXT", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
};

function getMimeLabel(mimeType: string) {
  for (const [key, value] of Object.entries(MIME_LABELS)) {
    if (mimeType.startsWith(key)) return value;
  }
  return { label: "FILE", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" };
}

const TYPE_COLORS: Record<string, string> = {
  RECEIPT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CONTRACT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  OFFER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export const columns: ColumnDef<DocumentRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => (
      <div className="w-[80px] text-muted-foreground text-sm">
        {moment(row.getValue("createdAt")).format("YY-MM-DD")}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "document_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Document" />
    ),
    cell: ({ row }) => {
      const mimeLabel = getMimeLabel(row.original.document_file_mimeType);
      const summary = row.original.summary;
      const isProcessing = row.original.processing_status === "PROCESSING" || row.original.processing_status === "PENDING";
      return (
        <div className="flex items-start gap-3">
          <Badge variant="outline" className={`text-xs shrink-0 ${mimeLabel.className}`}>
            {mimeLabel.label}
          </Badge>
          <div className="min-w-0">
            <span className="font-medium truncate block">
              {row.getValue("document_name")}
            </span>
            {isProcessing ? (
              <span className="text-xs text-muted-foreground italic">
                Generating summary...
              </span>
            ) : summary ? (
              <span className="text-xs text-muted-foreground line-clamp-1">
                {summary}
              </span>
            ) : null}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "document_system_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = row.getValue("document_system_type") as string | null;
      if (!type) return <span className="text-muted-foreground">—</span>;
      return (
        <Badge variant="outline" className={`text-xs ${TYPE_COLORS[type] ?? ""}`}>
          {type}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "account",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account" />
    ),
    cell: ({ row }) => {
      const accounts = row.original.accounts;
      const accountName = accounts?.[0]?.account?.name;
      return accountName ? (
        <span className="text-sm text-primary">{accountName}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "processing_status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <ProcessingStatusBadge status={row.getValue("processing_status")} />
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "assigned_to_user",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assigned to" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px] text-sm">
        {(row.getValue("assigned_to_user") as { name: string | null } | null)?.name ?? "Unassigned"}
      </div>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
```

- [ ] **Step 2: Update data table to support row selection state**

Read the current `data-table.tsx` and ensure `rowSelection` state is properly initialized and the `onRowSelectionChange` is wired. The existing file likely already has this since TanStack Table setup includes it. Verify it has:

```tsx
const [rowSelection, setRowSelection] = React.useState({});
```

and in `useReactTable`:

```tsx
state: { sorting, columnFilters, columnVisibility, rowSelection },
onRowSelectionChange: setRowSelection,
```

If it already has row selection, no changes needed. The checkbox column we added in columns.tsx will work automatically.

- [ ] **Step 3: Update the toolbar with document-specific filters**

Read and update `app/[locale]/(routes)/documents/components/data-table-toolbar.tsx` to add faceted filters for `document_system_type` and `processing_status`. Use the existing `DataTableFacetedFilter` component pattern:

```tsx
// Add these filter sections to the toolbar:
{table.getColumn("document_system_type") && (
  <DataTableFacetedFilter
    column={table.getColumn("document_system_type")}
    title="Type"
    options={documentSystemTypes}
  />
)}
{table.getColumn("processing_status") && (
  <DataTableFacetedFilter
    column={table.getColumn("processing_status")}
    title="Status"
    options={processingStatuses}
  />
)}
```

Import `documentSystemTypes` and `processingStatuses` from `../data/data`.

- [ ] **Step 4: Verify compilation**

```bash
pnpm tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/(routes)/documents/components/columns.tsx app/[locale]/(routes)/documents/components/data-table.tsx app/[locale]/(routes)/documents/components/data-table-toolbar.tsx
git commit -m "feat(documents): redesign columns with type badges, summaries, status, and filters"
```

---

## Task 10: Bulk Upload Modal

**Files:**
- Create: `app/[locale]/(routes)/documents/components/bulk-upload-modal.tsx`
- Modify: `app/[locale]/(routes)/documents/page.tsx`

- [ ] **Step 1: Create the bulk upload modal component**

Create `app/[locale]/(routes)/documents/components/bulk-upload-modal.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createDocument } from "@/actions/documents/create-document";
import { checkDuplicate } from "@/actions/documents/check-duplicate";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

type FileStatus = "queued" | "checking" | "uploading" | "uploaded" | "duplicate" | "skipped" | "error";

interface QueuedFile {
  file: File;
  status: FileStatus;
  progress: number;
  hash?: string;
  duplicateInfo?: { name: string; createdAt: Date | null };
  error?: string;
}

async function computeHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface BulkUploadModalProps {
  accountId?: string;
}

export function BulkUploadModal({ accountId }: BulkUploadModalProps) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const updateFile = (index: number, updates: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: QueuedFile[] = acceptedFiles.map((file) => ({
      file,
      status: "queued",
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 64 * 1024 * 1024,
    multiple: true,
  });

  const processQueue = async () => {
    setIsProcessing(true);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status !== "queued" && item.status !== "duplicate") continue;
      if (item.status === "duplicate") continue; // skip until user decides

      // Check for duplicates
      updateFile(i, { status: "checking" });
      try {
        const hash = await computeHash(item.file);
        updateFile(i, { hash });

        const result = await checkDuplicate(hash);
        if (result.isDuplicate) {
          updateFile(i, {
            status: "duplicate",
            duplicateInfo: {
              name: result.existingDocument!.name,
              createdAt: result.existingDocument!.createdAt,
            },
          });
          continue;
        }
      } catch {
        // If duplicate check fails, proceed with upload
      }

      // Upload
      await uploadFile(i);
    }

    setIsProcessing(false);
    router.refresh();
  };

  const uploadFile = async (index: number) => {
    const item = queue[index];
    updateFile(index, { status: "uploading", progress: 10 });

    try {
      // Get presigned URL
      const folder = item.file.type.startsWith("image/") ? "images" : "documents";
      const res = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: item.file.name,
          contentType: item.file.type,
          folder,
        }),
      });

      if (!res.ok) throw new Error("Failed to get presigned URL");
      const { presignedUrl, fileUrl, key } = await res.json();

      updateFile(index, { progress: 30 });

      // Upload to MinIO
      await fetch(presignedUrl, {
        method: "PUT",
        body: item.file,
        headers: { "Content-Type": item.file.type },
      });

      updateFile(index, { progress: 70 });

      // Create document record
      await createDocument({
        name: item.file.name,
        url: fileUrl,
        key,
        size: item.file.size,
        mimeType: item.file.type,
        contentHash: item.hash,
        accountId,
      });

      updateFile(index, { status: "uploaded", progress: 100 });
    } catch (err) {
      updateFile(index, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  const uploadAnyway = async (index: number) => {
    await uploadFile(index);
    router.refresh();
  };

  const skipFile = (index: number) => {
    updateFile(index, { status: "skipped" });
  };

  const uploadedCount = queue.filter((f) => f.status === "uploaded").length;
  const hasQueued = queue.some((f) => f.status === "queued");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Upload Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
        >
          <input {...getInputProps()} />
          <p className="font-medium">Drop files here or click to browse</p>
          <p className="text-sm text-muted-foreground mt-1">
            PDF, DOCX, DOC, TXT, Images — up to 64MB each
          </p>
        </div>

        {queue.length > 0 && (
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
            {queue.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 py-2 px-3 rounded-md border text-sm"
              >
                <StatusIcon status={item.status} />
                <span className="flex-1 truncate">{item.file.name}</span>
                <span className="text-muted-foreground text-xs">
                  {(item.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                {item.status === "duplicate" && (
                  <span className="flex gap-2 text-xs">
                    <button
                      className="text-primary underline"
                      onClick={() => uploadAnyway(index)}
                    >
                      Upload anyway
                    </button>
                    <button
                      className="text-muted-foreground underline"
                      onClick={() => skipFile(index)}
                    >
                      Skip
                    </button>
                  </span>
                )}
                {item.status === "uploading" && (
                  <span className="text-xs text-muted-foreground">
                    {item.progress}%
                  </span>
                )}
                {item.status === "uploaded" && (
                  <span className="text-xs text-green-600">Uploaded</span>
                )}
                {item.status === "error" && (
                  <span className="text-xs text-red-600">{item.error}</span>
                )}
                {item.status === "skipped" && (
                  <span className="text-xs text-muted-foreground">Skipped</span>
                )}
              </div>
            ))}
          </div>
        )}

        {queue.length > 0 && (
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-muted-foreground">
              {uploadedCount}/{queue.length} uploaded
            </span>
            {hasQueued && (
              <Button onClick={processQueue} disabled={isProcessing}>
                {isProcessing ? "Uploading..." : "Upload All"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case "uploaded":
      return <span className="text-green-600">✓</span>;
    case "uploading":
    case "checking":
      return <span className="text-yellow-600 animate-spin">⟳</span>;
    case "duplicate":
      return <span className="text-yellow-600">⚠</span>;
    case "error":
      return <span className="text-red-600">✗</span>;
    case "skipped":
      return <span className="text-muted-foreground">—</span>;
    default:
      return <span className="text-muted-foreground">⏳</span>;
  }
}
```

- [ ] **Step 2: Check if react-dropzone is installed**

```bash
pnpm list react-dropzone 2>/dev/null || pnpm add react-dropzone
```

- [ ] **Step 3: Update the documents page to use the new upload modal**

Replace the content of `app/[locale]/(routes)/documents/page.tsx`:

```tsx
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { getDocuments } from "@/actions/documents/get-documents";
import { DocumentsDataTable } from "./components/data-table";
import { columns } from "./components/columns";
import { BulkUploadModal } from "./components/bulk-upload-modal";
import { getTranslations } from "next-intl/server";

const DocumentsPage = async () => {
  const documents = await getDocuments();
  const t = await getTranslations("DocumentsPage");

  return (
    <Container title={t("title")} description={t("description")}>
      <div className="flex justify-end py-5">
        <BulkUploadModal />
      </div>
      <DocumentsDataTable data={documents} columns={columns} />
    </Container>
  );
};

export default DocumentsPage;
```

- [ ] **Step 4: Verify compilation**

```bash
pnpm tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/(routes)/documents/components/bulk-upload-modal.tsx app/[locale]/(routes)/documents/page.tsx
git commit -m "feat(documents): replace 3 upload buttons with single bulk upload modal"
```

---

## Task 11: Batch Actions Bar

**Files:**
- Create: `app/[locale]/(routes)/documents/components/batch-actions-bar.tsx`
- Modify: `app/[locale]/(routes)/documents/components/data-table.tsx`

- [ ] **Step 1: Create batch actions bar component**

Create `app/[locale]/(routes)/documents/components/batch-actions-bar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AlertModal from "@/components/modals/alert-modal";
import { bulkDeleteDocuments } from "@/actions/documents/bulk-delete-documents";
import { bulkChangeType } from "@/actions/documents/bulk-change-type";
import { bulkLinkToAccount } from "@/actions/documents/bulk-link-to-account";
import { DocumentSystemType } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DocumentRow } from "../data/schema";

interface BatchActionsBarProps {
  table: Table<DocumentRow>;
  accounts: { id: string; name: string }[];
}

export function BatchActionsBar({ table, accounts }: BatchActionsBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map((r) => r.original.id);
  const count = selectedIds.length;

  if (count === 0) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      await bulkDeleteDocuments(selectedIds);
      table.toggleAllRowsSelected(false);
      toast.success(`${count} document(s) deleted`);
      router.refresh();
    } catch {
      toast.error("Failed to delete documents");
    } finally {
      setLoading(false);
      setDeleteOpen(false);
    }
  };

  const handleChangeType = async (type: string) => {
    try {
      await bulkChangeType(selectedIds, type as DocumentSystemType);
      toast.success(`Type updated for ${count} document(s)`);
      router.refresh();
    } catch {
      toast.error("Failed to update type");
    }
  };

  const handleLinkAccount = async (accountId: string) => {
    try {
      await bulkLinkToAccount(selectedIds, accountId);
      toast.success(`${count} document(s) linked to account`);
      router.refresh();
    } catch {
      toast.error("Failed to link documents");
    }
  };

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={loading}
      />
      <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2 text-sm">
        <span className="font-medium">{count} selected</span>

        <Select onValueChange={handleLinkAccount}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Link to Account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={handleChangeType}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Change Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RECEIPT">Receipt</SelectItem>
            <SelectItem value="CONTRACT">Contract</SelectItem>
            <SelectItem value="OFFER">Offer</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Integrate batch actions bar into data table**

In `app/[locale]/(routes)/documents/components/data-table.tsx`, add the `BatchActionsBar` above the table. The data table component needs to accept an `accounts` prop and render `<BatchActionsBar table={table} accounts={accounts} />` between the toolbar and the table.

Add to the `DataTableProps` interface:

```tsx
accounts?: { id: string; name: string }[];
```

Add after the toolbar, before the `<Table>`:

```tsx
<BatchActionsBar table={table} accounts={accounts ?? []} />
```

- [ ] **Step 3: Pass accounts from page to data table**

Update `app/[locale]/(routes)/documents/page.tsx` to fetch and pass accounts:

Add import:

```tsx
import { getAccounts } from "@/actions/crm/get-accounts";
```

In the component body, after `getDocuments()`:

```tsx
const allAccounts = await getAccounts();
const accountOptions = (allAccounts ?? []).map((a: { id: string; name: string }) => ({
  id: a.id,
  name: a.name,
}));
```

Pass to table:

```tsx
<DocumentsDataTable data={documents} columns={columns} accounts={accountOptions} />
```

- [ ] **Step 4: Verify compilation**

```bash
pnpm tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/(routes)/documents/components/batch-actions-bar.tsx app/[locale]/(routes)/documents/components/data-table.tsx app/[locale]/(routes)/documents/page.tsx
git commit -m "feat(documents): add batch actions bar for bulk delete, type change, and account linking"
```

---

## Task 12: Document Detail Panel

**Files:**
- Create: `app/[locale]/(routes)/documents/components/document-detail-panel.tsx`
- Modify: `app/[locale]/(routes)/documents/components/data-table-row-actions.tsx`

- [ ] **Step 1: Create the document detail panel**

Create `app/[locale]/(routes)/documents/components/document-detail-panel.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProcessingStatusBadge } from "./processing-status-badge";
import { BulkUploadModal } from "./bulk-upload-modal";
import { getDocumentVersions } from "@/actions/documents/get-document-versions";
import { retryEnrichment } from "@/actions/documents/retry-enrichment";
import { toast } from "sonner";
import moment from "moment";
import { DocumentRow } from "../data/schema";

interface DocumentDetailPanelProps {
  document: DocumentRow | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentDetailPanel({
  document,
  open,
  onClose,
}: DocumentDetailPanelProps) {
  const [versions, setVersions] = useState<
    { id: string; version: number; createdAt: Date | null; size: number | null; created_by: { name: string | null } | null }[]
  >([]);
  const router = useRouter();

  useEffect(() => {
    if (document?.id && open) {
      getDocumentVersions(document.id).then(setVersions).catch(() => {});
    }
  }, [document?.id, open]);

  if (!document) return null;

  const handleRetry = async () => {
    try {
      await retryEnrichment(document.id);
      toast.success("Enrichment re-triggered");
      router.refresh();
    } catch {
      toast.error("Failed to retry enrichment");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{document.document_name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status */}
          <div className="flex items-center gap-2">
            <ProcessingStatusBadge status={document.processing_status} />
            {document.processing_status === "FAILED" && (
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            )}
          </div>

          {/* Summary */}
          {document.summary && (
            <div>
              <h4 className="text-sm font-medium mb-1">Summary</h4>
              <p className="text-sm text-muted-foreground">{document.summary}</p>
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Type</span>
              <div>
                <Badge variant="outline">{document.document_system_type ?? "OTHER"}</Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Version</span>
              <div>{document.version}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Created</span>
              <div>{document.createdAt ? moment(document.createdAt).format("MMM D, YYYY") : "—"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Account</span>
              <div>{document.accounts?.[0]?.account?.name ?? "—"}</div>
            </div>
          </div>

          <Separator />

          {/* Version History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Version History</h4>
            </div>
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <div className="flex items-center gap-2">
                    {v.version === document.version && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                    <span>Version {v.version}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {v.createdAt ? moment(v.createdAt).format("MMM D, YYYY") : ""}{" "}
                    {v.created_by?.name ? `by ${v.created_by.name}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Update row actions to open the detail panel**

Replace `app/[locale]/(routes)/documents/components/data-table-row-actions.tsx`:

```tsx
"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { documentSchema, DocumentRow } from "../data/schema";
import { useRouter } from "next/navigation";
import { DocumentDetailPanel } from "./document-detail-panel";
import DocumentViewModal from "@/components/modals/document-view-modal";
import AlertModal from "@/components/modals/alert-modal";
import { useState } from "react";
import { toast } from "sonner";
import { deleteDocument } from "@/actions/documents/delete-document";

interface DataTableRowActionsProps {
  row: Row<DocumentRow>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const [openDelete, setOpenDelete] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const document = documentSchema.parse(row.original);

  const onDelete = async () => {
    try {
      setLoading(true);
      await deleteDocument(document.id);
      router.refresh();
      toast.success("Document has been deleted");
    } catch {
      toast.error("Something went wrong while deleting document.");
    } finally {
      setLoading(false);
      setOpenDelete(false);
    }
  };

  return (
    <>
      {openView && (
        <DocumentViewModal
          isOpen={openView}
          onClose={() => setOpenView(false)}
          loading={loading}
          document={document}
        />
      )}
      {openDelete && (
        <AlertModal
          isOpen={openDelete}
          onClose={() => setOpenDelete(false)}
          onConfirm={onDelete}
          loading={loading}
        />
      )}
      <DocumentDetailPanel
        document={document}
        open={openDetail}
        onClose={() => setOpenDetail(false)}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => setOpenDetail(true)}>
            Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenView(true)}>
            View File
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenDelete(true)}>
            Delete
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
pnpm tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/(routes)/documents/components/document-detail-panel.tsx app/[locale]/(routes)/documents/components/data-table-row-actions.tsx
git commit -m "feat(documents): add document detail panel with summary, metadata, and version history"
```

---

## Task 13: Account Detail — Documents Section with Upload

**Files:**
- Modify: `app/[locale]/(routes)/crm/components/DocumentsView.tsx`
- Modify: `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx`

- [ ] **Step 1: Update DocumentsView to accept accountId and show upload button**

Replace `app/[locale]/(routes)/crm/components/DocumentsView.tsx`:

```tsx
"use client";

import { columns } from "@/app/[locale]/(routes)/documents/components/columns";
import { DocumentsDataTable } from "@/app/[locale]/(routes)/documents/components/data-table";
import { BulkUploadModal } from "@/app/[locale]/(routes)/documents/components/bulk-upload-modal";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

interface DocumentsViewProps {
  data: any;
  accountId?: string;
}

const DocumentsView = ({ data, accountId }: DocumentsViewProps) => {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/documents")}
              className="cursor-pointer"
            >
              Documents
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            {accountId && <BulkUploadModal accountId={accountId} />}
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          "No assigned documents found"
        ) : (
          <DocumentsDataTable data={data} columns={columns} />
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentsView;
```

- [ ] **Step 2: Pass accountId to DocumentsView from the account detail page**

In `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx`, update line 85:

Change:
```tsx
<DocumentsView data={documents} />
```

To:
```tsx
<DocumentsView data={documents} accountId={accountId} />
```

- [ ] **Step 3: Verify compilation**

```bash
pnpm tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/(routes)/crm/components/DocumentsView.tsx app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx
git commit -m "feat(documents): add upload-from-account-context with auto-linking"
```

---

## Task 14: Update Search UI for Documents

**Files:**
- Modify: `app/[locale]/(routes)/fulltext-search/components/SearchResult.tsx`

- [ ] **Step 1: Add documents to the search results display**

The `SearchResult.tsx` component iterates over `ENTITY_ORDER` to display results. Add `"documents"` to the entity order and labels.

Find the `ENTITY_ORDER` array and add `"documents"`:

```tsx
const ENTITY_ORDER = ["accounts", "contacts", "leads", "opportunities", "projects", "tasks", "users", "documents"] as const;
```

Find the `ENTITY_LABELS` object and add:

```tsx
documents: "Documents",
```

The component should then automatically render the documents section using the existing `EntityResultSection` pattern.

- [ ] **Step 2: Verify compilation**

```bash
pnpm tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(routes)/fulltext-search/components/SearchResult.tsx
git commit -m "feat(search): display document results in unified search UI"
```

---

## Task 15: Update Presigned URL Route for Unified Upload

**Files:**
- Modify: `app/api/upload/presigned-url/route.ts`

- [ ] **Step 1: Ensure the presigned URL route accepts all needed MIME types**

Read the current route. It already accepts PDF, images, doc, docx, and text/plain. Verify the `ALLOWED_MIME_TYPES` array includes all of these:

```ts
"application/pdf",
"image/jpeg",
"image/png",
"image/gif",
"image/webp",
"application/msword",
"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
"text/plain",
```

If all are present, no changes needed. If `text/plain` is missing, add it. The bulk upload modal sends the file's actual MIME type, so the route just needs to allow all the types we support.

- [ ] **Step 2: Commit (if changes were needed)**

```bash
git add app/api/upload/presigned-url/route.ts
git commit -m "fix(upload): ensure all document MIME types are allowed in presigned URL route"
```

---

## Task 16: Add Document Search to Command Palette (⌘J)

**Files:**
- Modify: `components/CommandComponent.tsx`

The app already has a command palette (`CommandComponent.tsx`) triggered by ⌘J using cmdk/`CommandDialog`. Currently it only has navigation shortcuts (dashboard, profile, logout). We'll add live document search.

- [ ] **Step 1: Add search integration to CommandComponent**

Create a new server action `actions/documents/search-documents.ts` for document-specific semantic search:

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import {
  generateEmbedding,
  toVectorLiteral,
} from "@/inngest/lib/embedding-utils";

export interface DocumentSearchResult {
  id: string;
  name: string;
  summary: string | null;
  systemType: string | null;
  accountName: string | null;
}

export async function searchDocuments(
  query: string
): Promise<DocumentSearchResult[]> {
  const session = await getSession();
  if (!session) return [];
  if (!query || query.trim().length < 2) return [];

  // Keyword search
  const kwResults = await prismadb.documents.findMany({
    where: {
      parent_document_id: null,
      OR: [
        { document_name: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
    select: {
      id: true,
      document_name: true,
      summary: true,
      document_system_type: true,
      accounts: { select: { account: { select: { name: true } } }, take: 1 },
    },
  });

  // Semantic search
  let semResults: { id: string; similarity: number }[] = [];
  try {
    const embedding = await generateEmbedding(query.trim());
    const vec = toVectorLiteral(embedding);

    semResults = await prismadb.$queryRaw<{ id: string; similarity: number }[]>`
      SELECT d.id, 1 - (e.embedding <=> ${vec}::vector) AS similarity
      FROM "Documents" d
      LEFT JOIN "crm_Embeddings_Documents" e ON e.document_id = d.id
      WHERE e.embedding IS NOT NULL AND d."parent_document_id" IS NULL
        AND 1 - (e.embedding <=> ${vec}::vector) > 0.7
      ORDER BY e.embedding <=> ${vec}::vector
      LIMIT 5`;
  } catch {
    // Fall back to keyword-only
  }

  // Merge: keyword results first, then semantic-only results
  const kwIds = new Set(kwResults.map((r) => r.id));
  const semOnlyIds = semResults.filter((r) => !kwIds.has(r.id)).map((r) => r.id);

  let extraDocs: typeof kwResults = [];
  if (semOnlyIds.length > 0) {
    extraDocs = await prismadb.documents.findMany({
      where: { id: { in: semOnlyIds }, parent_document_id: null },
      select: {
        id: true,
        document_name: true,
        summary: true,
        document_system_type: true,
        accounts: { select: { account: { select: { name: true } } }, take: 1 },
      },
    });
  }

  return [...kwResults, ...extraDocs].map((r) => ({
    id: r.id,
    name: r.document_name,
    summary: r.summary,
    systemType: r.document_system_type,
    accountName: r.accounts?.[0]?.account?.name ?? null,
  }));
}
```

- [ ] **Step 2: Update CommandComponent to include document search results**

In `components/CommandComponent.tsx`, add a debounced search that calls `searchDocuments` when the user types. Add a `CommandGroup` for documents:

```tsx
// Add imports at top:
import { searchDocuments, DocumentSearchResult } from "@/actions/documents/search-documents";
import { FileText } from "lucide-react";

// Inside the component, add state:
const [searchQuery, setSearchQuery] = React.useState("");
const [docResults, setDocResults] = React.useState<DocumentSearchResult[]>([]);

// Add debounced search effect:
React.useEffect(() => {
  if (!searchQuery || searchQuery.length < 2) {
    setDocResults([]);
    return;
  }
  const timeout = setTimeout(() => {
    searchDocuments(searchQuery).then(setDocResults).catch(() => {});
  }, 300);
  return () => clearTimeout(timeout);
}, [searchQuery]);

// Update CommandInput to capture value:
<CommandInput
  placeholder={t("placeholder")}
  value={searchQuery}
  onValueChange={setSearchQuery}
/>

// Add before the Settings CommandGroup:
{docResults.length > 0 && (
  <CommandGroup heading="Documents">
    {docResults.map((doc) => (
      <CommandItem
        key={doc.id}
        onSelect={() => {
          router.push(`/documents?highlight=${doc.id}`);
          setOpen(false);
        }}
      >
        <FileText className="mr-2 h-4 w-4" />
        <div className="flex flex-col">
          <span>{doc.name}</span>
          {doc.summary && (
            <span className="text-xs text-muted-foreground line-clamp-1">
              {doc.summary}
            </span>
          )}
        </div>
      </CommandItem>
    ))}
  </CommandGroup>
)}
<CommandSeparator />
```

- [ ] **Step 3: Commit**

```bash
git add actions/documents/search-documents.ts components/CommandComponent.tsx
git commit -m "feat(search): add document search to ⌘J command palette"
```

---

## Task 17: Content Search Toggle on Documents Page

**Files:**
- Modify: `app/[locale]/(routes)/documents/components/data-table-toolbar.tsx`

- [ ] **Step 1: Add search mode toggle and content search to the toolbar**

The toolbar currently has a text filter on `document_name`. Add a toggle between "Name" and "Content" search. Content search calls `searchDocuments` server action and replaces the table data with results.

Update the toolbar to include:

```tsx
// Add imports:
import { searchDocuments } from "@/actions/documents/search-documents";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Add state for search mode and results:
const [searchMode, setSearchMode] = useState<"name" | "content">("name");
const [contentQuery, setContentQuery] = useState("");

// In the toolbar JSX, replace the existing search input with:
<div className="flex items-center gap-2">
  <ToggleGroup
    type="single"
    value={searchMode}
    onValueChange={(v) => v && setSearchMode(v as "name" | "content")}
    size="sm"
  >
    <ToggleGroupItem value="name">Name</ToggleGroupItem>
    <ToggleGroupItem value="content">Content</ToggleGroupItem>
  </ToggleGroup>

  {searchMode === "name" ? (
    <Input
      placeholder="Filter by name..."
      value={(table.getColumn("document_name")?.getFilterValue() as string) ?? ""}
      onChange={(event) =>
        table.getColumn("document_name")?.setFilterValue(event.target.value)
      }
      className="h-8 w-[200px]"
    />
  ) : (
    <Input
      placeholder="Search document content..."
      value={contentQuery}
      onChange={(event) => setContentQuery(event.target.value)}
      className="h-8 w-[200px]"
    />
  )}
</div>
```

Note: Content search requires fetching matching document IDs and filtering the table client-side by matching IDs, or making the table server-driven. For simplicity in this iteration, content search from the toolbar can use the `document_name` + `summary` columns (which are already in the table data) via a custom global filter function. This gives "search in summaries" without a network call:

```tsx
// When in content mode, set a global filter that searches across name + summary:
{searchMode === "content" && (
  <Input
    placeholder="Search in names & summaries..."
    value={table.getState().globalFilter ?? ""}
    onChange={(event) => table.setGlobalFilter(event.target.value)}
    className="h-8 w-[200px]"
  />
)}
```

Full semantic vector search from the documents page uses the same `searchDocuments` action from Task 16, but that's best done as a server-side query parameter approach in a follow-up. For now, the global filter on name + summary provides useful content search.

- [ ] **Step 2: Enable globalFilter in data-table.tsx**

In `data-table.tsx`, add `getGlobalFilteredRowModel` and a global filter function:

```tsx
import { getGlobalFilteredRowModel } from "@tanstack/react-table";

// Add to useReactTable config:
globalFilterFn: (row, columnId, filterValue) => {
  const name = String(row.getValue("document_name") ?? "").toLowerCase();
  const summary = String(row.original.summary ?? "").toLowerCase();
  const search = String(filterValue).toLowerCase();
  return name.includes(search) || summary.includes(search);
},
getGlobalFilteredRowModel: getGlobalFilteredRowModel(),
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(routes)/documents/components/data-table-toolbar.tsx app/[locale]/(routes)/documents/components/data-table.tsx
git commit -m "feat(documents): add name/content search toggle on documents page"
```

---

## Task 18: Final Integration Verification

- [ ] **Step 1: Run type check**

```bash
pnpm tsc --noEmit --pretty
```

Expected: No errors.

- [ ] **Step 2: Run Prisma generate to ensure client is up to date**

```bash
pnpm prisma generate
```

Expected: Success.

- [ ] **Step 3: Run the dev server and verify no runtime errors**

```bash
pnpm dev
```

Navigate to `/documents` — should see single upload button, new columns, filters. Navigate to an account detail page — should see upload button in documents section.

- [ ] **Step 4: Test upload flow end-to-end**

1. Upload a PDF via the new bulk upload modal
2. Verify document appears in the table with "Pending" status
3. Check Inngest dashboard — should see `document/uploaded` event trigger both `document-enrich` and `document-generate-thumbnail` functions
4. Wait for enrichment to complete — status should change to "Ready", summary should appear
5. Test search — search for content from the uploaded PDF in the global search

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(documents): complete documents module refactor with bulk upload, enrichment, and search"
```
