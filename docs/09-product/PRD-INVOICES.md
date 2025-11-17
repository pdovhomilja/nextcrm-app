# PRD: Invoice Management & AI Document Extraction

**Version:** 1.0
**Status:** P1 Production Feature
**Owner:** Product Team
**Last Updated:** 2025-11-17
**Related PRDs:** [PRD-CRM-ACCOUNTS.md](./PRD-CRM-ACCOUNTS.md), [PRD-DOCUMENTS.md](./PRD-DOCUMENTS.md), [PRD-BILLING.md](./PRD-BILLING.md)

---

## 1. Executive Summary

The Invoice Management module transforms paper invoices and PDF documents into structured CRM data using Rossum AI extraction (95%+ accuracy). It provides invoice storage, payment tracking, recurring invoice support, PDF generation (<2 seconds), and seamless integration with accounting systems. This module eliminates manual data entry and enables complete financial visibility within the CRM.

**Key Value Proposition:**
- **AI-Powered Extraction:** Rossum AI automatically extracts 20+ invoice fields (amount, date, VAT, line items) from uploaded PDFs with 95%+ accuracy, eliminating 90% of manual data entry
- **Payment Tracking:** Track invoice status (draft, sent, paid, overdue) with automatic reminders and payment reconciliation
- **Recurring Invoices:** Auto-generate monthly/annual invoices for subscription customers, reducing billing overhead by 80%
- **PDF Generation:** Generate professional PDF invoices in <2 seconds using React-PDF templates

**Target Release:** Q2 2025

---

## 2. Problem Statement

### Current Situation
Businesses receive invoices from vendors via email, scan paper invoices, and manually enter data into spreadsheets or accounting software. Manual entry takes 5-10 minutes per invoice, with 15-20% error rate. Sales teams can't see which invoices are paid when managing accounts. Finance teams chase payments via separate tools without CRM context.

### Why This Matters
Manual invoice processing creates operational bottlenecks:
- **Time Waste:** Accounts payable teams spend 40-60 hours/month on manual invoice data entry (IOFM Benchmarking Report)
- **Cash Flow Issues:** 25% of late payments due to lost/unfiled invoices
- **Accounting Errors:** 18% of manually entered invoices contain errors requiring correction
- **Disconnected Data:** Sales teams can't see customer payment history when negotiating deals

### Success Vision
A finance manager receives vendor invoice PDF via email. They forward to invoices@nextcrm.io. Rossum AI extracts all fields within 30 seconds. Finance reviews extracted data in NextCRM, corrects single field (VAT number), saves. Invoice automatically linked to vendor account. Payment due date triggers reminder 3 days before. Customer pays, status updates to "Paid", sales rep sees payment in account timeline during renewal call. Zero manual data entry, 100% accuracy.

---

## 3. Target Users/Personas

### Primary Persona: Finance Manager / Accounts Payable
- **Role:** Processes vendor invoices and manages payments
- **Goals:**
  - Eliminate manual invoice data entry (current: 10 min per invoice)
  - Track payment due dates and avoid late fees
  - Export invoice data to accounting software (QuickBooks, Xero)
  - Reconcile payments against invoices without spreadsheets
- **Pain Points:**
  - Manually typing invoice data from PDFs into system
  - Invoices lost in email inboxes causing missed payments
  - Cannot see invoice history when vendor calls asking "Where's my payment?"
  - Exporting data to accounting software requires manual CSV creation
- **Use Cases:**
  - Receiving invoice PDF via email, uploading to NextCRM, AI extracts data
  - Reviewing extracted data for accuracy, correcting errors before saving
  - Setting payment due date reminder (automatic email 3 days before due)
  - Marking invoice as paid after bank transfer

### Secondary Persona: Account Executive (Sales Rep)
- **Role:** Manages customer relationships and deal negotiations
- **Goals:**
  - See customer payment history during renewal conversations
  - Identify customers with unpaid invoices before upsell outreach
  - Understand customer spending patterns (invoice amounts, frequency)
  - Create invoices for custom deals or professional services
- **Pain Points:**
  - No visibility into customer invoices (finance team uses separate system)
  - Can't answer customer question "When did I last pay?"
  - Cannot invoice customer without involving finance team
- **Use Cases:**
  - Pre-call research: Reviewing customer's invoice payment history
  - Renewal negotiation: Referencing total spend from past invoices
  - Creating custom service invoice for consulting engagement
  - Exporting invoice history for customer reconciliation request

### Tertiary Persona: Accounting Firm / Bookkeeper
- **Role:** External accountant handling multiple client books
- **Goals:**
  - Access client invoices from one centralized location
  - Export data to accounting software in standard format
  - Verify invoice accuracy (VAT calculation, tax compliance)
  - Generate reports for tax filing and audits
- **Pain Points:**
  - Clients send invoices via email, Slack, shared drives (unorganized)
  - Cannot validate invoice data without manual review
  - Exporting data requires custom scripts or manual copying
- **Use Cases:**
  - Monthly reconciliation: Exporting all invoices from organization
  - Tax preparation: Filtering invoices by date range and category
  - Audit support: Providing complete invoice history with PDFs

---

## 4. Functional Requirements

### 4.1 Core Features

#### Feature 1: Invoice Upload & Storage
**Description:** Upload invoice PDFs via web interface or email forwarding. Store invoices in DigitalOcean Spaces with metadata and linked accounts.

**User Stories:**
- As a finance manager, I want to upload invoice PDFs so I can store them centrally
- As a user, I want to forward invoices to invoices@nextcrm.io so I don't need to log in
- As a finance manager, I want to see thumbnail previews of invoices so I can identify them quickly
- As any user, I want to download original invoice PDFs so I can send to vendors

**Specifications:**
- **Invoices Model:**
  - Core fields: `id`, `organizationId`, `invoice_number`, `invoice_amount`, `date_received`, `date_due`, `status`
  - File storage: `invoice_file_url` (DigitalOcean Spaces), `invoice_file_mimeType` (application/pdf)
  - Vendor details: `partner`, `partner_VAT_number`, `partner_email`, `partner_address` fields (15+ partner fields)
  - Line items: `invoice_items` (JSON array of line items with description, quantity, price, tax)
  - Rossum fields: `rossum_status`, `rossum_annotation_id`, `rossum_document_id`
  - CRM linkage: `assigned_account_id` (foreign key to crm_Accounts)
  - Status: "Draft", "Pending", "Paid", "Overdue", "Cancelled"

- **Upload Methods:**
  1. **Web Upload:** Drag-and-drop or file picker on Invoices page → Upload to DigitalOcean Spaces → Create Invoices record → Trigger Rossum extraction
  2. **Email Forwarding:** Send to invoices@nextcrm.io → Parse email attachments → Extract sender email → Auto-assign to organization → Trigger Rossum
  3. **Bulk Upload:** Upload ZIP file with multiple invoices → Extract and process each PDF individually

- **File Storage:**
  - DigitalOcean Spaces bucket: `nextcrm-invoices/[organizationId]/[year]/[month]/[filename].pdf`
  - CDN URL: `https://cdn.nextcrm.io/invoices/[organizationId]/[invoice_id].pdf`
  - Retention: Indefinite (compliance requirement: 10 years minimum)
  - Access control: Signed URLs with 24-hour expiration for downloads

**UI/UX Considerations:**
- Invoice list view with thumbnail previews (first page of PDF rendered as image)
- Drag-and-drop upload zone with progress bar
- Status badges: Green (Paid), Yellow (Pending), Red (Overdue)
- Quick actions: Download PDF, View details, Mark as paid, Delete

---

#### Feature 2: Rossum AI Document Extraction (95%+ Accuracy)
**Description:** Automatic extraction of invoice fields using Rossum AI OCR and machine learning. Extracts 20+ fields including amounts, dates, VAT, line items, vendor details.

**User Stories:**
- As a finance manager, I want AI to extract invoice data so I save 10 minutes per invoice
- As a user, I want to review extracted data for accuracy before saving
- As a finance manager, I want AI to handle multiple invoice formats (different vendors) without training
- As a user, I want to see confidence scores so I know which fields to double-check

**Specifications:**
- **Rossum Integration:**
  - API: Rossum API v1 (https://api.elis.rossum.ai)
  - Workflow:
    1. Upload invoice PDF to Rossum via API
    2. Rossum returns `document_id` and `annotation_id`
    3. Store IDs in Invoices record: `rossum_document_id`, `rossum_annotation_id`
    4. Poll Rossum API every 5 seconds for status (or webhook callback)
    5. When status="exported", fetch extracted data JSON
    6. Parse JSON and populate Invoice fields
    7. Update `rossum_status` = "completed"

- **Extracted Fields (20+ fields):**
  - Invoice metadata: `invoice_number`, `invoice_date`, `due_date`, `invoice_amount`, `currency`
  - Vendor details: `partner` (name), `partner_VAT_number`, `partner_TAX_number`, `partner_address`, `partner_email`, `partner_phone`
  - Line items: `invoice_items` JSON array:
    ```json
    [
      {
        "description": "Consulting Services",
        "quantity": 10,
        "unit_price": 150.00,
        "tax_rate": 20,
        "total": 1500.00
      }
    ]
    ```
  - Tax: `tax_amount`, `tax_rate`, `tax_detail` (VAT breakdown)
  - Payment: `payment_method`, `bank_account`, `IBAN`

- **Accuracy & Confidence Scores:**
  - Rossum returns confidence score per field (0-100%)
  - Fields with <80% confidence highlighted yellow in review UI
  - User can manually correct any field before saving
  - Corrections sent back to Rossum for model training (continuous improvement)

- **Error Handling:**
  - If Rossum extraction fails: Show error message, allow manual entry
  - If Rossum API unavailable: Queue extraction for retry (max 3 attempts)
  - Fallback: Manual entry form always available

**UI/UX Considerations:**
- Extraction progress indicator: "Analyzing invoice... 45% complete"
- Review page shows extracted fields with confidence indicators (green >90%, yellow 70-90%, red <70%)
- Side-by-side view: PDF preview on left, extracted fields on right
- "Accept All" button if all fields look correct, or individual field editing

---

#### Feature 3: Payment Tracking & Status Management
**Description:** Track invoice payment status throughout lifecycle (draft → pending → paid/overdue). Automatic overdue detection, payment reminders, and manual reconciliation.

**User Stories:**
- As a finance manager, I want to mark invoices as paid so I track outstanding balances
- As a user, I want automatic reminders for invoices due in 3 days so I don't miss payments
- As a finance manager, I want to see overdue invoices dashboard so I prioritize collections
- As any user, I want to filter invoices by status (paid, overdue) so I find specific invoices quickly

**Specifications:**
- **Invoice Status Workflow:**
  1. **Draft:** Invoice created but not finalized (editable)
  2. **Pending:** Invoice sent to vendor/customer, awaiting payment
  3. **Paid:** Payment received and recorded
  4. **Overdue:** Due date passed without payment (auto-detected daily)
  5. **Cancelled:** Invoice voided (not paid, not expected)

- **Status Transitions:**
  - Draft → Pending: Click "Finalize" button, set `date_received` = now()
  - Pending → Paid: Click "Mark as Paid" button, set `payment_date` = now(), optional payment method/reference
  - Pending → Overdue: Automated (daily cron job checks `date_due` < now() AND status="Pending")
  - Any status → Cancelled: Click "Cancel Invoice" button (requires reason in audit log)

- **Payment Recording:**
  - "Mark as Paid" modal:
    - Payment date (default: today)
    - Payment method (Bank transfer, Credit card, Check, Cash)
    - Payment reference (transaction ID, check number)
    - Notes (optional)
  - On save: Update status="Paid", store payment details, trigger notification

- **Automatic Overdue Detection:**
  - Daily cron job (runs at 6am UTC):
    - Query: `SELECT * FROM Invoices WHERE status='Pending' AND date_due < NOW()`
    - Update status="Overdue" for matching records
    - Send email notification to assigned user: "Invoice #[number] from [vendor] is now overdue"
    - Audit log entry: "Invoice marked overdue (automated)"

- **Payment Reminders:**
  - Daily cron job (runs at 8am user's timezone):
    - Query: `SELECT * FROM Invoices WHERE status='Pending' AND date_due BETWEEN NOW() AND NOW() + 3 days`
    - Send reminder email: "Invoice #[number] due in [X] days - Reminder to pay"
    - User setting: Enable/disable reminders, configure days before due (default: 3)

**UI/UX Considerations:**
- Status badges with colors: Gray (Draft), Yellow (Pending), Green (Paid), Red (Overdue), Strikethrough (Cancelled)
- "Mark as Paid" quick action button on invoice list (single click)
- Overdue invoices dashboard widget showing count and total amount
- Payment history timeline on invoice detail page

---

#### Feature 4: Recurring Invoice Generation
**Description:** Auto-generate invoices on schedule (monthly, quarterly, annually) for subscription customers. Eliminates manual invoice creation for recurring billing.

**User Stories:**
- As a finance manager, I want to create recurring invoice template so monthly invoices auto-generate
- As a user, I want to edit recurring invoice settings (amount, frequency) without starting from scratch
- As a finance manager, I want to pause recurring invoices temporarily (e.g., customer on hold)
- As any user, I want to see all invoices generated from a recurring template

**Specifications:**
- **Recurring Invoice Template (Stored in Invoices model):**
  - `invoice_type`: "Recurring" (vs. "One-time")
  - `recurrence_rule`: JSON object:
    ```json
    {
      "frequency": "monthly", // monthly, quarterly, annually
      "start_date": "2025-01-01",
      "end_date": null, // null = indefinite
      "day_of_month": 1, // invoice generation day
      "is_active": true
    }
    ```
  - Template fields: All standard invoice fields except dates (generated at runtime)

- **Invoice Generation Workflow:**
  1. Daily cron job (runs at 2am UTC):
     - Query active recurring templates where next generation date = today
     - For each template:
       - Create new Invoices record copying all fields from template
       - Set `date_received` = today, `date_due` = today + 30 days (configurable)
       - Set `invoice_number` = auto-increment (ORG-[year]-[sequence])
       - Set status="Pending"
       - Link to same account as template
     - Send email notification to assigned user: "New recurring invoice generated"
  2. Update template's next generation date based on frequency

- **Template Management:**
  - Create template: "New Recurring Invoice" button → Form with recurrence settings
  - Edit template: Changes apply to future invoices only (past invoices unaffected)
  - Pause template: Toggle `is_active` = false (stops generation until re-enabled)
  - View generated invoices: Link from template to list of all invoices created from it

- **Recurrence Frequencies:**
  - Monthly: Generates on same day each month (e.g., 1st of month)
  - Quarterly: Every 3 months (Jan 1, Apr 1, Jul 1, Oct 1)
  - Annually: Once per year on specific date

**UI/UX Considerations:**
- Recurring invoice badge: "🔄 Recurring" on invoice cards
- Template list view separate from regular invoices
- "Generated from template" breadcrumb on invoices created from template
- Pause/resume toggle switch on template cards

---

#### Feature 5: PDF Invoice Generation (<2 Second Target)
**Description:** Generate professional PDF invoices from NextCRM data using React-PDF templates. Support custom branding (logo, colors) and multiple formats (standard, detailed, minimalist).

**User Stories:**
- As a finance manager, I want to generate invoice PDFs so I can send to customers
- As a user, I want to customize invoice template (logo, colors) so invoices match our brand
- As any user, I want to preview invoice PDF before finalizing so I catch errors
- As a finance manager, I want to email invoice PDF directly from NextCRM so I save steps

**Specifications:**
- **PDF Generation Library:**
  - Use `@react-pdf/renderer` or `pdfkit` for server-side PDF generation
  - Template components: `<InvoicePDF />` component with props (invoice data, org settings)

- **PDF Template Sections:**
  - Header: Organization logo (from settings), company name, address, contact info
  - Invoice metadata: Invoice #, Date, Due date, Payment terms
  - Bill to: Customer name, address, contact (from linked account)
  - Line items table: Description, Quantity, Unit Price, Tax Rate, Total
  - Subtotal, Tax breakdown, Total amount (prominent)
  - Footer: Payment instructions (bank account, IBAN), notes, legal text

- **Generation Workflow:**
  1. User clicks "Generate PDF" button on invoice detail page
  2. Backend API endpoint `/api/invoices/[id]/pdf`:
     - Fetch invoice data from database (including line items)
     - Fetch organization settings (logo URL, branding colors)
     - Render React-PDF component with data
     - Convert to PDF buffer
     - Upload to DigitalOcean Spaces: `invoices/[orgId]/[invoiceId].pdf`
     - Return PDF URL
  3. Frontend shows PDF preview in iframe with "Download" and "Email" buttons
  4. Performance target: <2 seconds from click to preview

- **Customization Options (Org Settings):**
  - Logo upload (PNG/JPG, max 500KB)
  - Primary color (hex code, used for headers/accents)
  - Invoice template style: Standard, Detailed (with line item descriptions), Minimalist
  - Footer text (custom payment instructions, legal notices)

- **Email PDF:**
  - "Email Invoice" button opens modal:
    - Recipient email (default: customer email from account)
    - Subject (default: "Invoice #[number] from [org name]")
    - Message (optional, plain text)
    - Attach PDF checkbox (checked by default)
  - On send: Use Resend API to send email with PDF attachment
  - Track email send: Store `email_sent_date` in invoice record

**UI/UX Considerations:**
- PDF preview modal with zoom controls (fit to width, 100%, 150%)
- "Regenerate PDF" button if invoice data changed since last generation
- Template preview before selecting (thumbnail images of each template style)
- Progress indicator during generation: "Generating PDF... Please wait"

---

### 4.2 Secondary Features

#### Feature 6: Multi-Currency Support
**Description:** Support invoices in 50+ currencies with automatic exchange rate lookup for reporting.

**Specifications:**
- `invoice_currency` field (USD, EUR, GBP, etc.)
- Exchange rate API integration (e.g., exchangerate-api.io)
- Convert all invoices to organization's base currency for reporting

#### Feature 7: Invoice Templates Library
**Description:** Pre-built invoice templates for common industries (SaaS, Consulting, Retail, Healthcare).

**Specifications:**
- Template gallery with previews
- Clone template to create new invoice (pre-fills line items, terms)
- Admin can create organization-wide templates

#### Feature 8: Invoice Approval Workflow
**Description:** Multi-step approval process for invoices (creator → manager → finance).

**Specifications:**
- Approval chain defined in organization settings
- Email notifications at each approval step
- Audit log of approvals/rejections with comments

#### Feature 9: Invoice Analytics Dashboard
**Description:** Financial metrics dashboard showing total invoiced, paid, overdue, by date range.

**Specifications:**
- Metrics: Total invoiced (sum), Total paid, Total outstanding, Avg days to payment
- Charts: Invoices by month (bar chart), Payment status breakdown (pie chart)
- Export to CSV for accounting software

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **PDF Generation:** <2 seconds (p95 latency) for standard invoices (<100 line items)
- **Rossum Extraction:** <30 seconds for single-page invoice, <2 minutes for multi-page (10+ pages)
- **Invoice List Load:** <1 second for 10,000 invoices (paginated)
- **Search:** <500ms for full-text search across invoice numbers, vendor names

### 5.2 Security
- **File Storage:** Signed URLs for PDF downloads (24-hour expiration)
- **Data Privacy:** Invoice data isolated by organizationId (multi-tenancy enforcement)
- **Audit Logging:** All invoice operations logged (create, edit, status change, payment)
- **Access Control:** RBAC enforcement (Viewers read-only, Members create/edit, Admins delete)

### 5.3 Reliability
- **Rossum Uptime:** 99.5% (per Rossum SLA)
- **PDF Generation Success Rate:** >99.9% (fallback: show error, allow manual PDF upload)
- **Email Delivery:** >99% (via Resend)

### 5.4 Compliance
- **Accounting Standards:** Invoices meet GAAP/IFRS requirements (invoice number, date, amount, tax)
- **Data Retention:** Invoices retained indefinitely (minimum 10 years for tax compliance)
- **VAT Compliance:** VAT calculation and storage meet EU regulations

---

## 6. Acceptance Criteria

### Core Functionality
- [ ] User can upload invoice PDF via web interface (drag-and-drop)
- [ ] User can forward invoice PDF to invoices@nextcrm.io (auto-processed)
- [ ] Rossum AI extracts 20+ fields from uploaded invoice within 30 seconds
- [ ] User can review and correct extracted data before saving
- [ ] User can link invoice to account (typeahead search)
- [ ] User can mark invoice as paid (payment date, method, reference captured)
- [ ] Daily cron job detects overdue invoices (status updated automatically)
- [ ] Daily cron job sends payment reminders (3 days before due date)
- [ ] User can create recurring invoice template (monthly, quarterly, annually)
- [ ] Daily cron job generates invoices from recurring templates
- [ ] User can generate invoice PDF with custom branding (logo, colors)
- [ ] User can email invoice PDF directly from NextCRM
- [ ] PDF generation completes in <2 seconds (p95)
- [ ] User can download original uploaded invoice PDF
- [ ] User can filter invoices by status (draft, pending, paid, overdue)
- [ ] User can search invoices by invoice number, vendor name

### Security & Compliance
- [ ] Invoice data isolated by organizationId (no cross-org leakage)
- [ ] RBAC enforced (Viewers read-only, Members create/edit, Admins delete)
- [ ] Audit logs capture all invoice operations
- [ ] PDF downloads use signed URLs (24-hour expiration)
- [ ] Invoices retained for 10 years (compliance)

---

## 7. Success Metrics

| Metric Category | Metric | Target | Measurement Method |
|----------------|--------|--------|-------------------|
| **Efficiency** | Time saved per invoice | 8 min (10 min manual - 2 min review) | User survey |
| **Accuracy** | AI extraction error rate | <5% | Manual review of 100 sample invoices |
| **Adoption** | Invoices processed per organization | 50+ per month | Database count |
| **Payment** | Days to payment (avg) | <30 days | Mean of (payment_date - date_received) |
| **Recurring** | % invoices from recurring templates | >40% | (Recurring invoices / Total) * 100 |
| **Satisfaction** | User satisfaction with AI extraction | >80% "helpful" | In-app survey |

**Key Performance Indicators (KPIs):**
1. **Manual Entry Reduction:** 90% reduction in manual data entry time (vs. spreadsheet baseline)
2. **On-Time Payment Rate:** 85%+ of invoices paid by due date (improved from 60% without reminders)

---

## 8. Dependencies

### Internal Dependencies
| Dependency | Type | Status | Impact if Delayed |
|-----------|------|--------|------------------|
| CRM Accounts Module | Hard | Complete | Cannot link invoices to customers |
| Document Storage | Hard | Complete | Cannot store invoice PDFs |
| Email Service (Resend) | Hard | Complete | Cannot send invoice emails |

### External Dependencies
| Dependency | Provider | SLA | Risk Level |
|-----------|----------|-----|-----------|
| Rossum AI API | Rossum | 99.5% uptime | High (fallback: manual entry) |
| DigitalOcean Spaces | DigitalOcean | 99.9% uptime | Low (managed storage) |
| Resend Email API | Resend | 99.9% uptime | Low (email delivery) |

---

## 9. Out of Scope

- [ ] Purchase order (PO) management (future: procurement module)
- [ ] Expense report management (future: expense tracking)
- [ ] Integration with accounting software (QuickBooks, Xero sync) (future: API)
- [ ] Multi-approval workflows (future: enterprise feature)
- [ ] Credit note generation (future: refunds management)
- [ ] Invoice factoring / financing (future: fintech integration)

---

## 10. Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|------|------------|--------|-------------------|-------|
| **Rossum AI Inaccuracy:** Extraction errors >5% | Medium | High | Manual review step, confidence scoring, user corrections train model | Product Engineer |
| **Rossum API Downtime:** Service unavailable | Low | Medium | Fallback to manual entry, queue for retry when back online | Backend Engineer |
| **PDF Generation Slowness:** >2 sec latency | Medium | Medium | Optimize template, cache organization settings, background job queue | Performance Engineer |

---

## 11. Launch Requirements

### Pre-Launch Checklist

#### Development
- [ ] All acceptance criteria met
- [ ] Rossum API integration tested (upload, extraction, correction feedback loop)
- [ ] PDF generation tested (<2 sec target met)
- [ ] Recurring invoice cron job tested (daily generation, edge cases)

#### QA
- [ ] Rossum extraction accuracy tested (100 sample invoices, <5% error rate)
- [ ] PDF generation tested (all templates, custom branding)
- [ ] Payment tracking tested (status transitions, reminders, overdue detection)

#### Operations
- [ ] Rossum API credentials configured in production
- [ ] DigitalOcean Spaces bucket created (`nextcrm-invoices`)
- [ ] Cron jobs deployed (recurring generation, overdue detection, reminders)

#### Legal & Compliance
- [ ] Rossum Data Processing Agreement signed
- [ ] Invoice retention policy documented (10 years)

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
| Finance Lead | TBD | | |
