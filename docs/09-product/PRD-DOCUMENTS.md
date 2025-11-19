# PRD: Document Management & Storage

**Version:** 1.0
**Status:** P1 Production Feature
**Owner:** Product Team
**Last Updated:** 2025-11-17
**Related PRDs:** [PRD-CRM-ACCOUNTS.md](./PRD-CRM-ACCOUNTS.md), [PRD-INVOICES.md](./PRD-INVOICES.md), [PRD-PROJECTS.md](./PRD-PROJECTS.md)

---

## 1. Executive Summary

The Document Management module provides secure file storage, versioning, full-text search, sharing with expiration, and access control for all CRM-related documents. Integrated with UploadThing and DigitalOcean Spaces (S3-compatible), it eliminates email attachments and provides a single source of truth for contracts, proposals, presentations, and customer files.

**Key Value Proposition:**
- **Unified Document Hub:** Store contracts, proposals, NDAs, presentations in one place, linked to accounts, opportunities, and contacts
- **Smart Search:** Full-text search across file names, descriptions, and content (PDFs, Word docs, Excel) finds documents in <500ms
- **Secure Sharing:** Share documents with expiration dates and password protection, track who viewed and when
- **Version Control:** Automatic versioning on file replacement prevents accidental overwrites

**Target Release:** Q2 2025

---

## 2. Problem Statement

### Current Situation
Sales and delivery teams store documents in email attachments, personal drives, Dropbox folders, and Slack messages. When someone asks "Where's the Acme Corp contract?", teams spend 10-15 minutes searching email threads. Version confusion leads to sending outdated proposals. Compliance teams can't audit who accessed sensitive documents.

### Why This Matters
Disorganized document storage creates operational risk:
- **Lost Deals:** 23% of sales cycles delayed due to missing or outdated documents (Salesforce)
- **Compliance Failures:** Cannot prove who accessed sensitive documents for SOC 2/GDPR audits
- **Version Errors:** 30% of teams have sent wrong document version to customers
- **Time Waste:** Average employee spends 2.5 hours per week searching for documents

### Success Vision
A sales rep preparing for Acme Corp call searches "Acme proposal" in NextCRM. Finds current proposal (v3) uploaded 2 days ago, sees version history showing v1 and v2. Downloads v3, customer logo already added by designer. Shares document link with 7-day expiration for customer review. Customer clicks link, views in browser, downloads. System logs view timestamp. At renewal, rep searches "Acme contract" and finds executed contract with signatures from 12 months ago. Zero email searching, zero version confusion, complete audit trail.

---

## 3. Target Users/Personas

### Primary Persona: Sales Rep
- **Role:** Manages deals and customer communications
- **Goals:**
  - Store proposals, presentations, pricing sheets linked to accounts
  - Share documents with customers securely (no email attachments)
  - Find past proposals when creating new ones (templates)
  - See document access history (did customer open proposal?)
- **Pain Points:**
  - Cannot find proposal sent 3 months ago (lost in email)
  - Accidentally sent old pricing sheet (version confusion)
  - Customer complains they never received document (no proof of delivery)
- **Use Cases:**
  - Uploading proposal PDF to opportunity record
  - Sharing proposal link with customer (expires in 7 days)
  - Searching for "enterprise pricing" across all documents
  - Cloning last year's proposal as template for new deal

### Secondary Persona: Delivery Team / Project Manager
- **Role:** Executes projects, shares deliverables with customers
- **Goals:**
  - Upload project deliverables (reports, designs, code) linked to projects
  - Organize documents by project phase (discovery, implementation, testing)
  - Share document folders with customers for review
  - Ensure only current versions are accessible
- **Pain Points:**
  - Customer downloads outdated deliverable from shared drive
  - Cannot track which team members accessed sensitive customer data
  - No approval workflow for customer-facing documents
- **Use Cases:**
  - Uploading project deliverables to project board
  - Creating document folder structure (Discovery / Implementation / Testing)
  - Granting customer temporary access to implementation docs
  - Replacing deliverable with updated version (automatic versioning)

### Tertiary Persona: Compliance Officer
- **Role:** Ensures document security and audit compliance
- **Goals:**
  - Audit who accessed sensitive documents (contracts, financial data)
  - Enforce document retention policies (delete after X years)
  - Verify documents encrypted at rest and in transit
  - Export document access logs for SOC 2 audits
- **Pain Points:**
  - No audit trail showing who viewed/downloaded documents
  - Cannot prove documents stored securely (encryption)
  - Employees sharing documents via insecure channels (personal email)
- **Use Cases:**
  - Reviewing document access logs for security audit
  - Exporting all document operations for quarter (CSV)
  - Enforcing 7-year retention for contracts
  - Disabling public sharing for confidential documents

---

## 4. Functional Requirements

### 4.1 Core Features

#### Feature 1: Document Upload & Storage
**Description:** Upload files via drag-and-drop or file picker. Store in DigitalOcean Spaces (S3-compatible) with metadata, tags, and CRM entity linking.

**User Stories:**
- As any user, I want to upload documents via drag-and-drop so it's fast
- As any user, I want to link documents to accounts, contacts, opportunities so I maintain context
- As any user, I want to add tags and descriptions so documents are searchable
- As any user, I want to see file size and type before uploading so I know limits

**Specifications:**
- **Documents Model:**
  - Core fields: `id`, `organizationId`, `document_name`, `description`, `document_type` (foreign key to Documents_Types), `document_system_type` (INVOICE, RECEIPT, CONTRACT, OFFER, OTHER)
  - File storage: `document_file_url` (DigitalOcean Spaces), `document_file_mimeType`, `size` (bytes), `key` (S3 key)
  - CRM linkage arrays: `accountsIDs`, `leadsIDs`, `contactsIDs`, `opportunityIDs`, `invoiceIDs`, `tasksIDs` (many-to-many relations)
  - Metadata: `tags` (JSON array), `favourite` (boolean), `visibility` (public, private, shared), `status` (active, archived)
  - Audit fields: `createdAt`, `createdBy`, `updatedAt`, `assigned_user` (owner)

- **Upload Methods:**
  1. **Drag-and-Drop Zone:** On Documents page or entity detail pages (accounts, opportunities)
  2. **File Picker:** Click "Upload" button → OS file picker → Select multiple files
  3. **UploadThing Integration:** Use UploadThing React components for resumable uploads (large files >100MB)

- **Upload Workflow:**
  1. User drops file or selects from picker
  2. Client-side validation:
     - File size: Max 500MB per file (configurable per plan)
     - File type: All types allowed (warn for executables: .exe, .bat, .sh)
  3. Upload to DigitalOcean Spaces:
     - Bucket: `nextcrm-documents/[organizationId]/[year]/[month]/[filename]`
     - Generate unique key (UUID + original filename)
     - Set public-read ACL (or signed URLs for private docs)
  4. Create Documents record in database:
     - Store Spaces URL, file size, MIME type
     - Link to current entity (if uploaded from account page → accountsIDs = [accountId])
  5. Show success toast with document name + size

- **Supported File Types:**
  - Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, RTF
  - Images: JPG, PNG, GIF, SVG, WEBP
  - Archives: ZIP, RAR, TAR, GZ
  - Media: MP4, MOV, MP3, WAV (for videos, audio)
  - Other: CSV, JSON, XML, MD (markdown)

- **Storage Quotas (Per Plan):**
  - FREE: 1 GB total, 100 documents max
  - PRO: 100 GB total, 10,000 documents max
  - ENTERPRISE: Unlimited storage, unlimited documents

**UI/UX Considerations:**
- Drag-and-drop zone with visual feedback (dashed border highlights on hover)
- Upload progress bar with percentage + file size uploaded
- Thumbnail preview for images and PDFs (first page)
- File type icons (PDF icon, Word icon, Excel icon, etc.)
- Quick actions: Download, Share, Delete, View details

---

#### Feature 2: Document Viewer & Preview
**Description:** In-browser preview for common file types (PDF, images, Office docs) using react-doc-viewer. No download required for quick viewing.

**User Stories:**
- As any user, I want to preview PDFs without downloading so it's faster
- As any user, I want to view images inline so I don't open external apps
- As any user, I want to preview Office docs (Word, Excel, PowerPoint) so I verify before downloading
- As any user, I want to zoom and navigate multi-page PDFs

**Specifications:**
- **Document Viewer Component:**
  - Library: `react-doc-viewer` or `react-pdf` for PDFs
  - Supported preview formats:
    - PDF: Rendered page-by-page with zoom controls
    - Images: Full-size display with zoom/pan
    - Office docs: Convert to PDF via LibreOffice (server-side) or use Google Docs Viewer iframe
    - Text files: Syntax-highlighted code viewer (for MD, JSON, CSV)
  - Unsupported formats: Show "Download to view" message

- **Viewer UI:**
  - Modal overlay when clicking document card
  - Header: Document name, download button, close button
  - Body: Rendered document (scrollable)
  - Footer: Page navigation (for PDFs), zoom controls (25%, 50%, 100%, 150%, 200%)
  - Keyboard shortcuts: Arrow keys for pages, Escape to close, Cmd+/-   for zoom

- **Performance:**
  - Lazy loading: Only render current page + 1 page ahead/behind
  - CDN delivery: Serve files from DigitalOcean Spaces CDN (low latency)
  - Caching: Cache rendered pages in browser (IndexedDB)

**UI/UX Considerations:**
- Loading spinner while rendering document
- "Download original" button for lossless file
- Print button (triggers browser print dialog)
- Fullscreen mode toggle

---

#### Feature 3: Full-Text Search & Filtering
**Description:** Search documents by name, description, content (PDF text extraction), tags. Filter by document type, linked entity, date range, owner.

**User Stories:**
- As any user, I want to search document names so I find files quickly
- As any user, I want to search PDF content so I find contracts with specific clauses
- As any user, I want to filter by account so I see only Acme Corp documents
- As any user, I want to filter by date range so I find recent uploads

**Specifications:**
- **Search Implementation:**
  - **Name/Description Search:** Full-text search on `document_name` and `description` fields (MongoDB text index)
  - **Content Search (PDF):** Extract text from PDFs on upload using `pdf-parse` library, store in `searchable_content` field (text index)
  - **Tag Search:** Search JSON array of tags using MongoDB `$in` operator
  - **Search API:** `GET /api/documents?q=[query]` returns matching documents in <500ms

- **Search Bar:**
  - Global search bar on Documents page (always visible)
  - Autocomplete suggestions (show top 5 results as user types)
  - Search history dropdown (recent searches cached in browser)

- **Filters Panel:**
  - Document Type: Dropdown (Contract, Invoice, Proposal, Receipt, Other)
  - Linked Entity: Typeahead search (Accounts, Contacts, Opportunities)
  - Upload Date: Date range picker (Last 7 days, Last 30 days, Last year, Custom)
  - Owner: User dropdown (Created by)
  - Tags: Multi-select with autocomplete
  - File Type: Checkboxes (PDF, Word, Excel, Image, Other)
  - Size: Range slider (0-500MB)

- **Filter Combinations:**
  - All filters combinable (AND logic)
  - Active filters shown as chips with one-click removal
  - "Clear all filters" button

- **Search Results:**
  - Table view: Document name, Type, Linked to, Owner, Date, Size
  - Grid view: Thumbnails with document name overlay
  - Sort by: Relevance (default), Date (newest/oldest), Name (A-Z), Size

**UI/UX Considerations:**
- Instant search results (no "Search" button, triggers on typing with 300ms debounce)
- Highlight search terms in results (bold matching words)
- Empty state: "No documents found. Try different keywords or clear filters."
- Search term suggestions: "Did you mean 'contract'?" for typos

---

#### Feature 4: Document Sharing with Expiration
**Description:** Generate shareable links with expiration dates, password protection, and access tracking. Share documents externally without requiring NextCRM login.

**User Stories:**
- As any user, I want to share document link with customer so they view without login
- As any user, I want to set link expiration (7 days) so access is time-limited
- As any user, I want to password-protect links so only intended recipients access
- As any user, I want to see who viewed shared links so I track customer engagement

**Specifications:**
- **Document Sharing Model (New Model):**
  - `id`: ObjectId
  - `documentId`: Foreign key to Documents
  - `shareToken`: Unique UUID for share link
  - `createdBy`: User ObjectId (who created share link)
  - `expiresAt`: DateTime (default: 7 days from creation)
  - `password`: String (hashed, nullable - passwordless sharing allowed)
  - `maxViews`: Integer (nullable, e.g., "Can only view 3 times")
  - `viewCount`: Integer (tracks actual views)
  - `accessLog`: JSON array of view timestamps + IP addresses

- **Share Link Generation Workflow:**
  1. User clicks "Share" button on document card
  2. Modal opens:
     - Expiration: Dropdown (7 days, 30 days, 90 days, Never expire, Custom date)
     - Password: Optional text input (minimum 6 characters)
     - Max views: Optional number input (leave blank for unlimited)
  3. On submit:
     - Generate UUID token
     - Create DocumentShare record with expiration and password (hashed)
     - Generate share URL: `https://nextcrm.io/share/[token]`
     - Copy URL to clipboard
     - Show success toast: "Link copied! Expires on [date]"

- **Share Link Access Workflow:**
  1. External user visits `/share/[token]`
  2. System validates:
     - Token exists in database
     - Not expired (expiresAt > now())
     - View count < maxViews (if set)
  3. If password-protected: Show password input page
     - On submit: Hash password, compare with stored hash
     - If match: Allow access
     - If no match: Show error "Incorrect password" (3 attempts max, then lock for 1 hour)
  4. On successful access:
     - Increment viewCount
     - Append to accessLog: { timestamp: now(), ipAddress: req.ip }
     - Render document viewer (same as internal viewer)
     - Show banner: "This document was shared with you and expires on [date]"

- **Share Link Management:**
  - View active share links: Documents → [Document detail] → Sharing tab
  - Table shows: Share link, Created by, Expires at, Views (X / Max), Last viewed
  - Actions: Copy link, Revoke (delete share record immediately), Extend expiration

**UI/UX Considerations:**
- "Share" button prominent on document cards and detail page
- Copy link button with visual feedback (checkmark animation)
- Share link list shows expiration countdown ("Expires in 3 days")
- Expired links show red "Expired" badge (cannot be accessed)
- Revoked links show "Revoked" badge with revocation date

---

#### Feature 5: Version Control
**Description:** Automatic versioning when replacing document. View version history, compare versions, revert to previous version, download any version.

**User Stories:**
- As any user, I want to replace document without losing original so I can revert if needed
- As any user, I want to see version history so I understand document evolution
- As any user, I want to revert to previous version so I undo mistakes
- As any user, I want to download any version so I can compare changes

**Specifications:**
- **Document Versions Model (New Model):**
  - `id`: ObjectId
  - `documentId`: Foreign key to Documents (parent document)
  - `versionNumber`: Integer (1, 2, 3, ...)
  - `file_url`: String (DigitalOcean Spaces URL for this version)
  - `file_size`: Integer (bytes)
  - `uploadedBy`: User ObjectId
  - `uploadedAt`: DateTime
  - `comment`: String (optional, e.g., "Updated pricing section")

- **Version Creation Workflow:**
  1. User clicks "Replace Document" on document detail page
  2. File picker opens → User selects new file
  3. Backend:
     - Store current file as version:
       - Create DocumentVersion record with current file_url, size, etc.
       - Set versionNumber = (max existing version number + 1)
     - Upload new file to Spaces (new key)
     - Update Documents record: file_url = new URL, size = new size, updatedAt = now()
  4. Show success toast: "Document updated to version [number]"

- **Version History UI:**
  - Documents → [Document detail] → Versions tab
  - Timeline view showing all versions:
    - Version number (v1, v2, v3 - latest highlighted)
    - Uploaded by (avatar + name)
    - Upload timestamp
    - File size
    - Comment (if provided)
    - Actions: Download, Preview, Revert, Compare (future)
  - "Current version" badge on latest

- **Revert to Previous Version:**
  - Click "Revert" button on older version
  - Confirmation modal: "This will replace the current document with version [number]. Are you sure?"
  - On confirm:
     - Store current version (as new version)
     - Update Documents record: file_url = old version's URL
     - Create new DocumentVersion record for reverted-from version
     - Increment version number
  - Result: Old version becomes current, but history preserved

- **Version Retention Policy:**
  - FREE plan: Keep 3 versions per document (oldest deleted on 4th upload)
  - PRO plan: Keep 10 versions per document
  - ENTERPRISE: Unlimited versions

**UI/UX Considerations:**
- Version timeline with visual branching (like Git history)
- Hover tooltip showing file size difference ("34 KB larger than v2")
- "Revert" action color-coded (yellow/warning, not destructive red)
- Download any version without replacing current version

---

### 4.2 Secondary Features

#### Feature 6: Document Approval Workflow
**Description:** Request approval for documents before sharing with customers (e.g., proposals require manager approval).

#### Feature 7: Document Templates Library
**Description:** Save documents as templates for reuse (proposal templates, contract templates, NDA templates).

#### Feature 8: Bulk Operations
**Description:** Select multiple documents and perform bulk actions (delete, move, tag, share, archive).

#### Feature 9: Document Collaboration
**Description:** Real-time collaborative editing for supported file types (future: Google Docs-style editing).

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Upload Speed:** 10 MB/sec minimum (DigitalOcean Spaces CDN)
- **Search Response Time:** <500ms for 10K documents
- **Preview Load Time:** <2 seconds for PDFs (<10 pages)

### 5.2 Security
- **Encryption:** All files encrypted at rest (DigitalOcean Spaces encryption)
- **Access Control:** RBAC enforcement (Viewers read-only, Members upload/delete own, Admins manage all)
- **Audit Logging:** All operations logged (upload, download, share, delete)
- **Signed URLs:** Private documents use signed URLs (24-hour expiration)

### 5.3 Scalability
- **Storage:** Support organizations with 10 TB+ storage
- **Documents:** Support 100K+ documents per organization

### 5.4 Compliance
- **GDPR:** Documents deletable on request (permanent after 30-day grace)
- **SOC 2:** Audit logs retained for 7 years
- **Data Retention:** Enforce retention policies (auto-delete after X years)

---

## 6. Acceptance Criteria

### Core Functionality
- [ ] User can upload documents via drag-and-drop or file picker
- [ ] User can link documents to accounts, contacts, opportunities during upload
- [ ] User can add tags and description to documents
- [ ] User can preview PDFs inline (no download)
- [ ] User can preview images inline
- [ ] User can search documents by name, description, content (<500ms)
- [ ] User can filter documents by type, linked entity, date range, owner, tags
- [ ] User can share document link with expiration date (7 days default)
- [ ] User can password-protect share links
- [ ] External user can view shared document without login (before expiration)
- [ ] System tracks share link views (count, IP, timestamp)
- [ ] User can replace document (automatic versioning)
- [ ] User can view version history timeline
- [ ] User can download any version
- [ ] User can revert to previous version

### Security & Performance
- [ ] Files encrypted at rest (DigitalOcean Spaces)
- [ ] RBAC enforced (Viewers read-only, Members create/edit/delete own)
- [ ] Search returns results in <500ms for 10K documents
- [ ] PDF preview loads in <2 seconds

---

## 7. Success Metrics

| Metric Category | Metric | Target | Measurement Method |
|----------------|--------|--------|-------------------|
| **Adoption** | Documents uploaded per org | 100+ per month | Database count |
| **Search Usage** | % of users using search weekly | >60% | Search API analytics |
| **Sharing** | % of documents shared externally | >30% | (Shared docs / Total) * 100 |
| **Efficiency** | Time to find document | <30 seconds | User survey |
| **Storage** | Storage used per org (avg) | 5 GB+ | OrganizationUsage.storageBytes |

---

## 8. Dependencies

### Internal Dependencies
| Dependency | Type | Status | Impact if Delayed |
|-----------|------|--------|------------------|
| CRM Accounts Module | Hard | Complete | Cannot link documents to accounts |
| UploadThing Integration | Hard | Complete | Cannot upload files |
| DigitalOcean Spaces | Hard | Complete | Cannot store files |

### External Dependencies
| Dependency | Provider | SLA | Risk Level |
|-----------|----------|-----|-----------|
| DigitalOcean Spaces | DigitalOcean | 99.9% uptime | Low (S3-compatible, reliable) |
| UploadThing | UploadThing | 99.9% uptime | Medium (fallback: direct S3 upload) |

---

## 9. Out of Scope

- [ ] Real-time collaborative editing (Google Docs-style) (future: collaboration)
- [ ] OCR for scanned images (future: AI enhancement)
- [ ] Advanced PDF editing (annotations, forms) (future: PDF editor)
- [ ] Integration with Google Drive, Dropbox (future: sync)

---

## 10. Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|------|------------|--------|-------------------|-------|
| **Storage Costs:** Organizations upload 100 TB data | Low | High | Implement storage quotas per plan, alert at 80% usage | Finance Team |
| **PDF Text Extraction Failure:** Cannot search PDF content | Medium | Medium | Graceful degradation (search name/tags only), retry extraction | Backend Engineer |

---

## 11. Launch Requirements

### Pre-Launch Checklist
- [ ] DigitalOcean Spaces configured
- [ ] UploadThing API keys configured
- [ ] PDF text extraction tested
- [ ] Document sharing tested (expiration, password, views)
- [ ] Version control tested

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-17 | Product Team | Initial draft |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | TBD | | |
| Engineering Lead | TBD | | |
