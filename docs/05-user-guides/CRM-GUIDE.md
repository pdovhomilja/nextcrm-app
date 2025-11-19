# CRM Guide - Complete Customer Relationship Management

**Last Updated:** 2024-11-17
**Read Time:** 15-20 minutes
**For:** Sales teams, account managers, business development professionals

---

## Table of Contents

1. [CRM Overview](#crm-overview)
2. [Accounts Management](#accounts-management)
3. [Leads Management](#leads-management)
4. [Opportunities & Deals](#opportunities--deals)
5. [Contacts Management](#contacts-management)
6. [CRM Analytics & Reporting](#crm-analytics--reporting)

---

## CRM Overview

### What is NextCRM CRM?

NextCRM's CRM (Customer Relationship Management) module is your central hub for managing customer relationships, tracking sales pipelines, and growing your business. It provides a complete system for managing every stage of your customer journey—from first contact to closed deals.

### Key Concepts

**Accounts** - Organizations or companies you do business with (e.g., "Acme Corporation")
**Leads** - Potential customers who have shown interest but haven't been qualified yet
**Contacts** - Individual people at companies (e.g., "John Smith, CEO at Acme Corp")
**Opportunities** - Qualified sales deals moving through your pipeline
**Watchers** - Team members who receive notifications about changes to records

### Why CRM Matters

A well-maintained CRM helps you:
- Never lose track of a potential customer
- See your entire sales pipeline at a glance
- Forecast revenue accurately
- Improve team collaboration
- Close more deals faster
- Build stronger customer relationships

### Common Workflows in Sales Teams

**New Lead → Qualified Opportunity → Closed Deal**
1. Marketing generates a lead (trade show, website form, referral)
2. Sales rep contacts the lead (status: NEW → CONTACTED)
3. Lead is qualified (status: CONTACTED → QUALIFIED)
4. Opportunity is created with deal value and timeline
5. Opportunity moves through pipeline stages (Prospecting → Proposal → Negotiation)
6. Deal closes (Won or Lost)

### CRM Dashboard Overview

When you open the CRM module, you'll see:
- **Navigation sidebar** - Access Accounts, Leads, Contacts, Opportunities
- **Search bar** - Quick search across all CRM records
- **Filter controls** - Filter by assigned user, status, date range
- **Data table** - View, sort, and manage records
- **Action buttons** - Create new records, import data, export reports

**Pro Tip:** Use keyboard shortcut `Ctrl/Cmd + K` to quickly search across all CRM records without clicking through menus.

---

## Accounts Management

### Understanding Accounts

Accounts represent **companies or organizations** you do business with. An account is the parent entity that contains contacts, opportunities, and activities. Think of accounts as the "company profile" in your CRM.

**Example accounts:**
- Acme Corporation (customer)
- Beta Industries (prospect)
- Gamma Partners (vendor)

### Creating New Accounts

#### Step-by-Step: Manual Account Creation

1. Navigate to **CRM → Accounts**
2. Click **+ New Account** button (top right)
3. Fill in required fields:

**Basic Information:**
- **Account Name*** (required) - Company name (e.g., "Acme Corporation")
- **Website** - Company website URL
- **Office Phone** - Main business phone number
- **Email** - Primary company email address
- **Fax** - Fax number (if applicable)

**Business Details:**
- **Industry** - Select from dropdown (Technology, Manufacturing, Healthcare, Finance, etc.)
- **Type** - Customer, Partner, Vendor, Prospect
- **Status** - Active or Inactive
- **Employees** - Number of employees (e.g., "50-100")
- **Annual Revenue** - Estimated revenue (e.g., "$5M - $10M")
- **Company ID** - Internal reference number
- **VAT** - VAT/Tax identification number

**Billing Address:**
- Street address
- City
- State/Province
- Postal code
- Country

**Shipping Address:**
- Street address (if different from billing)
- City
- State/Province
- Postal code
- Country

**Assignment:**
- **Assigned To** - Select team member who owns this account
- **Watchers** - Select team members to notify of changes

**Additional Information:**
- **Description** - Free-form notes about the account
- **Member Of** - Parent account (for subsidiaries)

4. Click **Save** to create the account

**Screenshot Placeholder:** `[Create Account Form - Showing all fields filled with example data for "Acme Corporation"]`

**Pro Tip:** Always fill in as much information as possible during account creation. Complete profiles help your team understand customer context quickly.

#### Viewing Account Details

After creating an account, you can view:
- **Overview tab** - All account information at a glance
- **Contacts tab** - People associated with this account
- **Opportunities tab** - Active deals with this customer
- **Documents tab** - Contracts, proposals, presentations
- **Activity tab** - Timeline of interactions (calls, emails, meetings)
- **Tasks tab** - Follow-up actions and reminders

**Video Recommendation:** "Creating Your First Account" (3 min tutorial - coming soon)

#### Adding Contacts to Accounts

After creating an account, add the people you work with:

1. Open the account record
2. Click **Contacts** tab
3. Click **+ Add Contact**
4. Fill in contact details (see [Contacts Management](#contacts-management))
5. The contact is automatically linked to this account

**Best Practice:** Add at least one primary contact per account so your team knows who to reach out to.

#### Linking Opportunities to Accounts

All opportunities should be linked to an account:

1. Open the account record
2. Click **Opportunities** tab
3. Click **+ New Opportunity**
4. Account field is pre-filled
5. Enter opportunity details (see [Opportunities & Deals](#opportunities--deals))

#### Account Activity Timeline

The activity timeline shows:
- **Created** - When account was added to CRM
- **Updated** - Any changes to account fields (tracked automatically)
- **Emails** - Sent/received emails (if email integration is enabled)
- **Calls** - Logged phone conversations
- **Meetings** - Scheduled appointments
- **Notes** - Manual entries by team members
- **Opportunities** - Deal stage changes
- **Documents** - Uploaded files

To add a manual activity:
1. Open account record
2. Click **Activity** tab
3. Click **+ Log Activity**
4. Select type (Call, Meeting, Note)
5. Enter details and save

#### Watchers System

Watchers are team members who receive notifications when an account is updated.

**To add watchers:**
1. Open account record
2. Click **Edit**
3. Scroll to **Watchers** field
4. Select team members from dropdown (multi-select)
5. Click **Save**

**Watchers receive notifications for:**
- Account field changes (status, revenue, owner)
- New opportunities created
- New documents uploaded
- New contacts added
- Status changes (Active → Inactive)

**Use Case:** Add your sales manager as a watcher on high-value accounts so they stay informed without manual updates.

**Pro Tip:** Don't over-use watchers. Only add team members who truly need real-time updates. Too many watchers = notification overload.

#### Account Status Tracking

Accounts have two status values:

**Status Field:**
- **Active** - Currently doing business or actively pursuing
- **Inactive** - No longer pursuing or dormant

**Type Field:**
- **Customer** - Paying customer
- **Prospect** - Potential customer (not yet paying)
- **Partner** - Business partner or reseller
- **Vendor** - Supplier or service provider

**Workflow Example:**
1. New prospect created (Type: Prospect, Status: Active)
2. First deal closes (Type changes to: Customer)
3. Customer stops purchasing (Status changes to: Inactive)
4. Customer returns (Status changes back to: Active)

#### Bulk Import from CSV

Import multiple accounts at once:

**Step-by-Step:**

1. Navigate to **CRM → Accounts**
2. Click **Import** button (top right)
3. Download the CSV template:
   - Click **Download Template**
   - Template includes all field names as column headers
4. Fill in your data in Excel/Google Sheets:

**CSV Template Columns:**
```csv
name,website,office_phone,email,industry,type,status,employees,annual_revenue,billing_street,billing_city,billing_state,billing_postal_code,billing_country,assigned_to_email
Acme Corporation,acme.com,555-0100,info@acme.com,Technology,Customer,Active,100-500,$10M-$50M,123 Main St,San Francisco,CA,94102,USA,john@yourcompany.com
Beta Industries,beta.com,555-0200,contact@beta.com,Manufacturing,Prospect,Active,50-100,$5M-$10M,456 Oak Ave,Austin,TX,78701,USA,jane@yourcompany.com
```

5. Save your file as CSV
6. Click **Choose File** and select your CSV
7. Map columns to NextCRM fields (if needed)
8. Click **Import**
9. Review import results:
   - **Success** - Number of accounts created
   - **Errors** - Rows that failed with error messages
   - **Duplicates** - Accounts that already exist (skipped)

**Important Notes:**
- **Duplicates are detected by email address** - If email exists, row is skipped
- **Required fields** - Only `name` is required (other fields optional)
- **Assigned To** - Use the assignee's email address (must be active user)
- **Maximum file size** - 5MB per CSV file
- **Maximum rows** - 10,000 accounts per import

**Common Import Errors:**
- "Invalid email format" - Check email addresses are valid (name@domain.com)
- "User not found" - Assigned user email doesn't match any active user
- "Invalid industry" - Use exact industry names from dropdown
- "Duplicate email" - Account with this email already exists

**Pro Tip:** Test your import with 5-10 rows first to ensure formatting is correct before importing thousands of records.

**Video Recommendation:** "Bulk Import Accounts from CSV" (5 min tutorial - coming soon)

#### Account Search and Filtering

**Quick Search:**
1. Navigate to **CRM → Accounts**
2. Use search box (top right)
3. Search by:
   - Account name
   - Email address
   - Phone number
   - Website
4. Results appear instantly (live search)

**Advanced Filtering:**
1. Click **Filters** button
2. Set filter criteria:
   - **Assigned To** - Filter by account owner
   - **Status** - Active, Inactive, or Both
   - **Type** - Customer, Prospect, Partner, Vendor
   - **Industry** - Select one or multiple industries
   - **Date Created** - Date range (Last 7 days, Last 30 days, Custom)
   - **Revenue Range** - Min/max annual revenue
3. Click **Apply Filters**
4. Results update instantly

**Saved Filters:**
- Click **Save Filter** to create reusable filter
- Give it a name (e.g., "My Active Customers")
- Access from **Saved Filters** dropdown

**Pro Tip:** Create saved filters for your most common views like "My Active Accounts" or "High Revenue Prospects" to save time.

#### Exporting Account Data

Export accounts to CSV or Excel:

1. Navigate to **CRM → Accounts**
2. Apply filters (optional - export filtered results only)
3. Click **Export** button
4. Choose format:
   - **CSV** - Plain text file (opens in Excel)
   - **Excel (XLSX)** - Native Excel format with formatting
5. Select fields to include:
   - **All fields** - Complete export
   - **Visible fields only** - Only fields shown in table
   - **Custom selection** - Choose specific fields
6. Click **Download Export**
7. File downloads to your browser's download folder

**Export includes:**
- All selected accounts (respects filters)
- All data fields
- Contact count per account
- Opportunity count per account
- Total opportunity value per account

**Use Cases:**
- Share account list with sales leadership
- Import to marketing automation tool
- Create custom reports in Excel
- Backup CRM data

**Note:** Exports respect permissions - you can only export accounts you have access to view.

---

## Leads Management

### What is a Lead?

A **lead** is a potential customer who has shown interest in your product or service but hasn't been qualified yet. Leads are "unverified opportunities" - you don't know if they're a good fit or have budget until you contact them.

**Lead examples:**
- Website contact form submission
- Trade show booth visitor
- Referral from existing customer
- Cold outreach response
- Downloaded whitepaper or ebook

**Lead vs. Account vs. Contact:**
- **Lead** - Unqualified potential customer (may or may not have company info)
- **Account** - Qualified company you're actively pursuing or doing business with
- **Contact** - Specific person at a company (linked to account)

**Why leads matter:** Leads are the top of your sales funnel. Proper lead management ensures no potential customer falls through the cracks.

### Creating Leads

#### Step-by-Step: Manual Lead Entry

1. Navigate to **CRM → Leads**
2. Click **+ New Lead** button
3. Fill in lead information:

**Personal Information:**
- **First Name** - Lead's first name (optional but recommended)
- **Last Name*** (required) - Lead's last name
- **Email** - Lead's email address
- **Phone** - Lead's phone number
- **Job Title** - Lead's position (e.g., "VP of Marketing")

**Company Information:**
- **Company** - Company name
- **Description** - Notes about the lead and their needs

**Lead Source Tracking:**
- **Lead Source** - Where did this lead come from?
  - Website
  - Referral
  - Trade Show
  - Cold Call
  - Social Media
  - Advertisement
  - Partner
  - Other
- **Referred By** - Name of person who referred (if applicable)
- **Campaign** - Marketing campaign name (if tracked)

**Lead Status:**
- **Status** - Current stage in lead lifecycle:
  - **NEW** - Just received, not yet contacted
  - **CONTACTED** - Initial outreach made
  - **QUALIFIED** - Verified as good fit with budget/authority/need/timeline
  - **LOST** - Not a good fit or not interested
- **Type** - Lead type (default: DEMO)

**Assignment:**
- **Assigned To** - Sales rep responsible for this lead

4. Click **Save** to create the lead

**Screenshot Placeholder:** `[New Lead Form - Filled with example: Sarah Johnson, Marketing Director at Beta Industries, from Trade Show]`

**Pro Tip:** Always capture lead source. Tracking where leads come from helps you invest in the right marketing channels.

### Lead Scoring System

NextCRM automatically calculates a lead score based on:
- **Completeness** - More filled fields = higher score
- **Engagement** - Email opens, link clicks, website visits
- **Fit** - Job title, company size, industry match
- **Recency** - Recent activity = higher score

**Lead scores range from 0-100:**
- **80-100** - Hot lead (high priority, contact immediately)
- **60-79** - Warm lead (good fit, follow up soon)
- **40-59** - Cold lead (needs nurturing)
- **0-39** - Low quality (may not be worth pursuing)

**View lead score:**
1. Open lead record
2. Score displays at top of page (colored indicator)
3. Click score to see breakdown of factors

**Pro Tip:** Sort your leads by score (high to low) to prioritize outreach. Focus on hot leads first to maximize conversion rates.

### Lead Qualification Workflow

**Goal:** Determine if a lead is worth pursuing as an opportunity.

**Qualification Criteria (BANT Framework):**
- **Budget** - Can they afford your solution?
- **Authority** - Are you talking to the decision-maker?
- **Need** - Do they have a problem you can solve?
- **Timeline** - When do they need a solution?

**Step-by-Step Qualification Process:**

**1. Initial Contact (NEW → CONTACTED)**
1. Open lead record
2. Note the lead source and any context
3. Research the company (check website, LinkedIn)
4. Make initial contact (phone call or personalized email)
5. Update lead status to **CONTACTED**
6. Log activity:
   - Click **Activity** tab
   - Click **Log Call** or **Log Email**
   - Enter notes about conversation
   - Set follow-up reminder if needed

**2. Discovery Call (CONTACTED → QUALIFIED or LOST)**
1. Schedule discovery call with lead
2. Ask qualification questions:
   - "What problem are you trying to solve?"
   - "What's your budget range for this?"
   - "Who else is involved in this decision?"
   - "When do you need this implemented?"
3. After call, update lead:
   - If qualified: Change status to **QUALIFIED**
   - If not a fit: Change status to **LOST**
4. Log call notes in activity timeline

**3. Convert to Opportunity (QUALIFIED leads only)**
1. Open qualified lead record
2. Click **Convert to Opportunity** button
3. System creates:
   - **New Account** (if company doesn't exist)
   - **New Contact** (lead becomes a contact)
   - **New Opportunity** (deal in pipeline)
4. Lead is marked as converted (archived from active leads)

**Screenshot Placeholder:** `[Lead Qualification Workflow Diagram - Visual flowchart showing NEW → CONTACTED → QUALIFIED → OPPORTUNITY CREATED]`

**Common Disqualification Reasons:**
- No budget
- Not the decision-maker (and can't introduce you)
- No clear need or pain point
- Timeline is too far out (>12 months)
- Company size/type doesn't fit
- Already using competitor (happy with solution)

**Pro Tip:** Don't let leads sit in "NEW" status for more than 24 hours. Speed to contact is critical - leads go cold quickly.

**Video Recommendation:** "Qualifying Leads in 5 Minutes" (5 min tutorial - coming soon)

### Converting Qualified Leads to Opportunities

When a lead is qualified, convert it to an opportunity:

**Automatic Conversion Process:**

1. Open the qualified lead
2. Click **Convert to Opportunity** button
3. Conversion wizard appears:

**Step 1: Create or Link Account**
- **New Account** - System creates new account from lead's company name
- **Existing Account** - Search and select existing account
- Review account fields (auto-populated from lead data)

**Step 2: Create Contact**
- Contact is automatically created from lead information
- First name, last name, email, phone, job title transferred
- Contact is linked to the account

**Step 3: Create Opportunity**
- **Opportunity Name** - Pre-filled (e.g., "Beta Industries - Software Purchase")
- **Expected Revenue** - Enter deal value
- **Close Date** - Expected close date
- **Sales Stage** - Default: Prospecting (first stage)
- **Assigned To** - Defaults to lead owner

4. Click **Convert & Create Opportunity**
5. System creates all records and links them together
6. Lead is marked as "Converted" and removed from active leads list

**After Conversion:**
- Navigate to **Opportunities** to see your new deal
- Contact the customer to move deal forward
- Update opportunity stage as progress is made

**Pro Tip:** Before converting, ensure the lead is truly qualified. Converting unqualified leads pollutes your pipeline with deals that won't close.

### Bulk Lead Import (CSV with Mapping)

Import large lead lists from events, marketing campaigns, or purchased lists:

**Step-by-Step:**

1. Navigate to **CRM → Leads**
2. Click **Import Leads** button
3. Download CSV template:
   - Click **Download Template**
   - Template shows all available fields

**CSV Template Example:**
```csv
first_name,last_name,email,phone,company,job_title,lead_source,status,assigned_to_email
Sarah,Johnson,sarah@beta.com,555-0100,Beta Industries,Marketing Director,Trade Show,NEW,john@yourcompany.com
Michael,Chen,mchen@gamma.com,555-0200,Gamma Corp,VP Sales,Website,NEW,jane@yourcompany.com
```

4. Fill in your leads in the template
5. Save as CSV file
6. Upload CSV file (click **Choose File**)
7. **Map columns** to NextCRM fields:
   - If your CSV headers don't match exactly, map each column
   - Example: Your "Email Address" column → NextCRM "email" field
   - Skip columns you don't want to import
8. Set import options:
   - **Auto-assign** - Distribute leads round-robin to team
   - **Skip duplicates** - Don't import leads with duplicate emails
   - **Update existing** - Update leads if email matches
9. Click **Import Leads**
10. Review results:
    - Leads created successfully
    - Leads skipped (duplicates)
    - Errors (with details)

**Import Best Practices:**
- Always include **last_name** and **email** at minimum
- Include **lead_source** to track where leads came from
- Use **assigned_to_email** to assign leads to specific reps
- Test with 5-10 rows before full import
- Clean data before import (remove duplicates, fix formatting)

**Common Import Issues:**
- "Duplicate email" - Lead with this email already exists (skipped)
- "Invalid assigned user" - Email doesn't match any active user
- "Missing required field" - last_name is required
- "Invalid status" - Use exact status values: NEW, CONTACTED, QUALIFIED, LOST

**Pro Tip:** After importing leads from a trade show or event, immediately assign them to your team and set a task to contact within 24 hours. Strike while the iron is hot!

### Lead Deduplication

NextCRM automatically prevents duplicate leads based on email address:

**Automatic Deduplication:**
- When creating a new lead manually, system checks if email exists
- If duplicate found, warning appears: "Lead with this email already exists"
- Option to view existing lead or continue anyway

**Finding Duplicates:**
1. Navigate to **CRM → Leads**
2. Click **Tools → Find Duplicates**
3. System scans for:
   - Exact email matches
   - Similar names + company matches
   - Phone number matches
4. Review duplicate pairs
5. Choose action:
   - **Merge** - Combine into single lead (keeps most complete record)
   - **Keep Both** - Mark as not duplicates
   - **Delete** - Remove duplicate

**Manual Merge Process:**
1. Select two duplicate leads (checkboxes)
2. Click **Merge Leads** button
3. Choose which record to keep as primary
4. Select fields to keep from secondary record
5. Click **Merge**
6. Primary record is updated, secondary is deleted

**Pro Tip:** Run duplicate detection monthly to keep your lead database clean. Duplicates waste time and create confusion about which record is current.

### Lead Reassignment Between Sales Reps

Transfer leads between team members:

**Single Lead Reassignment:**
1. Open lead record
2. Click **Edit**
3. Change **Assigned To** field (dropdown)
4. Click **Save**
5. New assignee receives notification
6. Lead appears in their "My Leads" view

**Bulk Reassignment:**
1. Navigate to **CRM → Leads**
2. Select multiple leads (checkboxes)
3. Click **Bulk Actions → Reassign**
4. Select new owner (dropdown)
5. Click **Reassign Selected**
6. All selected leads transfer to new owner

**Use Cases:**
- Territory changes (rep moves to new region)
- Load balancing (redistribute leads evenly)
- Vacation coverage (temporary reassignment)
- Rep departure (reassign to team)

**Pro Tip:** When reassigning leads, notify the new owner personally (don't just rely on system notification). Provide context on high-priority leads.

### Lead Source Tracking

Track where your leads come from to measure marketing ROI:

**Available Lead Sources:**
- Website (contact form, live chat)
- Referral (customer or partner referral)
- Trade Show (conference or event)
- Cold Call (outbound prospecting)
- Social Media (LinkedIn, Twitter, Facebook)
- Advertisement (Google Ads, Facebook Ads)
- Partner (channel partner or reseller)
- Email Campaign (marketing email)
- Content Download (whitepaper, ebook)
- Webinar (online event)
- Other (catch-all)

**Setting Lead Source:**
1. When creating lead, select **Lead Source** dropdown
2. If **Referral**, enter **Referred By** name
3. If from marketing campaign, enter **Campaign** name

**Viewing Lead Source Reports:**
1. Navigate to **CRM → Reports → Lead Source Report**
2. See breakdown by source:
   - Number of leads per source
   - Conversion rate per source (% that became opportunities)
   - Revenue per source
   - Cost per lead (if marketing costs tracked)
3. Use data to optimize marketing spend

**Pro Tip:** Consistently track lead source for every lead. After 3-6 months, you'll have clear data on which channels deliver the best leads.

### Viewing Lead Activity

Every lead has an activity timeline showing:
- **Created** - When lead was added to system
- **Status Changes** - NEW → CONTACTED → QUALIFIED → LOST
- **Emails** - Sent and received (if email integration enabled)
- **Calls** - Logged phone conversations
- **Notes** - Manual entries
- **Tasks** - Follow-up reminders
- **Converted** - When lead became opportunity

**To view activity:**
1. Open lead record
2. Click **Activity** tab
3. Timeline displays in reverse chronological order (newest first)

**To add manual activity:**
1. Click **Log Activity** button
2. Select activity type (Call, Email, Meeting, Note)
3. Enter details:
   - **Subject** - Activity title
   - **Description** - Notes and details
   - **Date/Time** - When activity occurred
4. Click **Save**

**Pro Tip:** Log every customer interaction. A complete activity timeline is invaluable for understanding customer context and handoffs between team members.

### Exporting Leads

Export your lead list:

1. Navigate to **CRM → Leads**
2. Apply filters (export filtered leads only, or all)
3. Click **Export** button
4. Choose format (CSV or Excel)
5. Select fields to include
6. Click **Download**

**Use Cases:**
- Import to email marketing tool (Mailchimp, HubSpot)
- Share with sales leadership
- Backup lead database
- Analyze in Excel

**Note:** Export includes current status and all fields. Use filters to export specific segments (e.g., "All NEW leads from last month").

---

## Opportunities & Deals

### What is an Opportunity?

An **opportunity** (also called a "deal") is a **qualified sales prospect** with a defined value and timeline. Opportunities move through your sales pipeline as you progress toward closing the deal.

**Key characteristics of an opportunity:**
- Linked to an Account (company)
- Has a monetary value (Expected Revenue)
- Has an expected close date
- Has a defined sales stage (Prospecting → Closed Won/Lost)
- Has a probability of closing (%)

**Example opportunities:**
- "Acme Corp - Enterprise Software License ($50,000)"
- "Beta Industries - Annual Subscription ($12,000)"
- "Gamma Partners - Consulting Project ($75,000)"

**Opportunity vs. Lead:**
- **Lead** = Unqualified potential customer (might not be a good fit)
- **Opportunity** = Qualified deal in pipeline (verified budget, need, timeline)

### Creating Opportunities from Leads or Accounts

**Method 1: Convert Qualified Lead (Recommended)**

1. Navigate to **CRM → Leads**
2. Open a **QUALIFIED** lead
3. Click **Convert to Opportunity**
4. Fill in opportunity details (see below)
5. Account, contact, and opportunity are created automatically

**Method 2: Create Opportunity from Account**

1. Navigate to **CRM → Accounts**
2. Open an existing account
3. Click **Opportunities** tab
4. Click **+ New Opportunity**
5. Fill in opportunity details (account is pre-filled)

**Method 3: Create Standalone Opportunity**

1. Navigate to **CRM → Opportunities**
2. Click **+ New Opportunity**
3. Fill in all details:

**Opportunity Information:**
- **Opportunity Name*** (required) - Deal name (e.g., "Acme Corp - Q4 Software Purchase")
- **Account*** (required) - Select company (dropdown)
- **Contact** - Primary contact for this deal (dropdown)
- **Description** - Deal details, customer needs, solution proposed

**Financial Details:**
- **Expected Revenue*** (required) - Deal value in dollars (e.g., 50000)
- **Budget** - Customer's stated budget (optional)
- **Currency** - USD, EUR, GBP, etc. (default: USD)

**Timeline:**
- **Close Date*** (required) - Expected date to close deal
- **Created On** - Auto-populated (deal creation date)
- **Last Activity** - Auto-updated when deal is touched

**Sales Stage:**
- **Sales Stage*** (required) - Current stage in pipeline (see Deal Pipeline Stages below)
- System auto-calculates **Probability** based on stage

**Assignment:**
- **Assigned To** - Sales rep owner
- **Created By** - Auto-populated (you)

**Additional Tracking:**
- **Next Step** - What needs to happen next (e.g., "Send proposal", "Schedule demo")
- **Campaign** - Marketing campaign that generated this opportunity
- **Type** - Opportunity type (New Business, Upsell, Renewal)
- **Status** - ACTIVE, INACTIVE, PENDING, CLOSED

4. Click **Save**

**Screenshot Placeholder:** `[New Opportunity Form - Example: "Acme Corp - Enterprise License" with $50,000 value, Close Date 3 months out, Stage: Proposal]`

**Pro Tip:** Always enter "Next Step" to keep the deal moving forward. This ensures you and your team know exactly what action is required.

### Deal Pipeline Stages

Opportunities move through a standardized pipeline:

**Stage 1: Prospecting (10% probability)**
- Initial qualification complete
- Customer need identified
- Budget range confirmed
- **Next Steps:** Schedule discovery call, gather requirements

**Stage 2: Qualified (25% probability)**
- BANT criteria met (Budget, Authority, Need, Timeline)
- Decision-makers identified
- Competitors known
- **Next Steps:** Develop solution, prepare proposal

**Stage 3: Proposal (50% probability)**
- Solution designed and documented
- Proposal or quote sent to customer
- Pricing negotiation underway
- **Next Steps:** Schedule presentation, answer questions

**Stage 4: Negotiation (75% probability)**
- Customer committed to buying
- Final details being negotiated (price, terms, timeline)
- Legal review in progress
- **Next Steps:** Finalize contract, handle objections

**Stage 5: Closed Won (100% probability)**
- Deal closed successfully
- Contract signed
- Payment received or invoicing initiated
- **Outcome:** Revenue recognized, customer onboarding begins

**Stage 6: Closed Lost (0% probability)**
- Deal lost to competitor or no decision
- Budget cut or project cancelled
- **Action Required:** Document loss reason for future learning

**Viewing Your Pipeline:**
1. Navigate to **CRM → Opportunities**
2. View as **Pipeline Board** (Kanban view)
3. Each column = one stage
4. Drag and drop opportunities between stages
5. Card shows: Deal name, value, close date, owner

**Screenshot Placeholder:** `[Pipeline Kanban Board - Showing opportunities organized by stage with deal cards]`

**Pro Tip:** Move deals to the next stage only when objective criteria are met. Don't push deals forward prematurely—accurate pipeline forecasting depends on honest stage assessment.

### Deal Probability Percentages

Each sales stage has an associated **win probability** (likelihood of closing):

| Sales Stage | Probability | Meaning |
|-------------|-------------|---------|
| Prospecting | 10% | 1 in 10 deals at this stage will close |
| Qualified | 25% | 1 in 4 deals at this stage will close |
| Proposal | 50% | 1 in 2 deals at this stage will close |
| Negotiation | 75% | 3 in 4 deals at this stage will close |
| Closed Won | 100% | Deal closed successfully |
| Closed Lost | 0% | Deal lost |

**How probability is used:**
- **Weighted Pipeline Value** = Sum of (Deal Value × Probability)
- Example: 10 deals at Proposal stage ($50K each) = $250K weighted pipeline
- Helps forecast realistic revenue (not just "best case")

**Viewing Probability:**
1. Open opportunity record
2. Probability displays next to Sales Stage
3. Auto-updates when stage changes

**Manual Override:**
- You can manually adjust probability if your deal is unique
- Click **Edit** → Change **Probability** field → **Save**
- Use sparingly—trust your process, not gut feelings

### Activity Tracking on Deals

Every opportunity has an activity timeline:

**Tracked Automatically:**
- Stage changes (Prospecting → Qualified)
- Field updates (Close date changed, value updated)
- Emails sent/received (if email integration enabled)
- Documents added (proposals, contracts)
- Created by / Updated by

**Added Manually:**
1. Open opportunity
2. Click **Activity** tab
3. Click **Log Activity**
4. Select type:
   - **Call** - Phone conversation
   - **Meeting** - In-person or virtual meeting
   - **Email** - Manual email log (if not auto-synced)
   - **Note** - General update
5. Fill in details:
   - **Subject** - Activity title
   - **Description** - Detailed notes
   - **Date/Time** - When it occurred
   - **Participants** - Who was involved
6. Click **Save**

**Activity Best Practices:**
- Log every customer touchpoint (calls, meetings, emails)
- Include key discussion points and customer concerns
- Note next steps and commitments made
- Tag team members who need visibility (@mention)

**Pro Tip:** Before any customer meeting, review the activity timeline to refresh your memory on previous conversations. This context prevents you from repeating questions and shows the customer you're paying attention.

### Sales Forecasting (Predicting Revenue)

Use opportunities to forecast future revenue:

**Forecast Calculation:**
- **Total Pipeline Value** = Sum of all opportunity values
- **Weighted Pipeline Value** = Sum of (Opportunity Value × Probability)

**Example:**
- 5 deals at Prospecting ($100K total) → $10K weighted (10%)
- 3 deals at Qualified ($75K total) → $18.75K weighted (25%)
- 2 deals at Proposal ($50K total) → $25K weighted (50%)
- 1 deal at Negotiation ($30K total) → $22.5K weighted (75%)
- **Total Weighted Pipeline = $76.25K** (expected revenue this quarter)

**Viewing Forecast:**
1. Navigate to **CRM → Opportunities**
2. Click **Forecast** tab
3. Select date range (This Month, This Quarter, This Year)
4. View metrics:
   - Total pipeline value
   - Weighted pipeline value
   - Number of opportunities
   - Average deal size
   - Win rate (%)
5. Filter by:
   - Assigned to (specific rep or team)
   - Close date range
   - Sales stage

**Screenshot Placeholder:** `[Forecast Dashboard - Bar chart showing weighted pipeline by month, with breakdown by sales stage]`

**Pro Tip:** Review your forecast weekly. Compare "Last Week" to "This Week" to understand pipeline health. If weighted value is dropping, you need to generate more leads or move deals forward faster.

### Deal Value and Timeline

**Setting Deal Value:**
- Enter **Expected Revenue** when creating opportunity
- Update as proposal is refined and pricing is negotiated
- Final value should match contract value at "Closed Won"

**Setting Close Date:**
- Enter **Close Date** when creating opportunity
- Based on customer's stated timeline
- Update as timeline shifts (customers often delay decisions)
- Use realistic dates—not "hopeful" dates

**Tracking Changes:**
- System tracks every change to value and close date
- View change history in Activity timeline
- Useful for understanding why forecasts changed

**Pro Tip:** If a deal's close date keeps getting pushed out (3+ times), it's a signal that the customer isn't ready to buy. Re-qualify the opportunity or move it to "Closed Lost."

### Next Steps and Follow-Up Dates

Keep deals moving forward:

**Next Step Field:**
- Text field describing the immediate next action
- Examples:
  - "Send proposal by Friday"
  - "Schedule demo with VP"
  - "Follow up after they review with legal"
  - "Send contract for signature"

**Setting Next Step:**
1. Open opportunity
2. Click **Edit**
3. Update **Next Step** field
4. Click **Save**

**Creating Follow-Up Tasks:**
1. Open opportunity
2. Click **Tasks** tab
3. Click **+ New Task**
4. Fill in task details:
   - **Title** - What needs to be done
   - **Due Date** - When it's due
   - **Assigned To** - Who's responsible (usually you)
   - **Priority** - Low, Medium, High, Urgent
5. Click **Save**
6. Task appears in your **Tasks** dashboard
7. You'll receive reminder notification

**Pro Tip:** After every customer interaction, immediately update "Next Step" and create a follow-up task. This prevents deals from going stale because you forgot to follow up.

**Video Recommendation:** "Moving Deals Through Your Pipeline" (4 min tutorial - coming soon)

### Deal Closing Workflows

**Closing a Won Deal:**

1. Customer signs contract and commits to purchase
2. Open opportunity
3. Click **Edit**
4. Change **Sales Stage** to **Closed Won**
5. Verify **Expected Revenue** matches final contract value
6. Update **Close Date** to actual close date
7. Click **Save**
8. System marks probability as 100%
9. Revenue is counted in reports
10. Celebrate!

**Post-Close Actions:**
- Create invoice (link to account)
- Start customer onboarding process
- Update account status to "Customer" (if was Prospect)
- Set task for account review in 30 days

**Closing a Lost Deal:**

1. Customer chooses competitor, cuts budget, or cancels project
2. Open opportunity
3. Click **Edit**
4. Change **Sales Stage** to **Closed Lost**
5. **Required:** Select **Loss Reason** (dropdown):
   - Lost to Competitor
   - No Budget
   - No Decision
   - Poor Timing
   - Poor Fit
   - Price Too High
   - Other (specify)
6. Add **Loss Notes** - What happened? What could we have done differently?
7. Click **Save**
8. Opportunity moves to closed deals (out of active pipeline)

**Learning from Losses:**
1. Navigate to **CRM → Reports → Loss Analysis**
2. View loss reasons breakdown
3. Identify patterns (e.g., "We're losing 40% of deals on price")
4. Adjust strategy (pricing, messaging, qualification)

**Pro Tip:** Don't let deals sit in "Negotiation" forever. If it's been 90+ days with no progress, mark it "Closed Lost" and move on. You can always re-open if customer comes back.

---

## Contacts Management

### What is a Contact?

A **contact** is an **individual person** at a company (account). Contacts are the people you communicate with—decision-makers, influencers, end users, and supporters.

**Key characteristics of contacts:**
- Always linked to an Account (company)
- Individual person (has first name, last name, email, phone)
- Can have multiple contacts per account
- Can be assigned a role (Decision Maker, Influencer, Champion, End User)

**Example contacts:**
- John Smith, CEO at Acme Corporation (Decision Maker)
- Sarah Johnson, VP Marketing at Acme Corporation (Influencer)
- Michael Chen, IT Manager at Acme Corporation (End User)

**Why contacts matter:** You sell to people, not companies. Tracking individual contacts ensures you're building relationships with the right people.

### Creating Contacts Manually

**Step-by-Step:**

1. Navigate to **CRM → Contacts**
2. Click **+ New Contact**
3. Fill in contact information:

**Personal Information:**
- **First Name** - Contact's first name
- **Last Name*** (required) - Contact's last name
- **Job Title** - Position at company (e.g., "Chief Technology Officer")
- **Email** - Primary work email
- **Personal Email** - Personal email (optional)
- **Office Phone** - Work phone number
- **Mobile Phone** - Cell phone number
- **Birthday** - Contact's birthday (optional, for relationship building)

**Company Linkage:**
- **Account*** (required) - Select company from dropdown
- **Position** - Role or department

**Contact Role:**
- **Type** - Relationship type:
  - **Decision Maker** - Has final authority to purchase
  - **Influencer** - Impacts the decision but doesn't sign contract
  - **Champion** - Internal advocate for your solution
  - **End User** - Will use your product/service
  - **Gatekeeper** - Controls access to decision-maker (e.g., Executive Assistant)

**Additional Information:**
- **Description** - Notes about the contact
- **Website** - Personal or professional website
- **Status** - Active or Inactive

**Social Media Profiles:**
- **LinkedIn** - LinkedIn profile URL
- **Twitter** - Twitter/X handle
- **Facebook** - Facebook profile
- **Instagram** - Instagram handle
- **YouTube** - YouTube channel
- **TikTok** - TikTok profile
- **Skype** - Skype username

**Assignment:**
- **Assigned To** - Team member responsible for this relationship

4. Click **Save**

**Screenshot Placeholder:** `[New Contact Form - Example: John Smith, CEO at Acme Corp, with all fields filled including social profiles]`

**Pro Tip:** Always fill in **Job Title** and **Type** (role). Knowing who's the decision-maker vs. influencer is critical for navigating complex sales cycles.

### Contact Roles (Decision Maker, Influencer, Champion, End User)

Understanding contact roles helps you navigate the buying committee:

**Decision Maker (Economic Buyer)**
- Has budget authority and final say
- Signs contracts and purchase orders
- Usually C-level or VP-level
- **Engagement Strategy:** Focus on ROI, business impact, strategic alignment
- **Example:** CFO, CEO, VP of Sales

**Influencer (Technical Buyer)**
- Evaluates solution fit and capabilities
- Doesn't have final authority but strong influence
- Usually manager or director level
- **Engagement Strategy:** Focus on features, benefits, technical fit
- **Example:** IT Manager, Operations Director

**Champion (Internal Coach)**
- Believes in your solution
- Advocates for you internally
- Helps you navigate organizational politics
- Sells on your behalf when you're not in the room
- **Engagement Strategy:** Arm with materials to share, keep them informed, acknowledge their support
- **Example:** Innovation-minded manager who sees value in your solution

**End User**
- Will actually use your product or service
- Cares about usability and day-to-day experience
- Can veto decision if solution is too complex
- **Engagement Strategy:** Focus on ease of use, training, support
- **Example:** Sales reps who will use CRM, accountants who will use software

**Gatekeeper**
- Controls access to decision-maker
- Can block your progress or help you advance
- Usually executive assistant or office manager
- **Engagement Strategy:** Build rapport, respect their time, make them a hero
- **Example:** CEO's Executive Assistant

**Mapping the Buying Committee:**
1. Open the account record
2. Click **Contacts** tab
3. Ensure each contact has a defined **Type**
4. Create an opportunity and link all relevant contacts
5. Track which contacts you've engaged with (Activity timeline)

**Pro Tip:** In enterprise deals, you need to influence the entire buying committee, not just one person. Map out all stakeholders early in the sales process.

### Email Addresses and Phone Numbers

**Best Practices:**
- Always get **work email** (required for email tracking)
- Optionally capture **personal email** (backup contact method)
- Capture **office phone** and **mobile phone**
- Verify phone number format (system validates)

**Email Format Validation:**
- System requires valid email format (name@domain.com)
- Invalid emails are rejected with error message

**Phone Number Format:**
- Enter phone numbers with country code for international contacts
- System accepts multiple formats:
  - (555) 123-4567
  - 555-123-4567
  - +1-555-123-4567

**Pro Tip:** If a contact gives you their personal cell number, that's a sign of strong rapport. Capture it and use it wisely (don't abuse the privilege).

### Contact Information

**Tracking Additional Context:**

**Tags:** Add keywords to categorize contacts
- Click **Tags** field
- Type keywords (e.g., "influencer", "technical", "finance")
- Use tags to create segments for targeted outreach

**Notes:** Add free-form notes
- Use **Notes** section for important context
- Examples:
  - "Prefers email over phone"
  - "Has budget authority for Q4 projects"
  - "Former customer at previous company (positive experience)"
  - "Concerned about data security"

**Custom Fields:** (If enabled by admin)
- Organization-specific fields (e.g., "Preferred Communication Method")

**Pro Tip:** After every conversation, add a note with key takeaways. In 6 months when you revisit the account, you'll be glad you captured context.

### Linking Contacts to Accounts

Contacts are always linked to accounts:

**During Contact Creation:**
- **Account** field is required
- Select from dropdown or create new account

**Linking Existing Contact to Different Account:**
1. Open contact record
2. Click **Edit**
3. Change **Account** field (dropdown)
4. Click **Save**
5. Contact now appears under new account

**Viewing All Contacts for an Account:**
1. Navigate to **CRM → Accounts**
2. Open account record
3. Click **Contacts** tab
4. View all associated contacts

**Pro Tip:** If a contact changes jobs, update their account linkage and add a note about their previous company. They may become a customer at their new employer!

### Contact Activity History

Every contact has an activity timeline:

**Tracked Automatically:**
- Emails sent and received (if email integration enabled)
- Email opens and link clicks
- Opportunities linked to this contact
- Account changes
- Field updates

**Logged Manually:**
- Phone calls
- Meetings
- Notes
- Follow-up tasks

**To view activity:**
1. Open contact record
2. Click **Activity** tab
3. Timeline displays in reverse chronological order

**To log new activity:**
1. Click **Log Activity** button
2. Select type (Call, Meeting, Note)
3. Enter details
4. Click **Save**

**Pro Tip:** Before calling a contact, review their activity timeline. You'll remember previous conversations and avoid asking the same questions twice.

### Email Integration (Auto-Linked Emails)

If email integration is enabled (see [Email Guide](./EMAIL-GUIDE.md)):

**Automatic Email Linking:**
- Emails sent to contact's email address are automatically linked to their record
- Emails received from contact are automatically linked
- View sent/received emails in contact's Activity timeline

**Email Tracking:**
- See when contact opens your email
- See when contact clicks links in your email
- Engagement data helps you prioritize follow-up

**Email from NextCRM:**
1. Open contact record
2. Click **Send Email** button
3. Compose email (templates available)
4. Click **Send**
5. Email is tracked and logged automatically

**Pro Tip:** Use email tracking to understand engagement. If a contact opens your proposal email 5 times, they're interested—follow up immediately!

### Contact Search

**Quick Search:**
1. Navigate to **CRM → Contacts**
2. Use search box (top right)
3. Search by:
   - First or last name
   - Email address
   - Phone number
   - Job title
   - Company name

**Advanced Filtering:**
1. Click **Filters** button
2. Set criteria:
   - **Account** - Filter by company
   - **Assigned To** - Filter by owner
   - **Type** - Filter by role (Decision Maker, etc.)
   - **Status** - Active or Inactive
   - **Has Email** - Contacts with/without email address
3. Click **Apply**

**Pro Tip:** Create a saved filter for "My Decision Makers" to quickly access your key contacts across all accounts.

---

## CRM Analytics & Reporting

### Sales Dashboard Overview

The CRM dashboard provides real-time visibility into your sales performance:

**Accessing the Dashboard:**
1. Navigate to **CRM → Dashboard**
2. Select date range (This Month, This Quarter, This Year, Custom)
3. Filter by team member (view your own metrics or team metrics)

**Key Metrics Displayed:**

**Pipeline Metrics:**
- **Total Pipeline Value** - Sum of all open opportunities
- **Weighted Pipeline Value** - Probability-adjusted forecast
- **Number of Opportunities** - Count of active deals
- **Average Deal Size** - Mean opportunity value

**Activity Metrics:**
- **New Leads This Period** - Lead generation rate
- **Lead Conversion Rate** - % of leads → opportunities
- **Opportunities Created** - New deals added to pipeline
- **Deals Closed Won** - Successfully closed deals
- **Deals Closed Lost** - Lost deals

**Revenue Metrics:**
- **Revenue This Period** - Closed Won revenue
- **Revenue Goal** - Target for period
- **% to Goal** - Progress toward target
- **Forecast vs. Actual** - How accurate were predictions

**Screenshot Placeholder:** `[CRM Dashboard - Overview showing key metrics in cards, pipeline chart, and activity timeline]`

### Pipeline Visualization (How Many Deals in Each Stage)

**Pipeline Funnel Chart:**
- Visual representation of deals by stage
- Width of funnel = number of opportunities
- Shows drop-off between stages

**Example Visualization:**
```
Prospecting   [████████████████████] 20 deals ($500K)
Qualified     [██████████████] 14 deals ($400K)
Proposal      [████████] 8 deals ($300K)
Negotiation   [████] 4 deals ($200K)
Closed Won    [██] 2 deals ($100K)
```

**Insights from Pipeline Visualization:**
- **Bottlenecks** - Where deals are getting stuck
- **Stage Conversion Rates** - % of deals moving to next stage
- **Pipeline Health** - Is top of funnel (Prospecting) healthy?

**To view:**
1. Navigate to **CRM → Opportunities**
2. Switch to **Pipeline View** (Kanban board)
3. Each column shows deals in that stage
4. Hover over stage header for summary (count and total value)

**Pro Tip:** If your pipeline looks like an hourglass (narrow at top, wide in middle), you have a lead generation problem. Focus on filling the top of the funnel.

### Conversion Rates (% of Deals Moving Between Stages)

Track how effectively deals progress through your pipeline:

**Conversion Metrics:**
- **Lead → Opportunity** - What % of leads become qualified deals?
- **Prospecting → Qualified** - What % of early deals get qualified?
- **Qualified → Proposal** - What % reach proposal stage?
- **Proposal → Negotiation** - What % enter final negotiations?
- **Negotiation → Closed Won** - What % close successfully?

**Viewing Conversion Rates:**
1. Navigate to **CRM → Reports → Conversion Report**
2. Select date range
3. View funnel visualization
4. See conversion % between each stage

**Benchmarks (Industry Averages):**
- Lead → Opportunity: 13%
- Prospecting → Qualified: 70%
- Qualified → Proposal: 60%
- Proposal → Negotiation: 50%
- Negotiation → Closed Won: 75%
- Overall Win Rate: 20-30%

**Improving Conversion Rates:**
- **Low Lead → Opportunity:** Improve lead quality or qualification process
- **Low Proposal → Negotiation:** Work on proposal content and presentation
- **Low Negotiation → Closed Won:** Improve objection handling and closing skills

**Pro Tip:** Focus on the stage with the lowest conversion rate. A 10% improvement in your weakest stage has bigger impact than 2% across all stages.

### Average Deal Value

Track the typical size of your deals:

**Calculation:**
- Average Deal Value = Total Pipeline Value ÷ Number of Opportunities

**Why It Matters:**
- Helps forecast how many deals you need to hit quota
- Identifies upsell opportunities (deals below average)
- Tracks whether deal sizes are growing over time

**Viewing Average Deal Value:**
1. Navigate to **CRM → Dashboard**
2. See **Average Deal Size** metric
3. Compare to previous periods (trend chart)

**Segmentation:**
- Filter by sales rep (who closes larger deals?)
- Filter by industry (which industries spend more?)
- Filter by lead source (which channels bring higher-value leads?)

**Pro Tip:** If average deal value is stagnant, focus on upselling and cross-selling to existing customers rather than only chasing new logos.

### Sales Metrics by Rep

Track individual and team performance:

**Individual Rep Metrics:**
1. Navigate to **CRM → Reports → Rep Performance**
2. Select date range
3. Select sales rep
4. View metrics:
   - **Pipeline Value** - Total value of their opportunities
   - **Opportunities Created** - New deals added
   - **Deals Closed Won** - Successfully closed deals
   - **Win Rate** - % of deals closed vs. lost
   - **Average Deal Size** - Mean value of their deals
   - **Average Sales Cycle** - Days from created to closed
   - **Activity Count** - Calls, emails, meetings logged

**Team Comparison:**
- View all reps side-by-side
- Identify top performers
- Spot coaching opportunities
- Ensure equitable lead distribution

**Leaderboard:**
1. Navigate to **CRM → Reports → Leaderboard**
2. See ranking by:
   - Revenue closed this period
   - Number of deals closed
   - Pipeline value
   - Win rate
3. Filter by time period (week, month, quarter, year)

**Screenshot Placeholder:** `[Rep Performance Dashboard - Bar chart showing revenue by rep, table with detailed metrics per person]`

**Pro Tip:** Review rep metrics weekly in team meetings. Celebrate wins publicly and provide private coaching for reps who are struggling.

### Forecast Accuracy

Measure how well you predict future revenue:

**Forecast Accuracy Calculation:**
- Compare "Forecasted Revenue" (from 90 days ago) to "Actual Revenue" (what closed)
- Example: Forecasted $100K, Closed $85K → 85% accuracy

**Why Forecast Accuracy Matters:**
- Financial planning depends on accurate forecasts
- Board and investors expect reliable revenue predictions
- Sales compensation may be tied to forecast accuracy
- Poor accuracy = poor pipeline hygiene

**Improving Forecast Accuracy:**
- Require reps to update close dates and values weekly
- Use probability-weighted forecasts (not best-case)
- Close or push deals that aren't progressing
- Implement consistent qualification criteria
- Review large deals with leadership before committing to forecast

**Viewing Forecast Accuracy:**
1. Navigate to **CRM → Reports → Forecast Accuracy**
2. Compare forecasts from prior periods to actual results
3. View accuracy by rep (who's most reliable?)
4. See which sales stages are most frequently over/under-forecasted

**Pro Tip:** If your forecast accuracy is below 70%, your sales process needs tightening. Deals are slipping through with insufficient qualification or unrealistic timelines.

### Pipeline Health Indicators

Assess the overall health of your sales pipeline:

**Healthy Pipeline Characteristics:**
- **Coverage Ratio 3:1 or higher** - Pipeline value should be 3x your quota
  - Example: $100K quota → Need $300K pipeline
  - Higher ratios (4:1, 5:1) needed for longer sales cycles
- **Top of Funnel Activity** - New leads and opportunities consistently added
- **Balanced Stages** - Deals distributed across stages (not all in one stage)
- **Forward Movement** - Deals progressing weekly, not stagnant
- **Realistic Close Dates** - Timelines align with average sales cycle

**Unhealthy Pipeline Indicators:**
- **Low Coverage Ratio** (<2:1) - Not enough pipeline to hit quota
- **Empty Top of Funnel** - Few new leads or opportunities
- **Hourglass Shape** - Narrow at Prospecting, bulging at Negotiation (deals not closing)
- **Stagnant Deals** - Opportunities with no activity in 30+ days
- **Pushed Close Dates** - Same deals pushed month after month

**Pipeline Health Report:**
1. Navigate to **CRM → Reports → Pipeline Health**
2. View metrics:
   - Coverage ratio
   - New opportunities added (last 30 days)
   - Stale deals (no activity in 30+ days)
   - Average age of opportunities by stage
   - Close date distribution (are most deals realistic?)
3. Get recommendations for improvement

**Pro Tip:** Review pipeline health monthly. Early warning signs (low coverage, stagnant deals) give you time to course-correct before missing quota.

### Custom Reports

Build custom reports for your specific needs:

**Creating a Custom Report:**
1. Navigate to **CRM → Reports → Custom Reports**
2. Click **+ New Report**
3. Select report type:
   - **Accounts Report** - Account-level data
   - **Leads Report** - Lead generation and conversion
   - **Opportunities Report** - Pipeline and forecast data
   - **Activities Report** - Call, email, meeting counts
4. Select fields to include (checkboxes)
5. Set filters (date range, assigned to, status, etc.)
6. Choose grouping (by owner, by source, by industry, etc.)
7. Select visualization (table, chart, graph)
8. Click **Generate Report**
9. View results
10. Export to CSV or Excel if needed
11. Save report for reuse (give it a name)

**Common Custom Reports:**
- "Opportunities Closing This Quarter by Rep"
- "Lead Source ROI Analysis"
- "Account Revenue History"
- "Lost Deal Analysis by Competitor"
- "Sales Activity Report (Calls/Emails per Rep)"

**Pro Tip:** Create custom reports for your weekly pipeline review meeting and save them. You'll save hours of manual data pulling each week.

---

## Common Pitfalls and How to Avoid Them

**Pitfall 1: Incomplete Data**
- **Problem:** Accounts and leads missing key information (email, phone, industry)
- **Impact:** Can't segment, can't report accurately, team lacks context
- **Solution:** Make key fields required, train team on importance of data quality

**Pitfall 2: Ignoring Lead Sources**
- **Problem:** Not tracking where leads come from
- **Impact:** Can't measure marketing ROI, can't optimize spend
- **Solution:** Always capture lead source, train team to ask "How did you hear about us?"

**Pitfall 3: Letting Leads Go Stale**
- **Problem:** Leads sit in "NEW" status for weeks without contact
- **Impact:** Lost opportunities, competitor gets there first
- **Solution:** Set SLA (contact all new leads within 24 hours), automate reminders

**Pitfall 4: Inflated Pipelines**
- **Problem:** Reps keep dead deals in pipeline to look busy
- **Impact:** Inaccurate forecasts, management makes bad decisions
- **Solution:** Implement 30-day inactivity rule (close or update), require weekly pipeline cleanup

**Pitfall 5: Not Using Watchers**
- **Problem:** Information silos, team doesn't know what's happening with accounts
- **Impact:** Duplicated effort, missed opportunities, poor customer experience
- **Solution:** Add relevant stakeholders as watchers, use team dashboards

**Pitfall 6: Poor Lead Qualification**
- **Problem:** Unqualified leads converted to opportunities
- **Impact:** Cluttered pipeline, inaccurate forecasts, wasted time
- **Solution:** Implement BANT framework, require qualification checklist before conversion

**Pitfall 7: Inconsistent Activity Logging**
- **Problem:** Some reps log every call, others log nothing
- **Impact:** Can't measure activity, can't coach effectively, lost context
- **Solution:** Require activity logging as part of process, tie to performance reviews

**Pitfall 8: Ignoring Closed Lost Deals**
- **Problem:** Lost deals dismissed without analysis
- **Impact:** Repeat same mistakes, don't learn from losses
- **Solution:** Require loss reason selection, review lost deals monthly, adjust strategy

---

## Pro Tips & Keyboard Shortcuts

**Keyboard Shortcuts:**
- `Ctrl/Cmd + K` - Global search across CRM
- `Ctrl/Cmd + Shift + A` - Create new account
- `Ctrl/Cmd + Shift + L` - Create new lead
- `Ctrl/Cmd + Shift + O` - Create new opportunity
- `Ctrl/Cmd + Shift + C` - Create new contact
- `Ctrl/Cmd + E` - Edit current record
- `Ctrl/Cmd + S` - Save changes
- `Esc` - Close modal/cancel edit

**Time-Saving Tips:**
- Use bulk actions to update multiple records at once
- Create saved filters for common views ("My Active Accounts")
- Set default filters so you see relevant data immediately
- Use keyboard shortcuts instead of clicking
- Enable email integration to auto-log emails

**Data Quality Tips:**
- Deduplicate monthly (run duplicate detection tool)
- Archive old leads and inactive accounts annually
- Require key fields (email, phone) before saving
- Standardize naming conventions (account names, opportunity names)

**Collaboration Tips:**
- Use watchers to keep team informed without manual updates
- @mention team members in activity notes to notify them
- Share saved filters with team for consistency
- Use comments on records instead of email threads (keeps context in CRM)

---

## FAQ - CRM Module

**Q: What's the difference between an Account and a Contact?**
- **Account** = Company/organization (e.g., "Acme Corp")
- **Contact** = Individual person at company (e.g., "John Smith at Acme Corp")

**Q: Should I create an Account for individual customers?**
- Yes. Create an account with person's name (e.g., "John Smith"), then create contact linked to that account.

**Q: When should I convert a lead to an opportunity?**
- After qualification (BANT criteria met): Budget, Authority, Need, Timeline confirmed.

**Q: Can I delete a lead after converting to opportunity?**
- No need—converted leads are automatically archived and hidden from active leads view.

**Q: How do I track competitors in deals?**
- Use opportunity "Description" field to note competitors, or create custom "Competitor" field (ask admin).

**Q: Can I have multiple opportunities for the same account?**
- Yes! Accounts can have multiple opportunities (e.g., separate deals for different products or timeframes).

**Q: What happens to opportunities when an account is deleted?**
- Opportunities linked to deleted accounts are also deleted (cascade delete). Export data first if needed.

**Q: Can I customize sales stages?**
- Yes (admin function). Navigate to **Admin → CRM Settings → Sales Stages** to add/edit stages.

**Q: How do I bulk update close dates for multiple opportunities?**
1. Select opportunities (checkboxes)
2. Click **Bulk Actions → Update Close Date**
3. Select new date
4. Click **Update**

**Q: Can I see all activities across all accounts?**
- Yes. Navigate to **CRM → Activities** for global activity timeline across all records.

---

## Next Steps

**You've mastered NextCRM's CRM module!** Here's what to explore next:

1. **[Email Integration Guide](./EMAIL-GUIDE.md)** - Connect your email for automatic activity tracking
2. **[Projects Guide](./PROJECTS-GUIDE.md)** - Manage customer projects and internal tasks
3. **[Documents Guide](./DOCUMENTS-GUIDE.md)** - Store proposals, contracts, and presentations
4. **[Admin Guide](./ADMIN-GUIDE.md)** - Configure CRM settings and customize fields

**Need Help?**
- [FAQ](./FAQ.md) - Frequently asked questions
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
- Support: support@nextcrm.io

---

**Last Updated:** 2024-11-17
**Guide Version:** 1.0
**Feedback:** docs@nextcrm.io
