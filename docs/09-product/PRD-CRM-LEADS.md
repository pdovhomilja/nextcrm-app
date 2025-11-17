# PRD: CRM Leads Module

**Version:** 1.0
**Status:** Approved
**Owner:** Product Team
**Last Updated:** 2025-11-17
**Related PRDs:** [PRD-CRM-ACCOUNTS.md](./PRD-CRM-ACCOUNTS.md), [PRD-CRM-OPPORTUNITIES.md](./PRD-CRM-OPPORTUNITIES.md), [PRD-MULTI-TENANCY.md](./PRD-MULTI-TENANCY.md)

---

## 1. Executive Summary

The CRM Leads Module is the top-of-funnel management system for capturing, qualifying, and converting prospects into sales opportunities. It provides lead scoring, pipeline stage tracking, and automated lead routing to ensure no prospect falls through the cracks. This module serves as the critical bridge between marketing campaigns and sales opportunities, helping sales teams prioritize high-value prospects and maximize conversion rates.

**Key Value Proposition:**
- **Intelligent Lead Qualification:** Automated lead scoring based on demographic and behavioral data to prioritize high-intent prospects
- **Conversion Pipeline:** Visual workflow tracking leads from NEW → CONTACTED → QUALIFIED → LOST with clear stage definitions
- **Lead Source Attribution:** Track lead origins (campaigns, referrals, webforms, events) to measure marketing ROI
- **Bulk Lead Management:** Import 10K+ leads from CSV, bulk assignment to sales reps, and automated deduplication

**Target Release:** Q1 2025

---

## 2. Problem Statement

### Current Situation
Sales teams receive leads from multiple channels (website forms, trade shows, referrals, cold outreach) without a centralized system to qualify and track them. Marketing generates hundreds of leads monthly, but 60-70% go uncontacted due to lack of visibility and prioritization. Leads get duplicated across spreadsheets, reassigned multiple times, and sales reps waste time on low-quality prospects while high-intent buyers go unnoticed.

### Why This Matters
Without structured lead management, businesses experience:
- **Wasted Marketing Spend:** 79% of marketing leads never convert due to lack of nurturing (MarketingSherpa)
- **Lost Revenue:** Companies with mature lead management generate 50% more sales-ready leads at 33% lower cost (Forrester Research)
- **Poor Sales Efficiency:** Reps spend 50% of time on unqualified leads instead of closing deals
- **Attribution Gaps:** Marketing can't prove ROI when lead sources aren't tracked systematically

### Success Vision
Marketing generates a lead from a webinar, which instantly appears in the CRM with automatic lead scoring. The system assigns it to the right sales rep based on territory rules. The rep receives a notification, views the lead's engagement history, makes contact within 30 minutes, and converts the qualified lead to an opportunity in one click. All source attribution data flows through to closed revenue reporting.

---

## 3. Target Users/Personas

### Primary Persona: Sales Development Representative (SDR)
- **Role:** Junior sales rep qualifying 50-100 inbound leads per week
- **Goals:**
  - Quickly assess lead quality to prioritize outreach
  - Track all touchpoints with prospects (calls, emails, LinkedIn)
  - Convert qualified leads to opportunities for Account Executives
  - Meet monthly quotas for qualified leads (SQL) generated
- **Pain Points:**
  - Can't tell which leads are hot vs cold without manual research
  - Loses track of leads across multiple spreadsheets and email threads
  - Accidentally contacts leads already being worked by colleagues
- **Use Cases:**
  - Morning routine: Check new leads assigned overnight, prioritize by score
  - Qualification calls: Log notes, update lead status, schedule follow-ups
  - Handoff: Convert qualified lead to opportunity and assign to closing AE

### Secondary Persona: Marketing Manager
- **Role:** Demand generation lead running campaigns across 5+ channels
- **Goals:**
  - Measure which campaigns generate highest quality leads
  - Prove marketing ROI by tracking lead-to-revenue attribution
  - Optimize campaign spend based on conversion data
- **Pain Points:**
  - No visibility into which leads sales actually contacted or converted
  - Can't attribute closed deals back to originating campaigns
  - Sales complains about lead quality but provides no feedback
- **Use Cases:**
  - Monthly reporting: Pull lead source reports showing conversion rates by channel
  - Campaign optimization: Identify low-performing sources and reallocate budget
  - Lead imports: Upload conference attendee lists for sales follow-up

### Tertiary Persona: Sales Manager
- **Role:** Manages team of 5-10 SDRs, sets quotas and coaching priorities
- **Goals:**
  - Ensure leads are contacted within SLA (e.g., 30 minutes for hot leads)
  - Monitor rep activity and conversion rates by rep
  - Identify coaching opportunities based on qualification gaps
- **Pain Points:**
  - No visibility into which leads are being worked vs sitting idle
  - Can't see team capacity for lead routing decisions
- **Use Cases:**
  - Daily standups: Review lead aging report showing stale leads
  - Performance reviews: Pull conversion rate reports by SDR
  - Lead routing: Manually reassign leads when reps are at capacity

---

## 4. Functional Requirements

### 4.1 Core Features

#### Feature 1: Lead Capture & Creation
**Description:** Multi-channel lead creation supporting manual entry, CSV import, API integrations, and web-to-lead forms with automatic deduplication.

**User Stories:**
- As an SDR, I want to manually create leads from cold calls so I can track all prospects in one system
- As a marketing manager, I want to import 1000+ leads from a conference attendee list in under 5 minutes
- As a website visitor, I want to submit my contact info via a form that automatically creates a lead record
- As an integration admin, I want to push leads from HubSpot/Marketo to NextCRM via API without duplicates

**Specifications:**
- **Required Fields:** Last name, organization ID, status (defaults to NEW)
- **Standard Fields:**
  - Personal: First name, last name, job title, birthday
  - Contact: Email, phone, personal email
  - Company: Company name, industry, employees count
  - Qualification: Lead source, referred by, campaign, type (DEMO), status (NEW/CONTACTED/QUALIFIED/LOST)
  - Assignment: Assigned to (user ID)
- **Lead Source Tracking:** Dropdown with values like "Website Form", "Trade Show", "Referral", "Cold Call", "Social Media", "Partner", "Other"
- **CSV Import:**
  - Support files up to 100MB (50K leads)
  - Field mapping UI matching CSV columns to lead fields
  - Duplicate detection during import (by email + phone)
  - Bulk validation with error preview before commit
  - Background job processing with progress notifications
- **Web-to-Lead Form:**
  - Embeddable HTML form with organization-specific endpoint
  - Spam protection via reCAPTCHA or honeypot fields
  - Custom field mapping per organization
  - Auto-assignment rules based on lead source or geo
- **API Integration:**
  - REST endpoints for create/update leads
  - Webhook support for real-time lead sync from external systems
  - API rate limiting: 1000 requests/hour per organization

**UI/UX Considerations:**
- Quick-create modal with minimal required fields for speed
- Two-column form layout for comprehensive lead entry
- CSV import wizard with drag-drop file upload and column mapping UI
- Real-time duplicate detection showing "Similar leads found" warning with merge option

---

#### Feature 2: Lead Scoring System
**Description:** Automated lead scoring algorithm assigning numeric scores (0-100) based on demographic fit (company size, industry, job title) and behavioral signals (email opens, page views, content downloads) to help reps prioritize outreach.

**User Stories:**
- As an SDR, I want leads automatically scored so I contact high-intent prospects first
- As a sales manager, I want to define scoring rules based on our ICP (ideal customer profile)
- As a rep, I want to see why a lead received its score (transparency)

**Specifications:**
- **Score Range:** 0-100 (100 = best fit)
- **Scoring Criteria:**
  - **Demographic Score (50 points):**
    - Company size: 10 pts if employees >100, 5 pts if 50-100, 0 pts if <50
    - Industry fit: 15 pts if target industry (from configurable list), 0 otherwise
    - Job title: 15 pts if director+, 10 pts if manager, 5 pts if IC
    - Geographic fit: 10 pts if in target regions
  - **Behavioral Score (50 points - future phase):**
    - Email engagement: 10 pts if opened 3+ emails
    - Website activity: 20 pts if visited pricing page, 10 pts if visited product pages
    - Content downloads: 10 pts if downloaded whitepaper/ebook
    - Form submissions: 10 pts if filled out contact form vs passive list import
- **Score Display:** Badge on lead detail page showing score with breakdown tooltip ("Industry: +15, Job Title: +15, Company Size: +10 = 40/100")
- **Score-Based Sorting:** List view default sort by score descending
- **Score Aging:** Score decreases by 5 points per week of inactivity (no touchpoints)

**UI/UX Considerations:**
- Color-coded score badges: Green (75-100), Yellow (50-74), Red (0-49)
- Expandable score breakdown showing point allocation per criterion
- Admin UI for configuring scoring rules (per organization)

---

#### Feature 3: Lead Pipeline & Status Workflow
**Description:** Visual pipeline showing lead progression through qualification stages with clear definitions and conversion milestones.

**User Stories:**
- As an SDR, I want to move leads through stages (NEW → CONTACTED → QUALIFIED → LOST) to track qualification progress
- As a manager, I want to see pipeline velocity showing average time in each stage
- As a rep, I want stage change reasons (e.g., "Lost - Budget" vs "Lost - Timing") for reporting

**Specifications:**
- **Lead Status Enum:** NEW, CONTACTED, QUALIFIED, LOST (crm_Lead_Status enum in schema)
- **Status Definitions:**
  - **NEW:** Lead just created, awaiting first contact
  - **CONTACTED:** Rep made initial outreach (call, email, meeting booked)
  - **QUALIFIED:** Lead meets BANT criteria (Budget, Authority, Need, Timeline) and ready for opportunity creation
  - **LOST:** Lead disqualified or unresponsive (requires loss reason)
- **Loss Reasons (when status = LOST):**
  - No Budget
  - No Authority (wrong contact)
  - No Need (not a fit)
  - Bad Timing (revisit in 6 months)
  - Unresponsive (3+ contact attempts)
  - Competitor Chosen
  - Other (free text)
- **Stage Change Tracking:**
  - Audit log entry on every status change
  - Date stamps: Date created (NEW), date contacted, date qualified/lost
  - Rep ID for each stage transition
- **Pipeline Views:**
  - Kanban board: Columns for each status, drag-drop to change stages
  - List view: Table with status column, sortable and filterable
  - Funnel chart: Conversion rates between stages

**UI/UX Considerations:**
- Kanban board with lead cards showing name, company, score, and days in stage
- Drag-drop interaction with confirmation modal if moving to LOST status (requires reason)
- Visual progress indicator on lead detail page showing current stage with checkmarks

---

#### Feature 4: Lead-to-Opportunity Conversion
**Description:** One-click conversion of qualified leads into sales opportunities, automatically creating/linking accounts and transferring all context (notes, documents, activity history).

**User Stories:**
- As an SDR, I want to convert qualified leads to opportunities in one click without re-entering data
- As an AE receiving a converted lead, I want all qualification notes and documents transferred so I have full context
- As a manager, I want conversion rate reports showing SDR performance

**Specifications:**
- **Conversion Trigger:** "Convert to Opportunity" button visible when lead status = QUALIFIED
- **Conversion Logic:**
  1. Check if account with lead's company name exists (fuzzy match)
     - If yes: Link opportunity to existing account
     - If no: Create new account with company name, industry from lead
  2. Create opportunity record:
     - Name: "[Company] - [Lead Name]" (e.g., "Acme Corp - John Doe")
     - Account: Linked to account from step 1
     - Assigned to: Lead's assigned_to user (or prompt for AE selection)
     - Description: Copy lead's description/notes
     - Budget: Default to $0 (user must update)
     - Sales stage: Default to first stage (e.g., "Qualification")
  3. Create contact record from lead data:
     - Link to account
     - Copy all personal/contact fields from lead
  4. Update lead:
     - Status = QUALIFIED
     - Add reference to created opportunity ID (new field: convertedToOpportunityId)
     - Retain lead record (don't delete - historical tracking)
  5. Transfer relationships:
     - Documents: Link lead's documents to new opportunity
     - Activity history: Show in opportunity timeline
- **Post-Conversion:**
  - Redirect user to newly created opportunity page
  - Toast notification: "Lead converted! Opportunity created: [Opp Name]"
  - Email notification to assigned AE (if different from SDR)

**UI/UX Considerations:**
- Confirmation modal before conversion showing preview: "Create account: Acme Corp | Create opportunity: Acme Corp - John Doe | Assign to: Jane Smith (AE)"
- Option to select existing account from dropdown if fuzzy match finds duplicates
- Graceful error handling if account creation fails (invalid data)

---

#### Feature 5: Lead Assignment & Routing
**Description:** Manual and automated lead assignment to sales reps based on territory, lead source, or round-robin distribution to ensure equitable workload and rapid follow-up.

**User Stories:**
- As a sales manager, I want to manually reassign leads when reps go on vacation
- As a marketing ops admin, I want to set up auto-assignment rules so webinar leads route to the right SDR by region
- As an SDR, I want to receive email/Slack notifications when new leads are assigned

**Specifications:**
- **Assignment Methods:**
  - **Manual Assignment:** Dropdown on lead detail page to select assigned_to user
  - **Bulk Assignment:** Select multiple leads in list view, bulk update assigned_to
  - **Auto-Assignment Rules (future):**
    - Geographic routing: If lead country = "US", assign to US SDR team
    - Lead source routing: If source = "Webinar", assign to webinar SDR
    - Round-robin: Distribute leads evenly across team members
    - Score-based routing: High-score leads (75+) → senior SDRs
- **Assignment Notifications:**
  - In-app notification: "You've been assigned a new lead: John Doe (Acme Corp)"
  - Email notification with lead summary and direct link to lead page
  - Slack integration (future): Post to #sales-leads channel
- **Reassignment Tracking:** Audit log showing all assignment changes with user ID and timestamp
- **Assignment Metrics:**
  - Leads assigned per rep (balance check)
  - Average response time from assignment to first contact
  - Conversion rate by rep

**UI/UX Considerations:**
- Assignment dropdown with user search/typeahead
- Visual indicator on list view showing assigned rep avatar
- Manager dashboard showing lead distribution across team

---

#### Feature 6: Lead Deduplication
**Description:** Automatic detection and manual merging of duplicate leads based on email, phone, or name similarity to maintain data quality and prevent redundant outreach.

**User Stories:**
- As an SDR, I want to be warned if I'm creating a duplicate lead so I don't waste time
- As a data admin, I want to run weekly duplicate detection reports to clean the database
- As any user, I want to merge duplicate leads choosing which fields to keep

**Specifications:**
- **Duplicate Detection Criteria:**
  - **Exact Match:** Same email address (case-insensitive)
  - **Fuzzy Match:**
    - Same phone number (normalized, ignoring formatting)
    - Same first name + last name + company name (85%+ similarity using Levenshtein distance)
- **Real-Time Duplicate Warning:**
  - During lead creation, if email matches existing lead, show warning modal:
    "Similar lead found: John Doe at Acme Corp (created 30 days ago, assigned to Jane). View existing lead or create anyway?"
  - User can: View existing lead, edit existing lead, or proceed with duplicate creation
- **Duplicate Merge UI:**
  - "Find Duplicates" tool in admin panel
  - Shows duplicate clusters with side-by-side comparison
  - User selects "master" record (all relationships will point to this one)
  - Field-level selection: Choose which values to keep from each duplicate
  - Merge action: Delete duplicates, update relationships, combine activity history
- **Merge Audit:** Audit log showing merged lead IDs and which fields were combined
- **Bulk Import Deduplication:** CSV import automatically skips or updates existing leads by email match

**UI/UX Considerations:**
- Warning modal with "View Existing" and "Create Anyway" buttons
- Merge UI with radio buttons per field showing both values and last updated timestamp
- Post-merge confirmation showing "3 duplicates merged into 1 master record"

---

### 4.2 Secondary Features

#### Feature 7: Lead Tags & Categorization
**Description:** Flexible tagging system allowing users to add custom labels (e.g., "Hot Lead", "VIP", "Competitor User") for advanced filtering and segmentation.

**Specifications:**
- Tags field: Array of strings (free text)
- Tag autocomplete showing previously used tags
- Filter leads by tags (multi-select)
- Tag-based smart lists (e.g., "All VIP leads")

#### Feature 8: Lead Activity Timeline
**Description:** Chronological feed of all interactions with lead (calls, emails, meetings, status changes, note updates) providing complete context for handoffs and follow-ups.

**Specifications:**
- Similar to account activity timeline (see PRD-CRM-ACCOUNTS.md)
- Shows: Status changes, assignment changes, field edits, notes added, documents uploaded, emails sent/received (future)
- Timeline filters by date range and activity type

#### Feature 9: Lead Bulk Operations
**Description:** Mass update, delete, export, and assignment operations on selected leads for data management efficiency.

**Specifications:**
- Bulk actions: Update status, update assigned_to, delete (soft delete), export CSV, add tags
- Selection: Manual checkboxes, select all on page, select all matching filter
- Safety: Confirmation modal showing count, undo capability (30 sec grace period)
- Limits: 1000 leads per bulk operation

#### Feature 10: Lead Aging & Stale Lead Alerts
**Description:** Automatic flagging of leads with no activity for configurable periods (e.g., 30 days) to prevent leads from going cold.

**Specifications:**
- "Last Activity" field calculated from most recent status change or note update
- Stale lead filter: "No activity in 30+ days"
- Email notifications to lead owner and manager: "You have 5 stale leads needing attention"
- Visual indicator on list view: Yellow warning icon for 30+ days, red for 60+ days

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Page Load Time:** Lead detail page loads in <1 second (p95)
- **Search Response:** Lead search returns results in <300ms for 100K lead database
- **CSV Import Speed:** Import 10K leads in under 2 minutes
- **Concurrent Users:** Support 500 concurrent users editing leads without conflicts
- **Data Volume:** Support organizations with up to 500K lead records
- **Bulk Operation Speed:** Bulk update of 1000 leads completes in <15 seconds

### 5.2 Security
- **Authentication:** All lead endpoints require valid JWT session
- **Authorization:** RBAC enforcement:
  - Viewers: Read-only access to all org leads
  - Members: Read all leads, edit/delete assigned leads only
  - Admins: Full CRUD on all leads
  - Owners: Full access + admin functions (import, merge, bulk delete)
- **Data Isolation:** 100% organizationId filtering on all queries (no cross-org leakage)
- **PII Protection:** Email and phone fields encrypted at rest, audit log on access
- **Audit Logging:** All create, update, delete, merge, export operations logged with user ID and timestamp
- **API Rate Limiting:** 100 requests per minute per user, 1000 per hour per organization

### 5.3 Accessibility
- **WCAG Compliance:** Level AA
- **Screen Reader Support:** Full ARIA labels on all forms and interactive elements
- **Keyboard Navigation:** All actions accessible via keyboard (Tab, Enter, Space, Arrows)
- **Color Contrast:** 4.5:1 minimum on all text
- **Focus Indicators:** Visible focus ring on all focusable elements

### 5.4 Internationalization (i18n)
- **Supported Languages:** English, German, Czech, Ukrainian (en, de, cz, uk)
- **Date/Time Formats:** Locale-specific using date-fns
- **Phone Number Formats:** International formatting with country code support
- **Name Handling:** Support for non-Latin characters (Cyrillic, accented characters)

### 5.5 Compliance
- **GDPR:**
  - Lead data exportable in JSON/CSV
  - Right to erasure: Lead deletion cascades to activity history
  - Consent tracking: Lead source indicates consent origin (e.g., "Opted in via website form")
- **SOC 2:**
  - Audit logs retained for 7 years
  - Encryption at rest (MongoDB) and in transit (TLS 1.3)
- **CAN-SPAM Compliance:** Email opt-out tracking (future: unsubscribe field)

---

## 6. Acceptance Criteria

### Core Functionality
- [ ] User can manually create lead with all standard fields and see it in list view
- [ ] User can import 1000 leads from CSV with field mapping UI, deduplication, and error preview
- [ ] User can update lead status via dropdown or Kanban drag-drop
- [ ] User can convert qualified lead to opportunity, automatically creating account and contact
- [ ] User can assign leads to team members with notification sent to assignee
- [ ] User can filter leads by status, assigned user, lead source, score, and date range
- [ ] User can search leads by name, email, company with instant results
- [ ] User can bulk update 100 leads (change assigned_to, status) with confirmation modal
- [ ] User can export filtered leads to CSV with all standard fields
- [ ] User receives duplicate warning when creating lead with matching email

### Performance
- [ ] Lead detail page loads in under 1 second on 3G connection
- [ ] Lead search returns results in under 300ms for 100K lead database
- [ ] CSV import of 10K leads completes in under 2 minutes with progress bar
- [ ] Bulk update of 1000 leads completes in under 15 seconds
- [ ] Supports 500 concurrent users without API response degradation (load tested)

### Security
- [ ] All lead data isolated by organizationId (tested: no cross-org data leakage)
- [ ] RBAC enforced: Members cannot edit unassigned leads, Viewers cannot edit any leads
- [ ] Audit logs capture all create, update, delete, merge, convert operations with user ID
- [ ] PII fields (email, phone) encrypted at rest (verified in MongoDB)
- [ ] API rate limiting enforced: 100 req/min per user, 429 response on exceed

### Accessibility
- [ ] WCAG AA compliant (tested with axe DevTools, 0 critical violations)
- [ ] Full keyboard navigation (all actions via keyboard)
- [ ] Screen reader tested with NVDA (all forms and buttons properly labeled)
- [ ] Focus indicators visible on all interactive elements
- [ ] Color contrast meets 4.5:1 minimum (tested with Contrast Checker)

### i18n
- [ ] All UI strings externalized to translation files (no hardcoded text)
- [ ] Tested in all 4 supported languages with screenshots
- [ ] Phone numbers formatted per locale (international format with country code)
- [ ] Date fields formatted per locale (YYYY-MM-DD vs DD.MM.YYYY)

### Conversion Flow
- [ ] Lead conversion creates opportunity, account (if new), and contact in single transaction
- [ ] Converted lead's documents automatically linked to new opportunity
- [ ] Conversion fails gracefully if required fields missing (shows validation errors)
- [ ] Converted lead shows link to created opportunity on lead detail page

---

## 7. Success Metrics

| Metric Category | Metric | Target | Measurement Method |
|----------------|--------|--------|-------------------|
| **Adoption** | Leads created per org/month | 100+ | MongoDB query on createdAt field |
| **Engagement** | Lead-to-opportunity conversion rate | 25%+ | (Qualified leads / Total leads) monthly |
| **Performance** | Average lead response time | <30 min | Time from lead creation to first status change |
| **Quality** | Duplicate lead rate | <3% | Weekly duplicate detection scan |
| **Business Impact** | Sales cycle reduction | 15% faster | Avg time from lead creation to deal close vs baseline |
| **Efficiency** | Leads imported via CSV per month | 5K+ | Import job logs |
| **Collaboration** | Lead handoff time (SDR → AE) | <2 hours | Time from qualified status to AE acceptance |
| **Data Quality** | Leads with complete data (all required fields) | 90%+ | Weekly data quality scan |
| **User Satisfaction** | Lead module NPS score | 45+ | Quarterly in-app survey |
| **Support Volume** | Lead-related support tickets | <8 per 1000 users/month | Support ticket tagging |

**Key Performance Indicators (KPIs):**
1. **Lead Response Time:** 80% of leads contacted within 1 hour of creation (measured via status change to CONTACTED)
2. **Lead Conversion Rate:** 25%+ of leads reach QUALIFIED status within 30 days (industry benchmark: 13% - Salesforce)
3. **Lead Velocity:** Average 7 days from NEW to QUALIFIED (vs industry avg of 84 days)

---

## 8. Dependencies

### Internal Dependencies
| Dependency | Type | Status | Impact if Delayed |
|-----------|------|--------|------------------|
| Multi-Tenancy & RBAC | Hard | Complete | Cannot enforce data isolation or permissions |
| User Management | Hard | Complete | Lead assignment requires user records |
| CRM Accounts Module | Hard | Complete | Lead-to-opp conversion creates accounts |
| CRM Opportunities Module | Hard | Complete | Cannot convert leads without opportunity model |
| Document Management | Soft | Complete | Lead-document linking unavailable |

### External Dependencies
| Dependency | Provider | SLA | Risk Level |
|-----------|----------|-----|-----------|
| MongoDB Atlas | MongoDB Inc | 99.95% uptime | Low |
| NextAuth.js | Vercel | Community support | Low |
| Prisma ORM | Prisma Labs | Community support | Low |
| CSV Parser Library (papaparse) | Open source | N/A | Low (mature, stable) |

### Technical Dependencies
- **Database:** MongoDB 6.0+ with text indexes on name, email, company fields
- **APIs:**
  - `/api/crm/leads` - CRUD operations
  - `/api/crm/leads/import` - CSV import endpoint
  - `/api/crm/leads/[id]/convert` - Lead-to-opportunity conversion
  - `/api/crm/leads/duplicates` - Duplicate detection
- **Infrastructure:**
  - Vercel hosting
  - MongoDB Atlas M10+ cluster
  - Background job queue for CSV imports (future: BullMQ or similar)
- **Third-Party Libraries:**
  - papaparse (CSV parsing)
  - react-hook-form + zod (forms/validation)
  - @tanstack/react-table (data tables)

---

## 9. Out of Scope

The following items are explicitly **NOT** included in this module release:

- [ ] Automated lead scoring based on behavioral data (email opens, website visits) - Future: integrate with email/analytics
- [ ] AI-powered lead qualification assistant (chatbot asking BANT questions) - Future: GPT-4 integration
- [ ] Automated lead nurturing sequences (drip email campaigns) - See PRD-EMAIL.md
- [ ] SMS/WhatsApp lead engagement - Future: communication hub
- [ ] Social media lead enrichment (pull LinkedIn data, Twitter profiles) - Future: data enrichment integrations
- [ ] Lead scoring model customization UI (admin-configurable scoring rules) - Future: low-code rules engine
- [ ] Automated lead routing rules (geographic, round-robin) - Future: advanced assignment automation
- [ ] Lead capture forms with custom branding (embeddable widgets) - Future: form builder
- [ ] Mobile native app for lead management - Mobile web only for v1
- [ ] Predictive analytics (lead churn risk, win probability) - Future: ML models

**Future Considerations:**
- Integration with marketing automation platforms (HubSpot, Marketo, Pardot) for bi-directional sync
- Chrome extension for capturing leads from LinkedIn, Crunchbase, ZoomInfo
- Lead scoring ML model trained on historical conversion data per organization
- Voice-to-text for logging calls with automatic lead updates

---

## 10. Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|------|------------|--------|-------------------|-------|
| **Duplicate Lead Explosion:** Users import same leads repeatedly, creating chaos | High | High | Real-time duplicate detection, import preview showing duplicates before commit, bulk merge tool | Engineering Lead |
| **Low Conversion Rates:** SDRs don't convert leads to opps, analytics skewed | Medium | Medium | Gamification (leaderboards), manager dashboards showing stale qualified leads, automated reminders | Product Manager |
| **CSV Import Failures:** Large imports timeout or fail on malformed data | Medium | Medium | Async background job processing, detailed error reporting with line numbers, import retry mechanism | Backend Engineer |
| **Lead Scoring Inaccuracy:** Simple demographic scoring doesn't predict conversion | Medium | Low | Start with basic scoring, iterate based on conversion analysis, allow manual score overrides | Product Analyst |
| **Assignment Conflicts:** Two reps contact same lead simultaneously | Low | Medium | Real-time assignment notifications, "claimed by" visual indicator, duplicate contact detection (future) | Frontend Engineer |
| **Performance Degradation:** 100K+ lead orgs experience slow searches | Medium | High | MongoDB full-text indexes, query result caching, pagination enforcement (max 100 records per page) | Database Engineer |

**Risk Categories:**
- **Technical Risks:** CSV parsing edge cases (special characters, inconsistent formatting) - Mitigation: robust papaparse config, validation layer
- **Business Risks:** Low adoption if UI too complex for SDRs - Mitigation: user testing with 3 orgs, simplify quick-create flow
- **Resource Risks:** QA bandwidth for testing all import scenarios - Mitigation: automated import tests with sample CSV files
- **Security Risks:** CSV injection attacks via malformed import files - Mitigation: sanitize all imported data, disable formula execution

---

## 11. Launch Requirements

### Pre-Launch Checklist

#### Development
- [ ] All acceptance criteria met (100% of section 6 checkboxes)
- [ ] Code review completed (2+ approvals from senior engineers)
- [ ] Unit tests passing (>90% coverage on lead actions and API routes)
- [ ] Integration tests passing (lead creation, conversion, import, merge flows)
- [ ] Performance testing completed (10K lead import, 100K lead search)
- [ ] Security audit completed (RBAC scenarios, CSV injection testing)

#### QA
- [ ] Functional testing completed (all user stories validated)
- [ ] Regression testing passed (other CRM modules not broken)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge - latest 2 versions)
- [ ] Mobile responsive testing (iOS Safari, Android Chrome)
- [ ] Accessibility testing with screen reader (NVDA/JAWS)
- [ ] Load testing with 500 concurrent users (p95 <1.5s response time)

#### Documentation
- [ ] User guide written covering all features with screenshots
- [ ] CSV import template provided with example data
- [ ] API documentation updated (docs/04-api-reference/crm-leads.md)
- [ ] Admin guide for lead scoring, deduplication, bulk operations
- [ ] Training video recorded (10-minute overview of lead management workflow)
- [ ] Release notes drafted with changelog and migration guide

#### Operations
- [ ] Monitoring configured (lead import success rate, conversion rate, response time)
- [ ] Database migrations tested on staging with production data volume
- [ ] Rollback plan documented (database restore procedure)
- [ ] On-call rotation scheduled for 2 weeks post-launch
- [ ] Incident response runbook ready (common issues: import failures, conversion errors)

#### Legal & Compliance
- [ ] Privacy policy updated (lead data collection, GDPR rights)
- [ ] Terms of service reviewed (no changes needed)
- [ ] GDPR compliance verified (data export, deletion, consent tracking)
- [ ] Data retention policies configured (soft delete 30-day period)
- [ ] Security audit signed off by CISO

#### Go-to-Market
- [ ] Marketing materials ready (feature landing page, demo video, screenshots)
- [ ] Sales team trained on lead management features and competitive positioning
- [ ] Customer support prepared with FAQ and troubleshooting guide
- [ ] Beta testing completed with 5 pilot customers (feedback incorporated)
- [ ] User feedback incorporated (2 critical bugs fixed from beta)

---

## Appendix

### A. User Flows
**Key User Flows:**
1. **Lead Creation Flow:** Leads List → New Lead Button → Quick Create Modal (minimal fields) → Save → Lead Detail Page
2. **CSV Import Flow:** Leads List → Import Button → Upload CSV → Map Columns → Preview (with duplicate warnings) → Confirm Import → Progress Bar → Import Complete Summary
3. **Lead Conversion Flow:** Lead Detail Page (status=QUALIFIED) → Convert to Opportunity Button → Confirmation Modal (select existing account or create new) → Opportunity Created → Redirect to Opportunity Page
4. **Lead Qualification Flow:** Lead Detail (status=NEW) → Make First Call → Update Status to CONTACTED → Add Notes → Schedule Follow-up → Second Call → Qualify (BANT criteria met) → Update Status to QUALIFIED → Convert to Opportunity

### B. Wireframes/Mockups
- **Lead List View:** Data table with columns (score, name, company, status, assigned to, lead source, created date), filter panel on left, bulk action toolbar
- **Lead Detail View:** Hero section with lead name/score, status dropdown, assign/watch buttons; tabs for activity timeline, documents, notes
- **Lead Kanban View:** Swimlanes for each status (NEW, CONTACTED, QUALIFIED, LOST), draggable lead cards showing score badge, company, assigned rep avatar
- **CSV Import Wizard:** 3-step process (Upload, Map Columns, Confirm) with progress indicators

### C. API Specifications
**Key Endpoints:**
- `GET /api/crm/leads` - List leads with filtering, pagination, search
- `POST /api/crm/leads` - Create lead (manual or API)
- `POST /api/crm/leads/import` - CSV import endpoint (multipart/form-data)
- `GET /api/crm/leads/[id]` - Get lead detail
- `PUT /api/crm/leads/[id]` - Update lead
- `DELETE /api/crm/leads/[id]` - Soft delete lead
- `POST /api/crm/leads/[id]/convert` - Convert lead to opportunity
- `GET /api/crm/leads/duplicates` - Find duplicate leads
- `POST /api/crm/leads/merge` - Merge duplicate leads
- `POST /api/crm/leads/bulk` - Bulk operations (update, delete)

### D. Database Schema
See [prisma/schema.prisma](../../prisma/schema.prisma) - `crm_Leads` model (lines 170-200)

**Key Fields:**
- `id`: ObjectId primary key
- `organizationId`: Foreign key to Organizations
- `firstName`, `lastName`, `company`, `jobTitle`, `email`, `phone`
- `status`: Enum (NEW, CONTACTED, QUALIFIED, LOST)
- `type`: Enum (DEMO) - future: expand types
- `lead_source`, `refered_by`, `campaign`: Attribution fields
- `assigned_to`: Foreign key to Users
- `accountsIDs`: Foreign key to crm_Accounts (for converted leads)
- `documentsIDs`: Array of Document IDs

**Relationships:**
- Many-to-one: Organization, assigned user, linked account
- Many-to-many: Documents (via documentsIDs array)

### E. Related Documents
- [Technical Design: Lead Scoring Algorithm](../ARCHITECTURE.md)
- [Security Architecture: RBAC for Leads](../RBAC.md)
- [Test Plan: Lead Import Scenarios](../QA_COMPREHENSIVE_REPORT.md)
- [User Research: SDR Workflow Analysis](https://notion.so/user-research-sdrs)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-17 | Product Team | Initial draft based on existing NextCRM schema |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | TBD | | |
| Engineering Lead | TBD | | |
| Design Lead | TBD | | |
| Security Lead | TBD | | |
| Legal | TBD | | |
