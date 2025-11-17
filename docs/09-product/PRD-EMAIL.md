# PRD: Email Integration & Management

**Version:** 1.0
**Status:** P1 Production Feature
**Owner:** Product Team
**Last Updated:** 2025-11-17
**Related PRDs:** [PRD-CRM-ACCOUNTS.md](./PRD-CRM-ACCOUNTS.md), [PRD-CRM-LEADS.md](./PRD-CRM-LEADS.md), [PRD-CRM-CONTACTS.md](./PRD-CRM-CONTACTS.md)

---

## 1. Executive Summary

The Email Integration module transforms NextCRM into a complete communication hub by integrating IMAP/SMTP email, providing email templates, auto-linking emails to CRM contacts, tracking opens/clicks, and enabling team collaboration on customer emails. This module eliminates context switching between CRM and email clients while maintaining complete email history within customer records.

**Key Value Proposition:**
- **Unified Inbox:** Send/receive emails directly from NextCRM without switching to Outlook/Gmail
- **Auto-Linking:** Emails automatically linked to matching contacts, accounts, leads based on sender email address
- **Email Tracking:** Track email opens (95% accuracy) and click-throughs on links, showing sales engagement
- **Template Library:** Pre-built email templates for common scenarios (cold outreach, follow-up, proposals) with merge fields
- **Notion Integration:** Save important emails to Notion for knowledge base building (optional)

**Target Release:** Q3 2025

---

## 2. Problem Statement

### Current Situation
Sales teams spend their day switching between CRM (NextCRM) and email (Outlook, Gmail). When customer emails arrive, reps manually log them in CRM or forget entirely. Email history scattered across personal inboxes means teammates can't see past conversations. No visibility into whether customers opened proposals sent via email.

### Why This Matters
Disconnected email creates operational chaos:
- **Lost Context:** 40% of customer emails never logged in CRM, losing valuable context
- **Duplicate Outreach:** Teammates unknowingly email same customer (no shared inbox visibility)
- **Engagement Blindness:** Sales reps don't know if customer opened their email, leading to mistimed follow-ups
- **Time Waste:** Context switching between CRM and email wastes 1-2 hours per person daily

### Success Vision
A sales rep receives email from jane@acmecorp.com. Email appears in NextCRM inbox automatically (IMAP sync). System recognizes Jane exists as contact, links email to Acme Corp account. Rep clicks "Reply with Template" → Selects "Demo Follow-Up" template → Merge fields auto-fill (customer name, company, product). Rep edits and sends. Email tracking pixel embeds automatically. Jane opens email 2 hours later, system notifies rep. Rep schedules call immediately. All email history visible on Acme Corp account timeline. Zero context switching, perfect timing, complete history.

---

## 3. Target Users/Personas

### Primary Persona: Sales Representative
- **Role:** Manages deals and customer outreach via email
- **Goals:**
  - Send/receive customer emails without leaving NextCRM
  - Track whether customers opened proposal emails
  - Use templates for repetitive emails (cold outreach, follow-ups)
  - See all past emails with customer on account page
- **Pain Points:**
  - Switching between Outlook and NextCRM 50+ times per day
  - Don't know if customer read email (blind follow-up timing)
  - Retyping same follow-up email for every deal
  - Can't see teammates' email conversations with shared accounts
- **Use Cases:**
  - Sending cold outreach email from template library
  - Receiving customer reply, auto-linked to opportunity
  - Tracking email opens to time follow-up call
  - Reviewing all past emails with customer before meeting

### Secondary Persona: Customer Success Manager (CSM)
- **Role:** Manages post-sale customer relationships
- **Goals:**
  - Monitor customer email conversations for health signals
  - Ensure timely responses to customer inquiries
  - Share email templates for common support scenarios
  - Escalate unread customer emails to support team
- **Pain Points:**
  - No visibility into customer emails until customer complains
  - Support team uses separate ticketing system (fragmented)
  - Can't tell if customer satisfied based on email tone
- **Use Cases:**
  - Monitoring shared inbox for unanswered customer emails
  - Forwarding urgent customer email to support team
  - Using template for onboarding completion email
  - Reviewing email sentiment before quarterly business review

### Tertiary Persona: Marketing Operations
- **Role:** Manages email campaigns and templates
- **Goals:**
  - Create branded email templates for sales team
  - Track email campaign performance (opens, clicks)
  - A/B test email subject lines and content
  - Export email metrics for reporting
- **Pain Points:**
  - Sales reps write non-branded emails (inconsistent messaging)
  - No data on which email templates convert best
  - Cannot enforce email compliance (legal disclaimers)
- **Use Cases:**
  - Creating template library with brand guidelines
  - Reviewing template usage and open rates monthly
  - Exporting email metrics to marketing automation tool
  - Updating templates based on performance data

---

## 4. Functional Requirements

### 4.1 Core Features

#### Feature 1: IMAP/SMTP Email Integration
**Description:** Bidirectional email sync with existing email accounts (Gmail, Outlook, Exchange) via IMAP (receive) and SMTP (send). Emails sync in real-time, no manual import required.

**User Stories:**
- As any user, I want to connect my Gmail account so emails sync automatically
- As any user, I want to receive customer emails in NextCRM inbox so I don't check Gmail
- As any user, I want to send emails from NextCRM so I don't switch apps
- As any user, I want emails to sync both ways (Gmail ↔ NextCRM) so I can use either interface

**Specifications:**
- **Email Account Configuration (Per User):**
  - User navigates to Settings → Email Integration → Connect Email Account
  - Form fields:
    - Email provider: Dropdown (Gmail, Outlook, Exchange, Other IMAP)
    - IMAP settings: Host, Port (993), Username, Password (or OAuth for Gmail/Outlook)
    - SMTP settings: Host, Port (587/465), Username, Password, Encryption (TLS/SSL)
  - Test connection button (validates credentials before saving)
  - Save credentials encrypted in database (environment variable encryption key)

- **IMAP Email Sync (Receive):**
  - Background job polls IMAP server every 60 seconds (configurable)
  - Workflow:
    1. Connect to IMAP server using stored credentials
    2. Fetch new emails from INBOX folder (UNSEEN flag)
    3. Parse email: From, To, CC, BCC, Subject, Body (HTML + Plain Text), Attachments
    4. Create Email record in database:
       - Store: `from_email`, `to_emails`, `subject`, `body_html`, `body_text`, `received_at`, `external_id` (message ID)
       - Link attachments: Download to DigitalOcean Spaces, create Documents records
    5. Auto-link email to CRM entities (see Feature 2)
    6. Mark email as SEEN on IMAP server
  - Rate limiting: Max 1000 emails per hour per user (prevent sync floods)

- **SMTP Email Send:**
  - User composes email in NextCRM → Clicks "Send"
  - Backend workflow:
    1. Connect to SMTP server using stored credentials
    2. Construct MIME email:
       - From: User's configured email
       - To/CC/BCC: Recipients
       - Subject: User-entered subject
       - Body: HTML (rendered from rich text editor) + Plain text fallback
       - Attachments: Fetch from DigitalOcean Spaces, attach to email
       - Headers: Add tracking headers (see Feature 3)
    3. Send via SMTP
    4. Store sent email in database (Emails model)
    5. Create copy in IMAP "Sent" folder (so email appears in Gmail Sent)
  - Error handling: If send fails, retry 3x with exponential backoff, then show error to user

- **Supported Email Providers:**
  - Gmail: OAuth 2.0 (recommended) or App Password
  - Outlook/Office 365: OAuth 2.0 or SMTP credentials
  - Exchange: SMTP/IMAP credentials
  - Custom IMAP/SMTP: Any provider with standard protocols

**UI/UX Considerations:**
- Setup wizard with step-by-step instructions (screenshots for Gmail/Outlook)
- "Test Connection" button with loading spinner and success/error feedback
- Sync status indicator: "Last synced 2 minutes ago" with refresh button
- "Send and Sync" button (sends email and immediately triggers IMAP sync)

---

#### Feature 2: Auto-Linking Emails to CRM Entities
**Description:** Automatically match incoming/outgoing emails to contacts, accounts, leads based on email address. Link emails to entity timeline for complete communication history.

**User Stories:**
- As any user, I want emails from jane@acmecorp.com auto-linked to Jane's contact record
- As any user, I want to see all emails with customer on account timeline without manual logging
- As any user, I want emails from unknown senders to create new lead records
- As any user, I want to manually link unmatched emails if auto-link fails

**Specifications:**
- **Auto-Linking Algorithm (Runs After Email Sync):**
  1. Extract sender email address: `from_email` field
  2. Search for matching CRM entities:
     - **Contacts:** Query `crm_Contacts WHERE email = [from_email] OR personal_email = [from_email]`
     - **Leads:** Query `crm_Leads WHERE email = [from_email]`
     - **Accounts:** Query `crm_Accounts WHERE email = [from_email]` (less common, accounts usually have contact emails)
  3. Link email to found entity:
     - If Contact found: Create Email-Contact relation, inherit Contact's linked Account
     - If Lead found: Create Email-Lead relation
     - If Account found: Create Email-Account relation
     - If multiple matches (Contact + Lead): Link to both, flag for user review
     - If no matches: Leave unlinked, show in "Unlinked Emails" inbox filter
  4. Store linkage in Email record: `contactId`, `leadId`, `accountId` (nullable fields)

- **Activity Timeline Integration:**
  - Linked emails appear on entity timeline (Account detail page, Contact detail page, Lead detail page)
  - Timeline entry shows:
    - Email subject (clickable to open full email)
    - Sender + recipients
    - Timestamp (relative, e.g., "3 days ago")
    - Preview snippet (first 100 characters of body)
    - Attachment count (if any)

- **Manual Linking (For Unlinked Emails):**
  - User views unlinked email → Click "Link to Contact" button
  - Typeahead search modal: Search contacts by name or email
  - Select contact → Email linked, appears on contact timeline

- **New Lead Creation (Optional Setting):**
  - Organization setting: "Auto-create leads from unknown emails" (toggle)
  - If enabled AND email sender not found in CRM:
    - Create new Lead record:
      - Email: `from_email`
      - Name: Parse from email "From" field (e.g., "Jane Doe <jane@acme.com>")
      - Status: "NEW"
      - Lead source: "Email"
    - Link email to newly created lead
    - Notify assigned user: "New lead created from email: Jane Doe"

**UI/UX Considerations:**
- Email cards show linked entity badge: "🔗 Acme Corp" (clickable to entity)
- Unlinked emails highlighted in yellow with "Link" action button
- Timeline emails expandable (click to see full email thread)
- "Link to" dropdown on emails (Account, Contact, Lead, Opportunity)

---

#### Feature 3: Email Open & Click Tracking
**Description:** Track when recipients open emails (via tracking pixel) and click links (via redirect URLs). Notify sender on opens/clicks for timely follow-up.

**User Stories:**
- As any user, I want to know if customer opened my email so I time follow-up
- As any user, I want to see which links customer clicked so I understand interest
- As any user, I want real-time notification when email opened so I call immediately
- As any user, I want to see email open history (multiple opens) for engagement scoring

**Specifications:**
- **Email Open Tracking (Tracking Pixel):**
  - When sending email via NextCRM SMTP, embed 1x1 transparent GIF image:
    - HTML: `<img src="https://nextcrm.io/track/open/[emailId]/[recipientHash]" width="1" height="1" />`
    - Image served by NextCRM backend: `/api/track/open/[emailId]/[recipientHash]`
  - On image load:
    1. Backend receives GET request
    2. Look up email by `emailId`
    3. Record open event: Store timestamp, IP address, user agent in EmailTracking model
    4. Increment `open_count` in Email record
    5. Send real-time notification to sender (websocket): "Jane Doe opened your email 'Proposal Follow-Up'"
    6. Serve 1x1 transparent GIF response
  - Limitations: Blocked by email clients with "Load images" disabled (Gmail safe, Outlook sometimes blocked)

- **Email Click Tracking (Link Redirects):**
  - When sending email, rewrite all links in HTML body:
    - Original link: `<a href="https://acmecorp.com/demo">Schedule Demo</a>`
    - Rewritten link: `<a href="https://nextcrm.io/track/click/[emailId]/[linkHash]">Schedule Demo</a>`
  - On click:
    1. User clicks link → Hits NextCRM redirect endpoint
    2. Backend receives GET request with `emailId` and `linkHash`
    3. Look up original URL from database (linkHash → original URL mapping stored at send time)
    4. Record click event: Store timestamp, IP, user agent, clicked URL in EmailTracking model
    5. Increment `click_count` in Email record
    6. Send notification to sender: "Jane Doe clicked 'Schedule Demo' link in your email"
    7. Redirect user to original URL (302 redirect)

- **EmailTracking Model (New Model):**
  - `id`: ObjectId
  - `emailId`: Foreign key to Emails
  - `event_type`: Enum ("open", "click")
  - `recipient_email`: String
  - `timestamp`: DateTime
  - `ip_address`: String
  - `user_agent`: String (browser/device info)
  - `clicked_url`: String (nullable, only for click events)

- **Email Tracking Dashboard (Email Detail View):**
  - Email detail page shows:
    - Open count: "Opened 3 times" with timestamps
    - Click count: "2 links clicked" with URL list
    - First open: "Opened 2 hours after send"
    - Last open: "Last opened 1 day ago"
  - Timeline of all opens and clicks (chronological)

- **Real-Time Notifications:**
  - Websocket push notification to sender's browser when open/click occurs
  - Email notification (optional setting): "Your email to Jane Doe was opened"
  - In-app notification bell with count badge

**UI/UX Considerations:**
- Email status badges: "Unopened" (gray), "Opened" (green), "Clicked" (blue)
- Tracking indicators: "👁 Opened 3x" and "🔗 2 clicks" on email cards
- Click heatmap (future): Show which links clicked most
- Opt-out option: User setting "Disable tracking for my emails" (privacy preference)

---

#### Feature 4: Email Template System
**Description:** Pre-built and custom email templates with merge fields (name, company, deal amount) for rapid email composition. Template library with categories, usage tracking, and A/B testing.

**User Stories:**
- As any user, I want to use email templates so I don't rewrite common emails
- As any user, I want to personalize templates with merge fields ({{firstName}}) so emails aren't generic
- As a marketing manager, I want to create templates for sales team so messaging is consistent
- As any user, I want to see which templates have highest open rates so I use best performers

**Specifications:**
- **EmailTemplates Model (New Model):**
  - `id`: ObjectId
  - `organizationId`: Foreign key
  - `name`: String (e.g., "Cold Outreach - Enterprise", "Demo Follow-Up")
  - `category`: String ("Cold Outreach", "Follow-Up", "Proposal", "Support", "Onboarding")
  - `subject`: String with merge fields (e.g., "Quick question about {{companyName}}")
  - `body_html`: String (HTML email body with merge fields)
  - `body_text`: String (plain text fallback)
  - `merge_fields`: JSON array of available fields (e.g., `["firstName", "companyName", "dealAmount"]`)
  - `is_public`: Boolean (shared with organization vs. private to creator)
  - `usage_count`: Integer (tracks how many times template used)
  - `avg_open_rate`: Float (average open rate for emails from this template)
  - `createdBy`: User ObjectId
  - `createdAt`, `updatedAt`: Audit fields

- **Merge Fields (Auto-Populated from CRM Data):**
  - Contact fields: `{{firstName}}`, `{{lastName}}`, `{{email}}`, `{{company}}`, `{{position}}`
  - Account fields: `{{accountName}}`, `{{industry}}`, `{{website}}`, `{{annualRevenue}}`
  - Opportunity fields: `{{dealAmount}}`, `{{closeDate}}`, `{{salesStage}}`
  - User fields: `{{senderName}}`, `{{senderEmail}}`, `{{senderPhone}}`
  - Custom fallbacks: `{{firstName|there}}` (if firstName empty, use "there")

- **Template Composer Workflow:**
  1. User clicks "Compose Email" → Clicks "Use Template" button
  2. Template selector modal opens:
     - Search bar (filter by name)
     - Category tabs (Cold Outreach, Follow-Up, etc.)
     - Template cards showing: Name, Category, Usage count, Avg open rate
  3. User selects template → Email composer pre-fills with template content
  4. System auto-populates merge fields:
     - If composing from Contact detail page: Use contact's data to fill {{firstName}}, {{company}}, etc.
     - If composing from Opportunity: Use opportunity data for {{dealAmount}}, etc.
     - Show preview with filled merge fields before sending
  5. User can edit subject and body (changes not saved to template)
  6. User sends email → Increment template `usage_count`

- **Template Creation/Editing:**
  - Settings → Email Templates → New Template button
  - Form fields:
    - Name (required)
    - Category (dropdown)
    - Subject (text input with merge field autocomplete - type "{{" → dropdown)
    - Body (rich text editor with merge field button)
    - Is Public (toggle - share with organization)
  - Merge field autocomplete: Dropdown showing available fields as user types "{{"
  - Preview button: Shows template with sample data filled in

- **Template Performance Metrics:**
  - Template library shows metrics per template:
    - Usage count (total emails sent)
    - Avg open rate (percentage)
    - Avg click rate (percentage)
    - Last used (date)
  - Sort templates by: Usage (most used), Open rate (best performing), Date created

**UI/UX Considerations:**
- Template card grid view with thumbnails (first few lines of email preview)
- Merge field autocomplete in composer (dropdown appears when typing "{{")
- Preview button with filled merge fields before sending
- "Create Template from Email" button (save current email as template)
- Template categories with color coding (cold outreach = blue, follow-up = yellow, etc.)

---

#### Feature 5: Notion Integration (Optional)
**Description:** Save important emails to Notion workspace for knowledge base building. One-click sync of email thread to Notion page with formatting preserved.

**User Stories:**
- As any user, I want to save customer emails to Notion so I build knowledge base
- As any user, I want email formatting preserved (bold, links) when syncing to Notion
- As a team lead, I want to share saved emails in Notion with team without forwarding
- As any user, I want to see which emails already saved to Notion (avoid duplicates)

**Specifications:**
- **Notion Account Connection (Per User):**
  - User navigates to Settings → Integrations → Connect Notion
  - Notion OAuth flow:
    1. Redirect to Notion authorization page
    2. User grants NextCRM access to Notion workspace
    3. Notion returns API key and database ID
    4. Store in `secondBrain_notions` model: `user`, `notion_api_key`, `notion_db_id`

- **Sync Email to Notion Workflow:**
  1. User views email → Click "Save to Notion" button
  2. Modal opens:
     - Notion database: Dropdown (list of accessible databases in workspace)
     - Page title: Default "[Customer Name] - [Email Subject]", editable
     - Tags: Optional tags to add to Notion page
  3. On confirm:
     - Call Notion API: Create new page in selected database
     - Page properties:
       - Title: Page title from modal
       - Email: Email address of sender
       - Date: Email received date
       - Tags: User-entered tags
     - Page content: Email body (HTML converted to Notion blocks)
       - Preserve formatting: Bold, italic, links, lists
       - Embed attachments as file blocks
     - Store Notion page URL in Email record: `notion_page_url`
  4. Show success toast: "Saved to Notion" with link to Notion page

- **Notion Page Syncing (Bidirectional Future Feature):**
  - Currently: One-way sync (NextCRM → Notion)
  - Future: Two-way sync (edits in Notion sync back to NextCRM)

- **Notion Indicator:**
  - Emails saved to Notion show badge: "📓 Saved to Notion" on email card
  - Click badge → Opens Notion page in new tab

**UI/UX Considerations:**
- "Save to Notion" button prominent on email detail page
- Notion database dropdown shows database names + icons (from Notion API)
- Success toast includes direct link to created Notion page
- Notion badge on email cards with distinct color (purple, Notion brand)

---

### 4.2 Secondary Features

#### Feature 6: Email Forwarding & Delegation
**Description:** Forward customer emails to support team or colleagues without leaving NextCRM.

#### Feature 7: Email Scheduling (Send Later)
**Description:** Compose email and schedule send for specific date/time (timezone-aware).

#### Feature 8: Shared Inbox
**Description:** Team inbox for support@company.com where all team members see incoming emails and can assign/resolve.

#### Feature 9: Email Sentiment Analysis
**Description:** AI-powered sentiment detection (positive, neutral, negative) for customer emails to identify at-risk accounts.

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Email Sync Speed:** New emails appear in NextCRM within 2 minutes of arrival (IMAP polling)
- **Send Latency:** Emails send via SMTP in <3 seconds
- **Tracking Pixel Load:** Open tracking pixel served in <100ms
- **Template Load:** Template library loads 100+ templates in <1 second

### 5.2 Security
- **Credential Encryption:** Email passwords encrypted at rest (AES-256)
- **OAuth Preferred:** Use OAuth 2.0 for Gmail/Outlook (more secure than passwords)
- **SMTP Security:** Always use TLS/SSL for SMTP connections
- **Tracking Privacy:** Tracking pixels respect "Do Not Track" browser setting (optional)

### 5.3 Reliability
- **IMAP Uptime:** 99.9% sync reliability (retry on connection failures)
- **SMTP Uptime:** 99.9% send success rate (retry 3x on failures)
- **Email Delivery Rate:** >98% (via reputable SMTP providers)

### 5.4 Compliance
- **GDPR:** Email data deletable on request, opt-out for tracking
- **CAN-SPAM:** Unsubscribe link in all marketing emails
- **Data Retention:** Emails retained per organization policy (default: indefinite)

---

## 6. Acceptance Criteria

### Core Functionality
- [ ] User can connect Gmail account via OAuth 2.0
- [ ] User can connect Outlook account via OAuth 2.0 or SMTP credentials
- [ ] IMAP sync fetches new emails every 60 seconds
- [ ] Incoming emails auto-linked to matching contacts (by email address)
- [ ] User can send email from NextCRM via SMTP
- [ ] Sent emails saved in NextCRM and copied to IMAP "Sent" folder
- [ ] Tracking pixel embedded in sent emails (open tracking)
- [ ] Links rewritten for click tracking
- [ ] Email opens recorded with timestamp, IP, user agent
- [ ] Email clicks recorded with clicked URL
- [ ] Real-time notification sent to sender on email open/click
- [ ] User can create email template with merge fields
- [ ] User can select template when composing email
- [ ] Merge fields auto-populated from contact/account data
- [ ] Template usage count and avg open rate tracked
- [ ] User can connect Notion workspace via OAuth
- [ ] User can save email to Notion with one click
- [ ] Notion page created with email content and attachments

### Security & Performance
- [ ] Email credentials encrypted at rest
- [ ] SMTP connections use TLS/SSL
- [ ] Email sync completes within 2 minutes of arrival
- [ ] Email send completes within 3 seconds

---

## 7. Success Metrics

| Metric Category | Metric | Target | Measurement Method |
|----------------|--------|--------|-------------------|
| **Adoption** | Email accounts connected | 80%+ of users | Count of users with email configured |
| **Engagement** | Emails sent per user/week | 20+ | Database count of sent emails |
| **Tracking** | Open rate (avg) | 35%+ | (Opened emails / Total sent) * 100 |
| **Templates** | Template usage rate | 50%+ | (Template emails / Total sent) * 100 |
| **Efficiency** | Time saved per email | 2 min | User survey (vs. manual CRM logging) |

**Key Performance Indicators (KPIs):**
1. **Email-CRM Integration Rate:** 90%+ of customer emails auto-linked to CRM entities
2. **Follow-Up Timing Improvement:** 30% faster follow-ups (tracked opens enable real-time calls)

---

## 8. Dependencies

### Internal Dependencies
| Dependency | Type | Status | Impact if Delayed |
|-----------|------|--------|------------------|
| CRM Contacts Module | Hard | Complete | Cannot auto-link emails to contacts |
| User Authentication | Hard | Complete | Cannot securely store email credentials |
| Notification System | Soft | In Progress | Real-time open/click notifications unavailable |

### External Dependencies
| Dependency | Provider | SLA | Risk Level |
|-----------|----------|-----|-----------|
| Gmail IMAP/SMTP | Google | 99.9% uptime | Low (mature service) |
| Outlook IMAP/SMTP | Microsoft | 99.9% uptime | Low (mature service) |
| Notion API | Notion | 99.9% uptime | Medium (optional feature) |

---

## 9. Out of Scope

- [ ] Full email client replacement (advanced features like filters, rules) (future: power user mode)
- [ ] Email marketing campaigns (bulk sending to lists) (future: marketing automation)
- [ ] Email archiving and compliance (legal hold, eDiscovery) (future: enterprise feature)
- [ ] AI-powered email drafting (future: AI writing assistant)
- [ ] Video email (embedded video messages) (future: multimedia)

---

## 10. Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|------|------------|--------|-------------------|-------|
| **Email Sync Failures:** IMAP connection drops | Medium | Medium | Retry logic (3x), fallback to manual refresh button | Backend Engineer |
| **Tracking Pixel Blocked:** Email clients block image loading | High | Low | Graceful degradation (show "Unopened" status), educate users on limitations | Product Manager |
| **SMTP Rate Limiting:** Email providers throttle sends | Medium | Medium | Respect provider limits (Gmail: 500/day, Outlook: 300/day), queue emails if exceeded | Backend Engineer |

---

## 11. Launch Requirements

### Pre-Launch Checklist
- [ ] Gmail OAuth 2.0 integration tested
- [ ] Outlook OAuth 2.0 integration tested
- [ ] IMAP/SMTP connections tested (100+ emails synced)
- [ ] Email tracking tested (opens, clicks recorded)
- [ ] Template library created (10+ default templates)
- [ ] Notion OAuth integration tested

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
