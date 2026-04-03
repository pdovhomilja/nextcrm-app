# Documents Module Refactor — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Overview

Refactor the `/documents` route from 3 separate upload buttons with manual type selection to a unified bulk-upload experience with automatic classification, AI enrichment, vector search, and document versioning.

## Decisions Summary

| Decision | Choice |
|---|---|
| Auto-classification | Hybrid: MIME-based instant + AI reclassify async |
| Enrichment | Text extraction + vector embeddings + AI summary |
| Account linking | Upload from Account context + manual linking from documents list |
| Search | Global header search (⌘K) + dedicated /documents search with filters |
| CRM module scope | Accounts only (other modules deferred) |
| Extras | Versioning, thumbnails, processing status, duplicate detection, batch actions |
| Processing backend | Inngest step functions (hybrid orchestrator pattern) |

## 1. Data Model Changes

### Modified: `crm_Documents`

New fields added to the existing model:

| Field | Type | Purpose |
|---|---|---|
| `content_text` | `Text` (nullable) | Extracted raw text from PDF/DOCX |
| `summary` | `Text` (nullable) | AI-generated 2-3 sentence summary |
| `content_hash` | `String` (nullable) | SHA-256 of file bytes for duplicate detection |
| `thumbnail_url` | `String` (nullable) | MinIO URL of generated thumbnail |
| `processing_status` | Enum: `PENDING`, `PROCESSING`, `READY`, `FAILED` | Enrichment pipeline status |
| `processing_error` | `String` (nullable) | Error message if enrichment failed |
| `version` | `Int` (default 1) | Document version number |
| `parent_document_id` | UUID (nullable, self-ref FK) | Points to original document for versioning |
| `embedding` | Vector (pgvector) | Via raw SQL — pgvector extension |

### New: `crm_Document_Chunks`

For documents exceeding ~8000 tokens, text is split into overlapping chunks with individual embeddings.

| Field | Type |
|---|---|
| `id` | UUID (PK) |
| `document_id` | UUID (FK → crm_Documents, cascade delete) |
| `chunk_index` | Int |
| `chunk_text` | Text |
| `embedding` | Vector (pgvector) |

### New Enum: `DocumentProcessingStatus`

Values: `PENDING`, `PROCESSING`, `READY`, `FAILED`

### Versioning Model

- Re-uploading creates a new `crm_Documents` record with `parent_document_id` pointing to the original and `version` incremented.
- The original record's `document_file_url` is updated to point to the latest version so links always resolve to current.
- Old version files remain in MinIO, accessible via version history.
- New version re-triggers the enrichment pipeline.

## 2. Upload Flow

### Single Bulk Upload Button

Replace the current 3 buttons (Upload PDF, Upload Images, Upload Other) with one "Upload Documents" button that opens a dropzone modal.

**Dropzone accepts:** PDF, DOCX, DOC, TXT, images (PNG, JPG, GIF, WEBP) — up to 64MB per file.

### Upload Sequence (per file)

1. Compute SHA-256 hash client-side via Web Crypto API
2. Check for duplicates: `POST /api/documents/check-duplicate` with hash
3. If duplicate found: show warning with "Upload anyway" or "Skip"
4. Request presigned URL from existing `/api/upload/presigned-url`
5. Upload directly to MinIO via presigned URL
6. Create document record via `createDocument` server action with `processing_status: PENDING`
7. Instant MIME-based classification:
   - `application/pdf` → filename heuristics (invoice/receipt → RECEIPT, contract → CONTRACT, offer/quote → OFFER, else OTHER)
   - `image/*` → OTHER
   - `.doc/.docx/.txt` → OTHER
8. Emit Inngest event `document/uploaded` with document ID

### Upload from Account Context

When on an Account detail page, the same upload component is available. Documents uploaded there are automatically linked via `DocumentsToAccounts` junction table.

## 3. Enrichment Pipeline (Inngest)

### Architecture: Hybrid Orchestrator

One main Inngest function orchestrates sequential steps with individual retry. One separate parallel function handles thumbnails.

### Main Function: `document/enrich`

Triggered by: `document/uploaded`

```
Step 1: extract-text
  - PDF → pdf-parse library
  - DOCX → mammoth library
  - TXT → read directly from MinIO
  - Images → skip text extraction
  - Save content_text to DB
  - Set processing_status = PROCESSING

Step 2: generate-embedding
  - If content_text is short (≤8000 tokens): generate single embedding, store on document
  - If content_text is long (>8000 tokens): chunk with ~512 tokens, 50 token overlap
    - Store chunks in crm_Document_Chunks with individual embeddings
  - Embedding API: OpenAI or compatible embeddings endpoint

Step 3: generate-summary
  - Send content_text to LLM
  - Prompt: "Summarize this document in 2-3 sentences"
  - Save summary to document record

Step 4: ai-classify
  - Send content_text + summary to LLM
  - Prompt: "Classify as RECEIPT, CONTRACT, OFFER, or OTHER"
  - Update document_system_type (overriding MIME-based guess)
  - Set processing_status = READY
```

### Parallel Function: `document/generate-thumbnail`

Triggered by: `document/uploaded`

```
  - PDF → render first page as PNG
  - Images → resize to thumbnail (200x200)
  - DOCX → generic document icon or simple preview
  - Upload thumbnail to MinIO at thumbnails/{docId}.png
  - Save thumbnail_url to document record
```

### Error Handling

- Each step retries 3 times (Inngest default)
- On final failure: set `processing_status = FAILED`, save error to `processing_error`
- User can trigger manual re-processing from the UI

## 4. Search

### Global Header Search (⌘K)

- Search input in the app header, accessible via ⌘K shortcut
- Debounced input hits `POST /api/search/global`
- Searches across: Accounts (by name), Contacts (by name), Documents (by semantic similarity)
- Document search flow:
  1. Generate embedding for query string
  2. Cosine similarity against `crm_Document_Chunks` embeddings (and `crm_Documents.embedding` for short docs)
  3. Return top 5 documents with: name, summary snippet, similarity score, linked Account
- Results in dropdown grouped by module: Accounts | Contacts | Documents
- Clicking a document navigates to `/documents` with that document selected

### Dedicated /documents Page Search

- Enhanced search bar replaces current name-only filter
- Toggle between "Name search" (existing) and "Content search" (semantic)
- Content search uses same vector similarity query
- Filters alongside search:
  - Document type (RECEIPT, CONTRACT, OFFER, OTHER)
  - Processing status (READY, PROCESSING, FAILED)
  - Linked Account (searchable dropdown)
  - Date range
  - File type (PDF, image, DOCX, etc.)
- Relevance score column shown during content search
- Similarity threshold: cosine similarity > 0.7 (configurable)

## 5. UI Changes

All UI changes use existing app component library (shadcn/ui, existing data table patterns, current theme).

### /documents Page

- **Single "Upload Documents" button** replaces the 3 upload buttons
- **Enhanced toolbar:** search bar with name/content toggle, filter dropdowns (Type, Status, Account, Date)
- **Data table enhancements:**
  - Checkbox column for batch selection
  - Thumbnail column (small file-type badge or generated thumbnail)
  - Name column shows AI summary as subtitle when available; "Generating summary..." for processing docs
  - Type column with colored badges (CONTRACT, RECEIPT, OFFER, OTHER; PENDING while processing)
  - Account column showing linked Account name (clickable)
  - Processing status column with badges: Ready (green), Processing (yellow), Failed (red)
  - Existing columns: date, actions
- **Batch action bar** (appears when rows selected):
  - Link to Account
  - Change Type
  - Delete (with confirmation)

### Upload Modal

- Full-screen dropzone area (drag & drop or click to browse)
- Accepted types listed below dropzone
- Upload queue showing per-file status: Uploaded, Uploading (with %), Duplicate warning, Queued
- Duplicate warning shows inline: "Upload anyway" | "Skip"

### Document Detail / Preview

- Existing view/preview modal extended with:
  - **Summary section** showing AI-generated summary
  - **Version history** section with list of versions and "Upload New Version" button
  - **Linked Account** with option to link/unlink
  - **Processing status** with "Retry" button if failed
  - **Metadata:** file type, size, hash, created by, dates

### Account Detail Page

- New **"Documents" tab/section** on the Account detail view
- Shows documents linked to this Account (filtered data table, same component)
- Has its own "Upload Documents" button — auto-links to current Account
- Can unlink documents without deleting them

## 6. API Routes

### New Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/documents/check-duplicate` | Check content_hash for duplicate detection |
| POST | `/api/search/global` | Global cross-module search (accounts, contacts, documents) |

### Modified Endpoints

| Method | Path | Change |
|---|---|---|
| POST | `/api/upload/presigned-url` | Accept all supported MIME types in a single upload flow |

### New/Modified Server Actions

| Action | Change |
|---|---|
| `createDocument` | Accept `content_hash`, set `processing_status: PENDING`, emit Inngest event |
| `createDocumentVersion` | New — creates versioned record, updates parent's URL, triggers enrichment |
| `bulkLinkToAccount` | New — links multiple documents to an Account |
| `bulkChangeType` | New — changes document_system_type for multiple documents |
| `bulkDeleteDocuments` | New — deletes multiple documents from DB + MinIO |
| `retryEnrichment` | New — re-emits `document/uploaded` event for failed documents |
| `getDocumentVersions` | New — returns version history for a document |
| `unlinkFromAccount` | New — removes junction record without deleting document |

## 7. Dependencies

### New packages needed

| Package | Purpose |
|---|---|
| `pdf-parse` (or `pdf2json`) | PDF text extraction |
| `mammoth` | DOCX to text conversion |
| `pdfjs-dist` | PDF first-page rendering for thumbnails (with canvas) |
| `sharp` | Image thumbnail generation/resizing |

### Existing infrastructure used

- **MinIO** — file storage (already configured)
- **Inngest** — async job processing (already configured)
- **pgvector** — vector embeddings (Supabase extension, may need enabling)
- **Prisma** — ORM (raw SQL for vector operations)
- **shadcn/ui** — UI components
- **TanStack Table** — data table

## 8. Out of Scope

- Linking documents to Contacts, Opportunities, Tasks, Leads (junction tables exist, UI deferred)
- Entity extraction from documents (dates, amounts, company names)
- OCR for scanned PDFs or images
- Document collaboration / commenting
- Access control / permissions per document
- Full-text search (using vector search instead)
