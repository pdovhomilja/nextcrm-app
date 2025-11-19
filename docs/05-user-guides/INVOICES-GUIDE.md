# Invoices Guide - Invoice Management & Finance Tracking

**Last Updated:** 2024-11-17
**Read Time:** 10-12 minutes
**For:** Finance teams, accountants, accounts payable/receivable, business owners

---

## Table of Contents

1. [Invoice Overview](#invoice-overview)
2. [Creating Invoices](#creating-invoices)
3. [Document Processing with AI](#document-processing-with-ai)
4. [Payment Tracking](#payment-tracking)
5. [Recurring Invoices](#recurring-invoices)
6. [Reporting & Analytics](#reporting--analytics)
7. [Compliance & Best Practices](#compliance--best-practices)

---

## Invoice Overview

### What is an Invoice?

An **invoice** is a commercial document issued by a seller to a buyer that:
- Lists products/services provided
- States quantities and agreed prices
- Indicates payment terms and due date
- Serves as a legal record of the transaction

**Types of invoices in NextCRM:**
- **Standard Invoice** - Regular bill for products/services delivered
- **Recurring Invoice** - Automatically generated at regular intervals (monthly, annually)
- **Credit Note** - Document reducing amount owed (for returns or errors)
- **Proforma Invoice** - Preliminary bill (quote, not final)

### Invoice Workflow Overview

**Typical invoice lifecycle:**

**For Accounts Receivable (Money You're Owed):**
1. **Draft** - Invoice created but not yet sent
2. **Sent** - Invoice sent to customer
3. **Viewed** - Customer has opened invoice (if tracking enabled)
4. **Partial Payment** - Customer paid some but not all
5. **Paid** - Customer paid in full
6. **Overdue** - Past due date without payment
7. **Written Off** - Uncollectible debt

**For Accounts Payable (Money You Owe):**
1. **Received** - Supplier invoice received
2. **Under Review** - Being verified/approved
3. **Approved** - Ready for payment
4. **Scheduled** - Payment scheduled
5. **Paid** - Payment sent
6. **Disputed** - Questioning charges

### Overdue Invoices

Invoices become **overdue** when:
- Current date > Due date
- Status ≠ Paid

**Overdue indicators:**
- Red badge on invoice
- Days overdue shown (e.g., "15 days overdue")
- Automated reminders sent (if configured)

**Managing overdue invoices:**
1. Send payment reminders (automated or manual)
2. Contact customer (phone or email)
3. Offer payment plan if needed
4. Escalate to collections if necessary
5. Write off as bad debt if uncollectible

### Tax and VAT Handling

NextCRM supports various tax systems:

**Tax Types:**
- **Sales Tax** - US state/local sales tax
- **VAT (Value Added Tax)** - European tax system
- **GST (Goods and Services Tax)** - Used in Canada, Australia, India, etc.
- **No Tax** - Tax-exempt transactions

**Tax Configuration:**
1. Navigate to **Settings → Finance → Tax Settings**
2. Configure tax rates:
   - Tax name (e.g., "CA Sales Tax")
   - Tax rate (e.g., 8.5%)
   - Default application (all invoices or specific types)
3. Save tax configuration

**Applying Tax to Invoices:**
- Tax calculated automatically based on settings
- Can override per invoice if needed
- Tax shown as separate line item
- Tax included in total amount due

### Payment Tracking

Track when customers pay:

**Payment Status:**
- **Unpaid** - No payment received
- **Partially Paid** - Some payment received, balance remains
- **Paid** - Fully paid
- **Overpaid** - Customer paid more than invoice amount (rare)
- **Refunded** - Payment returned to customer

**Payment Methods:**
- Cash
- Check
- Bank Transfer / Wire
- Credit Card
- PayPal / Stripe
- Other

**Recording Payments:**
1. Open invoice
2. Click **Record Payment**
3. Enter payment details:
   - Amount received
   - Payment date
   - Payment method
   - Transaction reference (check #, transaction ID)
4. Click **Save**
5. Invoice status updates automatically

---

## Creating Invoices

### Manual Invoice Creation

Create invoices from scratch:

**Step-by-Step:**

1. Navigate to **Invoices** (main menu)
2. Click **+ New Invoice**
3. Fill in invoice details:

**Invoice Header:**
- **Invoice Number** - Auto-generated or manual entry
  - Format: `INV-2024-001`, `2024-11-001`, etc.
  - Must be unique
  - Sequential numbering recommended
- **Invoice Date** - Date invoice is issued (default: today)
- **Due Date** - When payment is expected
  - Net 15 (due in 15 days)
  - Net 30 (due in 30 days)
  - Net 60 (due in 60 days)
  - Custom date
- **Invoice Type** - Standard, Recurring, Credit Note, Proforma

**Customer Information:**
- **Customer Account** - Link to CRM account (dropdown)
- If not in CRM, enter manually:
  - Company name
  - Contact name
  - Email
  - Billing address
  - VAT/Tax number

**Line Items (Products/Services):**
For each line item, enter:
- **Description** - Product or service name
- **Quantity** - Number of units
- **Unit Price** - Price per unit
- **Discount** - Percentage or fixed amount (optional)
- **Tax** - Tax rate applied to this line item
- **Total** - Auto-calculated (Quantity × Unit Price - Discount + Tax)

Click **+ Add Line Item** to add more rows

**Example Line Items:**
| Description | Qty | Unit Price | Discount | Tax | Total |
|-------------|-----|------------|----------|-----|-------|
| Website Design | 1 | $5,000 | 10% ($500) | 8% ($360) | $4,860 |
| Hosting (Annual) | 1 | $500 | 0% | 8% ($40) | $540 |
| **Invoice Total** | | | | | **$5,400** |

**Payment Terms:**
- **Terms** - Payment terms description (e.g., "Net 30", "Due upon receipt")
- **Notes** - Additional information for customer
  - Payment methods accepted
  - Late payment penalties
  - Thank you message
- **Footer** - Legal disclaimers, terms & conditions

**Internal Tracking:**
- **Assigned To** - Team member managing this invoice (optional)
- **Status** - Draft, Sent, Paid, etc.
- **Tags** - Labels for categorization

4. Click **Save as Draft** or **Save and Send**

**Screenshot Placeholder:** `[Invoice Creation Form - Showing complete invoice with customer info, line items, totals, and payment terms]`

**Pro Tip:** Create invoice templates for common services (e.g., "Monthly Retainer Invoice", "Consulting Day Rate"). Reuse templates to save time and ensure consistency.

### Invoice Numbering

**Auto-Generated Invoice Numbers:**
- System generates sequential numbers automatically
- Format: `INV-{YEAR}-{NUMBER}` (e.g., INV-2024-001)
- Ensures no duplicates or gaps
- Required for audit compliance

**Configuring Numbering:**
1. Navigate to **Settings → Invoices → Numbering**
2. Set configuration:
   - **Prefix** - Text before number (e.g., "INV-")
   - **Starting Number** - First invoice number (default: 1)
   - **Padding** - Leading zeros (001 vs. 1)
   - **Include Year** - Add year to number (recommended)
   - **Reset Annually** - Start at 1 each year (yes/no)
3. Save settings

**Manual Invoice Numbers:**
- Toggle **Manual Numbering** in settings
- Enter custom number for each invoice
- System warns if duplicate detected
- Use carefully (gaps in sequence may trigger audit flags)

**Pro Tip:** Always use auto-generated sequential numbering unless you have a specific regulatory requirement. Manual numbering is error-prone and can create compliance issues.

### Linking Invoices to CRM Accounts

Connect invoices to customers:

**Linking During Creation:**
1. Create new invoice
2. Click **Customer Account** field
3. Search for account by name
4. Select account from dropdown
5. Customer details auto-populate (name, address, email)

**Benefits of Linking:**
- View all invoices for a customer in one place
- Track total revenue per account
- See payment history when reviewing account
- Include invoices in customer reports
- Automate collections reminders

**Viewing Account Invoices:**
1. Navigate to **CRM → Accounts**
2. Open account record
3. Click **Invoices** tab
4. View all invoices linked to this account
5. See summary: Total invoiced, Total paid, Outstanding balance

**Pro Tip:** Always link invoices to accounts (don't create standalone invoices). This gives you complete financial visibility into each customer relationship.

### Invoice from Opportunity/Deal

Convert a won deal to an invoice:

**Converting Opportunity to Invoice:**
1. Navigate to **CRM → Opportunities**
2. Open a **Closed Won** opportunity
3. Click **Create Invoice** button
4. Invoice is pre-filled:
   - Customer = Opportunity account
   - Amount = Opportunity expected revenue
   - Description = Opportunity name
5. Review and adjust line items as needed
6. Save invoice

**Benefits:**
- Ensures won deals are actually invoiced (nothing falls through cracks)
- Links revenue to sales team (commission tracking)
- Provides full customer journey (Lead → Opportunity → Invoice → Payment)

**Pro Tip:** Make it policy to create invoices from opportunities, not standalone. This closes the loop from sale to payment and prevents forgotten invoicing.

### Invoice Templates

Create reusable invoice templates:

**Creating a Template:**
1. Create an invoice with your standard structure:
   - Common line items
   - Standard terms and notes
   - Payment instructions
2. Click **Save as Template**
3. Name template (e.g., "Monthly Consulting Retainer")
4. Template is saved

**Using a Template:**
1. Click **+ New Invoice**
2. Click **Use Template** dropdown
3. Select template
4. Invoice is created with template content
5. Customize as needed (update customer, dates, quantities)
6. Save

**Built-In Templates:**
- Hourly Services Invoice
- Fixed Fee Project Invoice
- Product Sales Invoice
- Subscription/Recurring Invoice
- Expense Reimbursement Invoice

**Customizing Invoice Design:**
1. Navigate to **Settings → Invoices → Template Design**
2. Customize:
   - Company logo (upload image)
   - Color scheme (primary color, accent color)
   - Font selection
   - Layout (classic, modern, minimal)
3. Preview changes
4. Save template design
5. Design applies to all invoices

**Screenshot Placeholder:** `[Invoice Template Design Editor - Showing logo upload, color picker, font selection, and live preview]`

**Pro Tip:** Create templates for your top 5 most common invoice types. You'll save 5-10 minutes per invoice by not re-entering the same line items repeatedly.

### Recurring Invoices Setup

Automate regular billing:

**Setting Up Recurring Invoice:**
1. Click **+ New Invoice**
2. Check **Recurring Invoice** checkbox
3. Configure recurrence:
   - **Frequency** - Weekly, Monthly, Quarterly, Semi-Annual, Annual
   - **Start Date** - When first invoice should be generated
   - **End Date** - When to stop (optional, leave blank for indefinite)
   - **Auto-Send** - Yes/No (automatically email to customer)
4. Fill in invoice details (customer, line items, etc.)
5. Save recurring invoice

**How Recurring Invoices Work:**
- System generates new invoice based on schedule
- Invoice date = generation date
- Due date = based on payment terms (e.g., Net 30)
- Sent automatically if auto-send enabled
- Manual review option (invoices created as Draft, you review before sending)

**Example Recurring Invoice:**
- **Customer:** Acme Corp
- **Service:** Monthly Software Subscription
- **Amount:** $499/month
- **Frequency:** Monthly
- **Start Date:** January 1, 2024
- **End Date:** December 31, 2024
- **Auto-Send:** Yes

System generates invoices on: Jan 1, Feb 1, Mar 1, Apr 1, May 1, Jun 1, Jul 1, Aug 1, Sep 1, Oct 1, Nov 1, Dec 1

**Managing Recurring Invoices:**
1. Navigate to **Invoices → Recurring**
2. View all active recurring invoices
3. Actions available:
   - **Pause** - Temporarily stop generation
   - **Resume** - Restart generation
   - **Edit** - Change amount, frequency, customer
   - **Cancel** - Stop permanently

**Pro Tip:** Use recurring invoices for subscriptions, retainers, and maintenance contracts. Set up once and forget—no more manual invoice creation each month!

### Draft → Sent Workflow

Move invoices through approval:

**Draft Status:**
- Invoice created but not sent to customer
- Visible only to internal team
- Can be edited freely
- Not counted in financial reports

**Sending an Invoice:**
1. Open draft invoice
2. Review all details for accuracy
3. Click **Send Invoice** button
4. Choose send method:
   - **Email** - Send via email (requires customer email)
   - **Download PDF** - Save PDF to send manually
   - **Print** - Print for physical mailing
   - **Share Link** - Generate viewable link (no email required)
5. If sending via email:
   - Email address pre-filled from customer account
   - Subject line: "Invoice INV-2024-001 from [Your Company]"
   - Message body (customizable):
     > Hi [Customer Name],
     >
     > Please find attached invoice INV-2024-001 for $5,400.
     >
     > Payment is due by December 15, 2024.
     >
     > If you have any questions, please don't hesitate to reach out.
     >
     > Thank you for your business!
6. Click **Send**
7. Invoice status changes to **Sent**
8. Email sent to customer with PDF attachment
9. System logs send time and recipient

**Email Tracking (if enabled):**
- Tracks when customer opens email
- Tracks when customer views invoice PDF
- Notifications sent to you when customer views
- Useful for follow-up timing

**Pro Tip:** Review invoices carefully before sending. Once sent, changes require issuing a credit note or amended invoice, which is more complex than fixing a draft.

### Invoice Customization (Logo, Colors, Terms)

Brand your invoices:

**Adding Company Logo:**
1. Navigate to **Settings → Invoices → Design**
2. Click **Upload Logo**
3. Select image file (PNG, JPG, SVG)
4. Recommended size: 300×100 px
5. Logo appears at top of all invoices

**Color Customization:**
1. Navigate to **Settings → Invoices → Design**
2. Set colors:
   - **Primary Color** - Headers, accents
   - **Secondary Color** - Backgrounds, borders
   - **Text Color** - Body text (usually black or dark gray)
3. Preview changes in real-time
4. Save design

**Payment Terms and Conditions:**
1. Navigate to **Settings → Invoices → Terms**
2. Configure:
   - **Default Payment Terms** - Net 30, Net 15, etc.
   - **Late Payment Fee** - Percentage or fixed amount per day/week
   - **Payment Methods Accepted** - List of accepted methods
   - **Notes** - Standard notes to include on all invoices
   - **Footer Text** - Legal disclaimers, tax info
3. Text auto-populates on all new invoices
4. Can be customized per invoice if needed

**Localization:**
- **Currency** - USD, EUR, GBP, etc.
- **Date Format** - MM/DD/YYYY (US) vs. DD/MM/YYYY (Europe)
- **Language** - Invoice text translated to customer's language
- **Tax Display** - Show tax inclusive or exclusive

**Pro Tip:** Use professional logo and consistent colors. Invoices are customer-facing documents—polish matters. A professional invoice increases perceived value and payment likelihood.

---

## Document Processing with AI

NextCRM uses **Rossum AI** to extract data from invoice documents automatically.

### Uploading Invoice Documents (PDF, Image, Excel)

Upload supplier invoices for processing:

**Supported File Types:**
- **PDF** - Recommended (best extraction accuracy)
- **Images** - JPEG, PNG, TIFF
- **Scanned Documents** - Multi-page PDFs or TIF files
- **Photos** - Mobile phone pictures of paper invoices
- **Excel/CSV** - Spreadsheet exports

**Uploading Documents:**
1. Navigate to **Invoices**
2. Click **Upload Invoice Document**
3. Choose upload method:
   - **Drag and drop** - Drag file from computer to upload area
   - **Click to browse** - Select file via file picker
   - **Email to inbox** - Forward invoice email to invoices@yourorg.nextcrm.io
4. File uploads (progress bar shown)
5. AI processing begins automatically

**What Happens After Upload:**
1. Document sent to Rossum AI for processing
2. AI extracts data (usually 10-30 seconds)
3. Extracted data populates invoice fields
4. You review and confirm accuracy
5. Invoice saved to system

**Pro Tip:** Take photos of paper invoices with your phone and upload immediately. This captures data while invoice is in hand and prevents lost paperwork.

### Rossum AI Extraction (Automatic Field Population)

AI reads invoice and fills fields:

**Fields Automatically Extracted:**
- **Supplier Information:**
  - Company name
  - Address
  - VAT/Tax number
  - Email, phone, website
- **Invoice Details:**
  - Invoice number
  - Invoice date
  - Due date
  - Purchase order number (if present)
- **Line Items:**
  - Description of goods/services
  - Quantity
  - Unit price
  - Tax rate
  - Line total
- **Totals:**
  - Subtotal (before tax)
  - Tax amount
  - Total amount due
- **Payment Information:**
  - Bank account details
  - Payment terms
  - Currency

**How AI Extraction Works:**
1. AI uses OCR (Optical Character Recognition) to read text
2. AI identifies document structure (header, line items, totals)
3. AI extracts values from appropriate fields
4. AI validates data (e.g., checks that line items add up to total)
5. AI assigns confidence scores to each extracted field

**Extraction Speed:**
- Simple invoice: 10-15 seconds
- Complex multi-page invoice: 30-60 seconds

**Pro Tip:** AI works best with clear, high-resolution scans. Blurry photos or faded copies reduce accuracy. If possible, request PDF invoices from suppliers instead of paper.

### Extraction Accuracy (95%+ Target)

NextCRM's AI targets 95%+ accuracy:

**Accuracy by Field Type:**
- **Invoice number** - 98% accurate
- **Invoice date** - 97% accurate
- **Total amount** - 99% accurate (critical field, extra validation)
- **Supplier name** - 96% accurate
- **Line item descriptions** - 90% accurate (more variation)
- **Tax amounts** - 95% accurate

**Factors Affecting Accuracy:**
- **Document Quality** - Clear, high-resolution = better accuracy
- **Document Complexity** - Simple invoices = higher accuracy
- **Language** - English invoices have highest accuracy
- **Format Consistency** - Invoices from same supplier = high accuracy (AI learns)

**Confidence Scores:**
- AI assigns confidence score to each field (0-100%)
- **95-100%** - High confidence (usually correct)
- **80-94%** - Medium confidence (review recommended)
- **Below 80%** - Low confidence (manual verification required)

**Visual Indicators:**
- Green checkmark = High confidence
- Yellow warning = Medium confidence (review)
- Red flag = Low confidence (verify)

**Screenshot Placeholder:** `[Invoice Review Screen - Showing extracted fields with confidence scores and color-coded indicators]`

**Pro Tip:** Always review fields with yellow/red confidence indicators. AI is smart but not perfect. A quick 30-second review ensures accuracy.

### Reviewing Extracted Data

Verify AI-extracted data before saving:

**Review Process:**
1. After AI processing completes, review screen appears
2. Left side: Original document (PDF viewer)
3. Right side: Extracted data in editable fields
4. AI highlights fields in document (shows where data came from)

**Reviewing Each Field:**
1. Compare extracted value to source document
2. If correct: Leave as-is (green checkmark)
3. If incorrect: Click field and edit manually
4. System learns from corrections (improves future accuracy)

**Common Issues to Watch For:**
- **Dates** - US vs. European format confusion (12/01 = Dec 1 or Jan 12?)
- **Decimals** - Comma vs. period (1.000,00 vs. 1,000.00)
- **Currency symbols** - $ vs. € vs. £
- **Line items** - Splitting multi-line descriptions
- **Tax** - Inclusive vs. exclusive amounts

**Quick Approval:**
- If all fields have high confidence (green), click **Approve All**
- Invoice is created instantly
- Saves time on straightforward invoices

**Partial Approval:**
- Approve fields you've verified
- Leave unverified fields for later review
- Assign to colleague for second review if needed

**Pro Tip:** Train your team to recognize patterns. After processing 20-30 invoices from a supplier, you'll recognize their format and can review much faster.

### Correcting Extraction Errors

Fix mistakes manually:

**Editing Extracted Fields:**
1. Click field with incorrect data
2. Edit value directly
3. System highlights your edit (shows human override)
4. Click **Save**

**Providing Feedback to AI:**
- When you correct a field, AI learns from your correction
- Future invoices from same supplier will be more accurate
- AI adapts to each supplier's format

**Re-Running Extraction:**
- If extraction badly misses, click **Re-Process**
- Re-upload higher quality scan if available
- AI runs extraction again

**Manual Entry:**
- If AI completely fails (rare), click **Manual Entry**
- Bypass AI and enter all fields manually
- Faster than trying to correct severely incorrect extraction

**Flagging for Review:**
- Click **Flag for Review** to assign to colleague
- Add note explaining the issue
- Useful for complex invoices requiring approval

**Pro Tip:** After correcting an invoice, save a copy of the supplier's format in your documentation. If AI consistently struggles with a particular supplier, you can contact support to train AI on that format.

### Bulk Upload Processing

Process multiple invoices at once:

**Bulk Upload:**
1. Navigate to **Invoices → Upload**
2. Click **Bulk Upload** button
3. Select multiple files (up to 50 at once)
4. Files upload in parallel
5. AI processes all invoices
6. Review queue populates with extracted invoices

**Review Queue:**
- Invoices listed in queue (sorted by confidence score)
- High-confidence invoices at top (approve quickly)
- Low-confidence invoices at bottom (need manual review)
- Process queue one by one

**Batch Approval:**
- Select multiple high-confidence invoices (checkboxes)
- Click **Approve All Selected**
- All selected invoices created instantly
- Manual review required for remaining invoices

**Pro Tip:** Bulk upload invoices at end of week or month. Process 20-50 invoices in one sitting. Batch processing is much faster than processing invoices one-at-a-time throughout the week.

### Supported Document Types

**Standard Invoices:**
- Supplier invoices (bills you need to pay)
- Customer invoices (bills you send)
- Utility bills
- Service invoices
- Product invoices

**Credit Notes:**
- Returns and refunds
- Adjustments to previous invoices

**Receipts:**
- Expense receipts
- Purchase receipts

**Statements:**
- Monthly account statements (limited support)

**Multi-Page Documents:**
- Invoices with multiple pages
- Invoices with attachments (T&Cs, supporting docs)

**Pro Tip:** AI works best with standard business invoices. Receipts from retail stores or handwritten invoices may have lower accuracy. For non-standard documents, manual entry may be faster.

### OCR Limitations and Workarounds

AI has some limitations:

**Limitations:**
- **Handwritten invoices** - Low accuracy (<70%)
- **Faded or damaged documents** - Low accuracy
- **Non-English languages** - Reduced accuracy (though supported)
- **Complex tables** - May misinterpret line items
- **Unusual formats** - Custom invoice designs may confuse AI

**Workarounds:**

**For Handwritten Invoices:**
- Manually type data (faster than AI correction)
- Request typed/printed invoices from suppliers going forward

**For Faded Documents:**
- Enhance scan quality (increase contrast, brightness)
- Use photo editing app before upload
- Request duplicate from supplier

**For Non-English Languages:**
- AI supports 50+ languages but accuracy varies
- English has highest accuracy
- Request English invoices if possible (for international suppliers)

**For Complex Tables:**
- Review line items carefully
- AI may split one line into multiple or combine lines
- Manually correct line items after extraction

**For Unusual Formats:**
- After first correction, AI learns the format
- Future invoices from same supplier will be more accurate

**Pro Tip:** If a particular supplier's invoices consistently fail AI extraction, save the extracted data as a template for that supplier. You can quickly apply the template to future invoices.

---

## Payment Tracking

### Payment Status Workflow

Track invoice payment lifecycle:

**Status: Unpaid (Invoice Sent)**
- Invoice has been sent to customer
- No payment received yet
- Not yet overdue

**Status: Viewed (Customer Opened Invoice)**
- Customer opened email or clicked invoice link
- Indicates customer has seen invoice
- Useful for follow-up timing

**Status: Partial Payment**
- Customer paid some amount but not full balance
- Shows amount paid and remaining balance
- Example: Invoice for $1,000, paid $600, balance $400

**Status: Paid**
- Full payment received
- Balance is $0
- Invoice is complete

**Status: Overdue**
- Due date passed without payment
- Shows days overdue
- Triggers automated reminders (if configured)

**Status: Written Off**
- Invoice deemed uncollectible
- Removed from accounts receivable
- Used for bad debt

**Updating Payment Status:**
- Status updates automatically when you record payments
- No manual status changes needed

### Recording Payments

Log when customer pays:

**Step-by-Step:**
1. Navigate to **Invoices**
2. Find invoice that was paid
3. Click invoice to open
4. Click **Record Payment** button
5. Enter payment details:

**Payment Information:**
- **Payment Amount** - How much customer paid
  - Can be less than total (partial payment)
  - Can equal total (full payment)
  - Rarely can be more (overpayment)
- **Payment Date** - When payment was received
- **Payment Method** - How customer paid:
  - Cash
  - Check (enter check number)
  - Bank Transfer / Wire (enter reference)
  - Credit Card (enter last 4 digits)
  - PayPal / Stripe (enter transaction ID)
  - Other
- **Reference/Transaction ID** - Bank reference, transaction ID, check number
- **Notes** - Additional context (optional)

6. Click **Save Payment**
7. Payment is recorded
8. Invoice status updates:
   - Partial payment → Status: Partially Paid (shows remaining balance)
   - Full payment → Status: Paid

**Multiple Payments:**
- Customer can make multiple payments on one invoice
- Each payment is logged separately
- Running balance shown
- Example:
  - Invoice total: $1,000
  - Payment 1: $600 (balance $400)
  - Payment 2: $400 (balance $0, status: Paid)

**Screenshot Placeholder:** `[Record Payment Form - Showing payment amount, date, method, and reference fields with example data]`

**Pro Tip:** Record payments as soon as money hits your account. Daily payment recording keeps financial data current and prevents reconciliation headaches at month-end.

### Partial Payments

Handle when customer pays in installments:

**Scenario:**
- Invoice total: $10,000
- Customer requests to pay in 3 installments

**Recording Installments:**
1. Send full invoice for $10,000
2. When first payment received ($3,000):
   - Record payment for $3,000
   - Status: Partially Paid
   - Balance shown: $7,000
3. When second payment received ($3,000):
   - Record payment for $3,000
   - Status: Still Partially Paid
   - Balance shown: $4,000
4. When final payment received ($4,000):
   - Record payment for $4,000
   - Status: Paid
   - Balance: $0

**Viewing Payment History:**
- Open invoice
- Click **Payment History** tab
- View all payments:
  - Date of each payment
  - Amount of each payment
  - Payment method
  - Running balance

**Payment Plans:**
- If agreeing to payment plan upfront:
  - Document payment schedule in invoice notes
  - Set reminders for each installment due date
  - Send payment reminders before each due date

**Pro Tip:** For large invoices, offering payment plans increases likelihood of getting paid. Break $10K invoice into 3 monthly payments of $3,333 to reduce customer's cash flow burden.

### Payment Method Tracking

Track how customers pay:

**Available Payment Methods:**
- **Bank Transfer / Wire** - Direct bank-to-bank transfer
- **Check** - Paper check
- **Cash** - Physical currency
- **Credit Card** - Visa, Mastercard, Amex
- **Debit Card** - Bank debit card
- **PayPal** - PayPal transaction
- **Stripe** - Stripe transaction
- **ACH** - Automated Clearing House (US)
- **SEPA** - Single Euro Payments Area (Europe)
- **Other** - Custom method

**Why Track Payment Method:**
- **Fee analysis** - Credit card fees (2-3%) vs. ACH fees (0.5%)
- **Processing time** - Wire (same day) vs. Check (3-5 days)
- **Customer preferences** - Preferred payment methods
- **Accounting** - Different accounts for different methods
- **Reconciliation** - Match payments to bank statements

**Payment Method Reports:**
1. Navigate to **Invoices → Reports → Payment Methods**
2. View breakdown:
   - Revenue by payment method
   - Transaction count by method
   - Average transaction size by method
   - Processing fees paid by method
3. Use data to optimize payment strategy

**Pro Tip:** Encourage low-fee payment methods (ACH, bank transfer) for large invoices to reduce payment processing costs. Reserve credit cards for small transactions where convenience outweighs fees.

### Overdue Invoice Alerts

Get notified about late payments:

**Automatic Overdue Detection:**
- System checks invoices daily
- Any invoice where Current Date > Due Date and Status ≠ Paid is marked overdue
- Days overdue calculated automatically

**Overdue Indicators:**
- Red "OVERDUE" badge on invoice
- Red highlight in invoice list
- Dashboard shows overdue invoice count
- Aging report shows invoices by days overdue

**Overdue Notifications:**
1. Navigate to **Settings → Invoices → Overdue Alerts**
2. Configure notifications:
   - **When invoice becomes overdue** - Immediate notification
   - **Daily digest** - List of all overdue invoices each morning
   - **Weekly report** - Overdue invoice summary every Monday
3. Select recipients:
   - Finance manager
   - Account owner (sales rep who closed deal)
   - Accountant
4. Save settings

**Customer Reminders (Automated):**
- Send automated payment reminders to customers:
  - **1 day before due date** - Friendly reminder payment is due soon
  - **Day of due date** - Payment is due today
  - **3 days after due date** - Polite overdue notice
  - **7 days after due date** - Second overdue notice (more firm)
  - **14 days after due date** - Final notice before escalation

**Pro Tip:** Automate reminders but personalize escalation. First reminder can be automated. But if invoice is 14+ days overdue, make a personal phone call. Shows you care and increases payment likelihood.

### Payment Reminders (Manual & Automated)

Send payment requests to customers:

**Manual Reminders:**
1. Open overdue invoice
2. Click **Send Reminder** button
3. Reminder email opens:
   - Pre-filled with customer email
   - Subject: "Payment Reminder: Invoice [INV-2024-001]"
   - Message body (customizable):
     > Hi [Customer Name],
     >
     > This is a friendly reminder that Invoice INV-2024-001 for $5,400 was due on December 15, 2024.
     >
     > We haven't yet received payment. If payment has already been sent, please disregard this notice.
     >
     > If you have any questions or concerns, please let us know. We're here to help!
     >
     > Thank you,
     > [Your Name]
4. Click **Send Reminder**
5. Email sent to customer
6. Reminder logged in invoice activity

**Automated Reminder Schedule:**
1. Navigate to **Settings → Invoices → Payment Reminders**
2. Enable **Automated Reminders**
3. Configure schedule:
   - **Before Due Date:**
     - 7 days before (optional)
     - 3 days before (recommended)
     - 1 day before (recommended)
   - **After Due Date:**
     - Day of due date
     - 3 days overdue (recommended)
     - 7 days overdue (recommended)
     - 14 days overdue (final notice)
     - 30 days overdue (collections warning)
4. Customize email templates for each reminder
5. Save settings

**Reminder Best Practices:**
- **Be polite** - Assume customer wants to pay (may have forgotten)
- **Be clear** - State invoice number, amount, due date
- **Be helpful** - Offer payment options, ask if there are issues
- **Escalate gradually** - Start friendly, become firmer over time
- **Personalize** - Use customer name, reference relationship

**Pro Tip:** Include payment link in reminders. One-click payment = higher conversion. Remove friction to get paid faster.

### Late Payment Penalties/Interest

Charge fees for late payment:

**Configuring Late Fees:**
1. Navigate to **Settings → Invoices → Late Fees**
2. Enable **Late Payment Fees**
3. Configure fee structure:
   - **Fixed Fee** - Flat amount per invoice (e.g., $25 late fee)
   - **Percentage** - Percent of invoice total (e.g., 1.5% per month)
   - **Interest** - Annual interest rate (e.g., 18% APR)
4. Set **Grace Period** - Days after due date before fee applies (e.g., 5 days)
5. Configure **Maximum Fee** - Cap on total fees (optional)
6. Save settings

**Applying Late Fees:**
1. System calculates late fees automatically
2. Late fee added as line item to invoice
3. New total calculated
4. Customer notified of late fee
5. Option to waive fee manually (if customer has valid excuse)

**Legal Requirements:**
- **Disclose upfront** - Late fee terms must be on invoice (in payment terms section)
- **State limits** - Some states cap late fees (e.g., 10% max)
- **Reasonableness** - Courts may reject excessive fees
- **Consistency** - Apply fees consistently (don't play favorites)

**Pro Tip:** Use late fees as deterrent, not revenue source. Most customers pay on time if reminded. Reserve late fees for chronically late payers. For good customers with one-time late payment, waive the fee (builds goodwill).

### Refunds and Credits

Handle returns and overpayments:

**Issuing a Refund:**
1. Open paid invoice
2. Click **Issue Refund** button
3. Enter refund details:
   - **Refund Amount** - Full or partial refund
   - **Refund Reason** - Product returned, service issue, overpayment, error
   - **Refund Method** - How refund will be sent (same as original payment method recommended)
   - **Refund Date** - When refund was issued
4. Click **Issue Refund**
5. Invoice status updates:
   - Full refund → Status: Refunded
   - Partial refund → Amount adjusts, Status: Partially Paid or Paid
6. Refund recorded in accounting

**Creating a Credit Note:**
- Credit note = Document reducing amount owed
- Used for:
  - Partial returns
  - Service credits
  - Pricing corrections
  - Goodwill credits

**Creating Credit Note:**
1. Open original invoice
2. Click **Create Credit Note**
3. Enter credit amount and reason
4. Credit note is generated
5. Links to original invoice
6. Can be applied to future invoices (customer has credit balance)

**Applying Credit to Future Invoice:**
1. Create new invoice for customer
2. System detects customer has credit balance
3. Option to apply credit:
   - Full credit applied (reduces invoice amount)
   - Partial credit applied (customer chooses amount)
4. Credit balance reduces

**Pro Tip:** Use credit notes instead of refunds when possible. Credits keep money in your business and encourage repeat purchases. Refunds send cash out the door.

### Payment Reconciliation

Match payments to bank statements:

**What is Reconciliation?**
- Process of matching invoice payments to bank deposits
- Ensures all payments recorded accurately
- Identifies missing or duplicate payments

**Reconciliation Process:**
1. Export paid invoices for period (e.g., last month)
2. Export bank statement for same period
3. Match each bank deposit to invoice payment:
   - Amount matches exactly → Correct
   - Amount doesn't match → Investigate (fees, errors, partial payments)
   - Bank deposit with no invoice → Missing invoice or recording error
   - Invoice payment with no bank deposit → Payment not received or processing delay
4. Resolve discrepancies
5. Mark reconciliation complete

**Automated Reconciliation (If Bank Integration Enabled):**
1. Connect bank account to NextCRM
2. Bank transactions import automatically
3. System suggests matches (invoice payment to bank deposit)
4. Review and confirm matches
5. System marks invoices as reconciled
6. Exceptions flagged for manual review

**Pro Tip:** Reconcile weekly, not monthly. Small frequent reconciliations are easier than large monthly reconciliations. Catch errors early before they compound.

---

## Recurring Invoices

### Setting Up Recurring Invoices

Automate subscription billing:

**When to Use Recurring Invoices:**
- Monthly subscriptions (SaaS, memberships)
- Annual renewals (maintenance, licenses)
- Retainer agreements (consulting, legal)
- Regular services (bookkeeping, cleaning)

**Creating Recurring Invoice:**
1. Navigate to **Invoices → Recurring**
2. Click **+ New Recurring Invoice**
3. Configure:

**Schedule:**
- **Frequency:**
  - Weekly (every 7 days)
  - Bi-Weekly (every 14 days)
  - Monthly (every 30 days or specific day of month)
  - Quarterly (every 3 months)
  - Semi-Annual (every 6 months)
  - Annual (every 12 months)
- **Start Date** - When first invoice should be generated
- **End Date** - When to stop (optional)
  - Leave blank for indefinite (e.g., ongoing subscription)
  - Set date for fixed-term contracts
- **Invoice Day** - Day of month to generate (for monthly)
  - Example: "15th of each month"
  - Example: "Last day of month"

**Customer & Line Items:**
- Select customer account
- Enter line items (product/service description, price)
- Set payment terms (Net 15, Net 30)
- Configure auto-send (email invoice automatically)

4. Click **Save Recurring Invoice**
5. System generates invoices on schedule

**Screenshot Placeholder:** `[Recurring Invoice Setup Form - Showing frequency selector, start/end dates, customer selection, and line items]`

### Frequency Options

Choose billing frequency:

**Weekly:**
- Every 7 days
- Use for: Short-term services, contract work

**Bi-Weekly:**
- Every 14 days (every 2 weeks)
- Use for: Contractor payments, frequent services

**Monthly (Most Common):**
- Every 30 days or specific day of month
- Options:
  - Same day each month (e.g., 1st of month, 15th of month)
  - Last day of month
  - Specific date (e.g., "30 days from start date")
- Use for: SaaS subscriptions, retainers, memberships

**Quarterly:**
- Every 3 months
- Use for: Quarterly subscriptions, maintenance contracts

**Semi-Annual:**
- Every 6 months
- Use for: Insurance premiums, semi-annual fees

**Annual:**
- Every 12 months
- Use for: Annual subscriptions, licenses, memberships
- Often offered at discount vs. monthly (e.g., 12 months for price of 10)

**Custom Frequency:**
- Every X days (custom interval)
- Use for: Unique billing schedules

**Pro Tip:** Offer annual billing at 10-15% discount vs. monthly. Upfront cash improves cash flow and reduces churn (customer less likely to cancel mid-year).

### Auto-Send Scheduling

Automate invoice delivery:

**Enabling Auto-Send:**
1. Open recurring invoice settings
2. Enable **Auto-Send**
3. Configure send options:
   - **Send Time** - Time of day to send (e.g., 9:00 AM)
   - **Time Zone** - Your time zone
   - **Email Recipient** - Customer email (from account)
   - **CC Recipients** - Additional recipients (optional)
   - **Email Template** - Default or custom template
4. Save settings

**What Happens on Send Day:**
1. System generates invoice at scheduled time
2. Invoice marked as "Sent"
3. Email sent to customer with PDF attachment
4. Payment reminder schedule begins (based on due date)
5. You receive notification that invoice was sent

**Manual Review Option (Recommended for Large Amounts):**
- Disable auto-send
- System generates invoice but doesn't send
- Invoice created with status "Draft - Pending Review"
- You receive notification to review
- You manually review and send (or edit first if needed)
- Use for:
  - High-value invoices (>$10K)
  - Contracts with variable pricing
  - Customers who require customization

**Pro Tip:** Use auto-send for standard subscriptions (<$1K). Use manual review for large or variable invoices. Balance automation with quality control.

### Auto-Charge with Stripe (If Integrated)

Automate payment collection:

**Setting Up Auto-Charge:**
1. Integrate Stripe payment gateway (see Admin Guide)
2. Customer provides credit card details (saved securely in Stripe)
3. Enable **Auto-Charge** on recurring invoice
4. Configure:
   - **Payment Method** - Customer's saved card
   - **Charge Day** - Same as invoice date or X days after invoice
   - **Retry Schedule** - If payment fails, when to retry

**What Happens Each Billing Cycle:**
1. System generates invoice
2. System immediately charges customer's card via Stripe
3. Payment successful:
   - Invoice marked as "Paid"
   - Customer receives invoice + receipt
   - You receive payment notification
4. Payment failed:
   - Invoice marked as "Unpaid"
   - Customer receives payment failed notification
   - System retries after X days
   - You receive failed payment notification

**Handling Failed Payments:**
- System retries charge after 3 days, 7 days, 14 days (configurable)
- After 3 failed attempts:
  - Invoice marked "Payment Failed"
  - Customer receives notification to update payment method
  - You receive notification to follow up
  - Option to pause subscription if payment not received

**Benefits of Auto-Charge:**
- 95%+ payment collection rate (vs. 70-80% for manual invoices)
- No late payments (charged immediately)
- Better cash flow (predictable revenue)
- Less admin work (no payment tracking needed)

**Pro Tip:** Auto-charge is gold standard for recurring revenue. Convince customers to provide payment method (offer 5% discount for auto-charge enrollment). Predictable cash flow is worth the discount.

### Modifying Recurring Schedules

Update recurring invoices:

**Editing Recurring Invoice:**
1. Navigate to **Invoices → Recurring**
2. Find recurring invoice
3. Click **Edit**
4. Modify any fields:
   - Frequency (e.g., change from monthly to quarterly)
   - Amount (e.g., price increase)
   - Customer (e.g., customer changed billing entity)
   - Line items (e.g., add/remove services)
   - Payment terms (e.g., change from Net 30 to Net 15)
5. Click **Save**
6. Changes apply to future invoices (past invoices unchanged)

**When to Apply Changes:**
- **Immediate** - Next invoice uses new settings
- **Scheduled Date** - Changes apply starting specific date (e.g., "Start price increase on January 1")

**Notifying Customer of Changes:**
- System optionally sends email notification:
  - "Your recurring invoice has been updated"
  - Shows old vs. new details
  - Customer can accept or contact you with questions
- Enable in **Settings → Invoices → Change Notifications**

**Pro Tip:** When raising prices, give customers 30 days notice. Send email before applying change. Transparency prevents cancellations and maintains trust.

### Pausing and Resuming

Temporarily stop recurring billing:

**Pausing Recurring Invoice:**
1. Open recurring invoice
2. Click **Pause** button
3. Select pause reason:
   - Customer requested pause (vacation, budget freeze)
   - Service suspended (non-payment, contract issue)
   - Seasonal pause (customer only needs service part of year)
   - Other (explain)
4. Set resume date (optional):
   - Resume automatically on specific date
   - Resume manually (you'll unpause later)
5. Click **Confirm Pause**
6. Invoices stop generating
7. Customer receives notification (optional)

**Resuming Recurring Invoice:**
1. Open paused invoice
2. Click **Resume** button
3. Confirm resume
4. Invoices start generating again on schedule

**Use Cases for Pause:**
- **Customer vacation** - Customer doesn't need service for 2 months
- **Seasonal business** - Customer only operates May-October
- **Payment issue** - Pause until customer resolves payment method
- **Contract negotiation** - Pause until new contract signed

**Pro Tip:** Pausing is better than canceling. Paused subscriptions often resume. Canceled subscriptions rarely come back. Make pause easy (customer is more likely to return).

---

## Reporting & Analytics

### Outstanding Invoices Report

View all unpaid invoices:

**Accessing Report:**
1. Navigate to **Invoices → Reports → Outstanding Invoices**
2. Report shows all unpaid and partially paid invoices

**Report Includes:**
- Invoice number
- Customer name
- Invoice date
- Due date
- Days overdue (if past due)
- Invoice amount
- Amount paid
- Balance remaining
- Status (Unpaid, Partially Paid, Overdue)

**Sorting Options:**
- Sort by due date (oldest first)
- Sort by amount (largest first)
- Sort by customer (alphabetical)
- Sort by days overdue (most overdue first)

**Filtering Options:**
- Show only overdue (past due date)
- Show by date range (invoices due this week, this month)
- Show by customer (all invoices for specific account)
- Show by amount (invoices over $X)

**Actions:**
- Send reminder (bulk action)
- Record payment
- Export to CSV/Excel

**Pro Tip:** Review outstanding invoices report weekly. Follow up on overdue invoices immediately. Don't let receivables age beyond 30 days.

### Revenue by Customer

Analyze top customers:

**Customer Revenue Report:**
1. Navigate to **Invoices → Reports → Revenue by Customer**
2. Select date range (This Month, This Quarter, This Year, Custom)
3. Report shows:
   - Customer name
   - Total invoiced
   - Total paid
   - Outstanding balance
   - Number of invoices
   - Average invoice size

**Sorting:**
- Sort by revenue (highest-paying customers first)
- Sort by invoice count (most frequent customers)
- Sort by outstanding balance (customers who owe most)

**Insights:**
- **Top 20% customers = 80% revenue** (Pareto principle)
- Identify top customers (focus retention efforts here)
- Identify low-value customers (consider sunsetting)
- Identify customers with high outstanding balances (collection risk)

**Actions:**
- Export to CSV for further analysis
- Click customer to view detailed invoice list
- Flag high-value customers for account management

**Pro Tip:** Regularly review top customers. Small drop in top customer retention = big revenue impact. Proactively manage relationships with top 10 customers.

### Days Sales Outstanding (DSO Metric)

Measure collection efficiency:

**What is DSO?**
- Days Sales Outstanding = Average number of days to collect payment
- Formula: `(Accounts Receivable ÷ Total Credit Sales) × Number of Days`

**Example Calculation:**
- Accounts Receivable (outstanding invoices) = $100,000
- Total Credit Sales (last 90 days) = $300,000
- Number of Days = 90
- DSO = ($100,000 ÷ $300,000) × 90 = 30 days

**Interpretation:**
- DSO = 30 days means on average, customers pay 30 days after invoice
- Lower DSO = Faster payment = Better cash flow
- Higher DSO = Slower payment = Cash flow problems

**Industry Benchmarks:**
- **0-30 days** - Excellent (better than payment terms)
- **30-45 days** - Good (in line with Net 30 terms)
- **45-60 days** - Fair (slower than terms)
- **60+ days** - Poor (collection problems)

**Viewing DSO:**
1. Navigate to **Invoices → Reports → DSO**
2. View current DSO
3. View DSO trend over time (line chart)
4. View DSO by customer (which customers pay slowly?)

**Improving DSO:**
- Shorten payment terms (Net 15 instead of Net 30)
- Send invoices immediately (don't delay)
- Send payment reminders (automated)
- Offer early payment discounts (2% discount if paid within 10 days)
- Enable auto-charge (credit card on file)
- Follow up on overdue invoices (collections process)

**Pro Tip:** Track DSO monthly. Improving DSO by even 5 days can significantly improve cash flow. Every day DSO decreases = cash freed up for business operations.

### Invoice Aging Report

See how long invoices have been outstanding:

**Aging Buckets:**
Invoices grouped by age:
- **Current (0-30 days)** - Not yet due or recently due
- **31-60 days** - Moderately overdue
- **61-90 days** - Significantly overdue
- **91+ days** - Seriously overdue (collection risk)

**Aging Report View:**
| Customer | Current | 31-60 | 61-90 | 91+ | Total |
|----------|---------|-------|-------|-----|-------|
| Acme Corp | $5,000 | $0 | $0 | $0 | $5,000 |
| Beta Industries | $0 | $2,000 | $1,000 | $0 | $3,000 |
| Gamma Partners | $0 | $0 | $0 | $5,000 | $5,000 |
| **Totals** | **$5,000** | **$2,000** | **$1,000** | **$5,000** | **$13,000** |

**Interpretation:**
- **Acme Corp** - All invoices current (good customer)
- **Beta Industries** - Some aging but not critical
- **Gamma Partners** - Seriously overdue (escalate to collections)

**Using Aging Report:**
- Review weekly
- Focus collection efforts on 61+ day invoices
- Consider write-off for 91+ day invoices (if uncollectible)
- Flag customers with pattern of slow payment

**Pro Tip:** Goal is to keep 90%+ of receivables in "Current" bucket. If 61-90 or 91+ buckets grow, you have a collection problem. Address immediately.

### Payment History

View all payments received:

**Payment History Report:**
1. Navigate to **Invoices → Reports → Payment History**
2. Select date range
3. Report shows all payments:
   - Payment date
   - Customer
   - Invoice number
   - Payment amount
   - Payment method
   - Reference/Transaction ID

**Filters:**
- By customer (all payments from specific account)
- By payment method (all credit card payments, all checks, etc.)
- By date range (last 30 days, last quarter, etc.)
- By amount (payments over $X)

**Use Cases:**
- Reconcile to bank statements
- Verify customer payment history (dispute resolution)
- Analyze payment methods (which methods customers prefer)
- Calculate payment processing fees (credit card fees)

**Exporting:**
- Export to CSV or Excel
- Import to accounting software (QuickBooks, Xero)
- Provide to accountant for bookkeeping

**Pro Tip:** Export payment history monthly for accounting records. Keep organized records for tax purposes and audits.

### Tax Reports

Track tax collected:

**Sales Tax Report:**
1. Navigate to **Invoices → Reports → Tax Report**
2. Select date range (month, quarter, year)
3. Report shows:
   - Total sales (pre-tax)
   - Tax collected (by tax rate)
   - Total sales (including tax)
   - Tax breakdown by jurisdiction (if multi-state)

**Example Report:**
- **Total Sales:** $50,000
- **Tax Collected:**
  - CA Sales Tax (8.5%): $2,125
  - NY Sales Tax (8%): $1,600
  - Total Tax: $3,725
- **Total Including Tax:** $53,725

**Use Cases:**
- File sales tax returns (monthly/quarterly)
- Remit tax to government
- Verify tax calculations
- Audit compliance

**Tax Report by Customer:**
- View tax charged per customer
- Required for some tax jurisdictions
- Useful for B2B transactions (customer may need for their records)

**Pro Tip:** Run tax report quarterly at minimum. Don't wait until annual tax filing to discover tax issues. Quarterly review catches errors early.

### Custom Date Ranges

Analyze any time period:

**Setting Custom Date Range:**
1. Open any invoice report
2. Click **Date Range** dropdown
3. Select **Custom**
4. Enter start date and end date
5. Click **Apply**
6. Report updates to show data for selected range

**Common Custom Ranges:**
- **Fiscal Year** - If fiscal year ≠ calendar year
- **Campaign Period** - Revenue during marketing campaign
- **Contract Period** - Revenue during specific contract
- **Seasonal Analysis** - Compare Q4 2023 vs. Q4 2024

**Saving Custom Ranges:**
- Save frequently used ranges
- Quick access to "Fiscal Q1", "Summer 2024", etc.

**Pro Tip:** Use custom date ranges to isolate specific events. Example: "How much revenue came in 30 days after we launched new pricing?" Custom range = powerful analysis tool.

### Exporting Reports

Share and analyze data:

**Export Formats:**
- **CSV** - Comma-separated values (opens in Excel)
- **Excel (XLSX)** - Native Excel format with formatting
- **PDF** - Print-ready document
- **Google Sheets** - Direct export to Google Sheets (if integrated)

**Exporting Process:**
1. Generate report
2. Apply filters (optional - export filtered data only)
3. Click **Export** button
4. Select format
5. File downloads or opens in new tab

**What Gets Exported:**
- All data shown in report
- Respects current filters
- Includes summary totals
- Formatted tables (for Excel/PDF)

**Use Cases:**
- Share with accountant or CFO
- Import to accounting software
- Create custom analyses in Excel
- Include in board reports
- Archive for record keeping

**Pro Tip:** Schedule automated exports. Navigate to **Settings → Reports → Scheduled Exports** to email reports automatically (weekly revenue report every Monday at 9am).

---

## Compliance & Best Practices

### Invoice Numbering Standards

Follow best practices:

**Requirements:**
- **Sequential** - No gaps or duplicates
- **Unique** - Each invoice has unique number
- **Permanent** - Once assigned, number never changes
- **Consistent** - Use same format for all invoices

**Why Sequential Numbering Matters:**
- **Tax compliance** - Auditors check for missing invoices
- **Fraud prevention** - Gaps suggest hidden invoices
- **Record keeping** - Easy to reference historical invoices
- **Professional** - Random numbering looks unprofessional

**Best Practices:**
- Use auto-generated numbering (not manual)
- Include year in format (easier to find old invoices)
- Use leading zeros for alignment (001, 002, 003)
- Never skip numbers (even if invoice is voided)

**Voiding Invoices:**
- If invoice created in error, don't delete
- Mark as "VOID" (preserves number sequence)
- Create new invoice with next number

**Pro Tip:** Never restart invoice numbering at 1 each year if using simple format (001, 002, 003). Use year prefix (2024-001, 2025-001) to avoid duplicate numbers across years.

### Tax Requirements by Region

Understand tax rules:

**United States:**
- Sales tax varies by state (0-10%)
- Nexus rules (must collect tax in states where you have presence)
- Tax-exempt customers (nonprofits, resellers) require certificates
- Multi-state businesses use tax software (Avalara, TaxJar)

**European Union (VAT):**
- VAT rates 17-27% depending on country
- Reverse charge for B2B transactions (customer self-accounts VAT)
- VAT number required for B2B (validate via VIES system)
- Digital services taxed in customer's country

**Canada (GST/HST):**
- GST 5% (federal)
- HST 13-15% (combined federal + provincial in some provinces)
- PST separate in some provinces

**Australia (GST):**
- GST 10% on most goods and services
- GST registration required if turnover >A$75K

**India (GST):**
- GST 5-28% depending on product/service
- Complex multi-tier system (CGST, SGST, IGST)

**International Sales:**
- Export sales often zero-rated (no tax)
- Import duties may apply (customer's responsibility)

**Pro Tip:** Consult local accountant or tax advisor for your specific situation. Tax rules are complex and penalties for non-compliance are severe. NextCRM supports most tax systems but professional advice is essential.

### Record Retention Policies

Keep invoices for required period:

**Legal Requirements:**
- **United States:** 7 years (IRS requirement)
- **European Union:** 6-10 years depending on country
- **Canada:** 6 years (CRA requirement)
- **Australia:** 5 years (ATO requirement)

**What to Retain:**
- All invoices (sent and received)
- Payment records
- Credit notes and refunds
- Tax reports
- Bank statements (for reconciliation)

**Retention in NextCRM:**
- Invoices stored permanently by default
- Archived invoices remain accessible (read-only)
- Deleted invoices moved to "Trash" (recoverable for 90 days)
- Permanent deletion after 90 days (cannot be recovered)

**Compliance Features:**
- Audit log tracks all changes to invoices
- Document timestamps prove creation/send dates
- Digital signatures (optional for some jurisdictions)

**Pro Tip:** Export invoices annually to external storage (cloud backup). Don't rely solely on SaaS provider for 7-year retention. Have independent backup.

### Security Best Practices

Protect financial data:

**Access Control:**
- Limit invoice access to finance team
- Use role-based permissions (see [Permissions Guide](./PERMISSIONS-GUIDE.md))
- Revoke access immediately when employee leaves

**Data Encryption:**
- All data encrypted at rest (AES-256)
- All data encrypted in transit (TLS 1.3)
- Database encrypted

**Payment Information:**
- Never store full credit card numbers (use tokenization)
- PCI DSS compliance (if processing cards)
- Bank account details masked (show last 4 digits only)

**Audit Trail:**
- Every invoice change logged
- Who created, modified, deleted invoice
- Timestamp for all actions
- IP address logged

**Backup:**
- Daily automated backups
- Redundant storage (multiple data centers)
- Point-in-time recovery (restore to any date)

**Two-Factor Authentication:**
- Require 2FA for finance team
- Extra protection for sensitive financial data

**Pro Tip:** Review access permissions quarterly. Remove ex-employees and adjust permissions for role changes. Restrict invoice deletion (most users should only be able to void, not delete).

### Audit Compliance

Prepare for audits:

**What Auditors Look For:**
- **Sequential numbering** - No gaps or duplicates
- **Complete records** - All invoices retained
- **Accurate data** - Invoices match bank deposits
- **Tax compliance** - Tax calculated correctly
- **Supporting documentation** - Contracts, POs, delivery receipts

**Preparing for Audit:**
1. Run **Invoice Audit Report** (in NextCRM)
   - Shows all invoices by number
   - Flags gaps in sequence
   - Shows voided invoices
   - Verifies no duplicates
2. Export all invoices for audit period
3. Generate **Payment Reconciliation Report**
   - Shows invoices matched to bank deposits
4. Generate **Tax Report**
   - Shows tax collected and remitted
5. Provide reports to auditor

**Audit-Friendly Practices:**
- Use auto-generated invoice numbers
- Never delete invoices (void if needed)
- Document void reasons (add note to voided invoice)
- Reconcile payments monthly
- Keep supporting documents attached to invoices

**Pro Tip:** Conduct internal audit annually before tax season. Catch and fix issues early. Clean books = smooth audit = less stress.

---

## FAQ - Invoices Module

**Q: Can I customize invoice numbering format?**
- Yes. Navigate to **Settings → Invoices → Numbering** to set prefix, starting number, and format.

**Q: What happens if I delete an invoice?**
- Invoice moves to Trash (recoverable for 90 days). After 90 days, permanently deleted. Better to void than delete (preserves audit trail).

**Q: Can I edit an invoice after sending?**
- Technically yes, but not recommended. Better to void original and create new invoice with corrections (maintains audit trail).

**Q: How do I handle foreign currency invoices?**
- Set currency per invoice (dropdown). NextCRM supports 150+ currencies. Exchange rates updated daily (automatic conversion for reports).

**Q: Can I attach purchase orders to invoices?**
- Yes. Attach files to invoice or enter PO number in reference field.

**Q: What's the difference between invoice date and due date?**
- **Invoice date** = Date issued. **Due date** = Date payment expected. Example: Invoice date Nov 1, Due date Dec 1 (Net 30 terms).

**Q: Can customers pay online?**
- Yes (if Stripe integration enabled). Invoice includes "Pay Now" button. Customer clicks → enters card details → pays instantly.

**Q: How do I handle subscription upgrades/downgrades mid-cycle?**
- Issue credit note for unused portion of old subscription. Create new invoice for upgraded subscription (prorated for remainder of cycle).

**Q: Can I invoice in multiple languages?**
- Yes. Invoice templates support 30+ languages. Select customer language in account settings.

**Q: What if customer disputes invoice?**
- Mark invoice as "Disputed". Add notes documenting dispute. Resolve with customer. Update or void invoice based on resolution.

---

## Next Steps

**You've mastered NextCRM Invoices!** Here's what to explore next:

1. **[CRM Guide](./CRM-GUIDE.md)** - Link invoices to customer accounts and opportunities
2. **[Documents Guide](./DOCUMENTS-GUIDE.md)** - Attach contracts and supporting documents to invoices
3. **[Admin Guide](./ADMIN-GUIDE.md)** - Configure invoice settings, tax rates, and payment gateways
4. **[Reports](./ADMIN-GUIDE.md#reporting)** - Deep dive into financial reporting

**Need Help?**
- [FAQ](./FAQ.md) - Frequently asked questions
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
- Support: support@nextcrm.io

---

**Last Updated:** 2024-11-17
**Guide Version:** 1.0
**Feedback:** docs@nextcrm.io
