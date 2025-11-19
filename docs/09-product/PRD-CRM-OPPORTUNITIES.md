# PRD: CRM Opportunities Module

**Version:** 1.0
**Status:** Approved
**Owner:** Product Team
**Last Updated:** 2025-11-17
**Related PRDs:** [PRD-CRM-ACCOUNTS.md](./PRD-CRM-ACCOUNTS.md), [PRD-CRM-LEADS.md](./PRD-CRM-LEADS.md), [PRD-MULTI-TENANCY.md](./PRD-MULTI-TENANCY.md)

---

## 1. Executive Summary

The CRM Opportunities Module is the sales pipeline management system for tracking deals from initial qualification through closed-won revenue. It provides visual pipeline views, sales forecasting, win/loss analysis, and activity tracking to help sales teams close more deals faster. This module is the revenue engine of NextCRM, translating qualified leads and account relationships into measurable business outcomes.

**Key Value Proposition:**
- **Visual Pipeline Management:** Drag-and-drop Kanban board showing deals across configurable sales stages
- **Accurate Forecasting:** Probability-weighted revenue projections with 85%+ forecast accuracy
- **Deal Intelligence:** Complete activity timeline showing all stakeholder interactions, next steps, and blockers
- **Win/Loss Analysis:** Structured loss reason tracking enabling data-driven sales process improvements

**Target Release:** Q1 2025

---

## 2. Problem Statement

### Current Situation
Sales teams track deals across spreadsheets, email, and disconnected tools without visibility into pipeline health or accurate forecasting. Managers can't see which deals are at risk, reps forget to follow up on critical opportunities, and leadership lacks reliable revenue projections for planning. Deal context gets lost during handoffs between SDRs and AEs, and post-loss analysis is impossible due to lack of structured data.

### Why This Matters
Without structured opportunity management:
- **Forecast Inaccuracy:** 55% of sales orgs miss quarterly forecasts by 10%+ (CSO Insights)
- **Lost Deals:** 48% of deals stall due to lack of follow-up (Salesforce State of Sales)
- **Revenue Leakage:** 25% of pipeline value lost to poor deal qualification and execution
- **Coaching Gaps:** Managers can't identify rep performance issues without activity visibility

### Success Vision
A sales rep opens their pipeline view each morning seeing all active deals sorted by close date, with visual indicators for at-risk opportunities. They click into a deal and see complete context: all stakeholder interactions, competitive intel, next steps, and forecast probability. Managers run weekly forecast calls with real-time pipeline snapshots showing weighted revenue by rep and stage. Leadership trusts quarterly projections because historical forecast accuracy is 90%+.

---

## 3. Target Users/Personas

### Primary Persona: Account Executive (AE)
- **Role:** Quota-carrying sales rep managing 20-40 active opportunities
- **Goals:**
  - Close $1M+ annually by moving deals through pipeline stages efficiently
  - Maintain accurate close dates and deal values for reliable commission payouts
  - Track all stakeholder interactions and competitive threats per deal
  - Prioritize highest-value opportunities and at-risk deals needing attention
- **Pain Points:**
  - Losing track of deals across multiple accounts and stakeholders
  - Missing critical follow-ups leading to deals going cold
  - Inaccurate forecasting causing surprise deal slippage
- **Use Cases:**
  - Monday morning: Review pipeline, identify deals closing this week, prioritize at-risk opportunities
  - Post-demo: Update deal stage, log next steps, adjust close date and probability
  - Month-end: Ensure forecast submitted, review slipped deals with manager

### Secondary Persona: Sales Manager
- **Role:** Manages 5-10 AEs, accountable for $5-10M annual team quota
- **Goals:**
  - Deliver accurate quarterly forecasts to leadership (within 5% variance)
  - Identify coaching opportunities based on rep pipeline health and activity metrics
  - Ensure deals progress through stages at healthy velocity (no stagnation)
- **Pain Points:**
  - Reps sandbag or overinflate forecasts, making planning impossible
  - No visibility into why deals are won or lost for process improvements
- **Use Cases:**
  - Weekly 1:1s: Review each rep's top 10 deals, identify blockers, coach on strategy
  - Quarterly business reviews: Analyze win/loss reasons, optimize sales process
  - Monthly forecasting: Roll up team pipeline, adjust probabilities, commit to leadership

### Tertiary Persona: Revenue Operations (RevOps) Analyst
- **Role:** Data analyst building pipeline reports and optimizing sales processes
- **Goals:**
  - Measure pipeline velocity (days in stage) and conversion rates by stage
  - Identify process bottlenecks causing deal stagnation
  - Build predictive models for deal scoring and forecast accuracy
- **Pain Points:**
  - Inconsistent data entry makes analysis unreliable
  - Can't attribute closed revenue back to campaigns or lead sources
- **Use Cases:**
  - Monthly reporting: Pipeline coverage ratios, stage conversion rates, win rates by rep/region
  - Process optimization: Identify stages with lowest conversion, recommend process changes
  - Attribution analysis: Track closed revenue back to originating campaigns

---

## 4. Functional Requirements

### 4.1 Core Features

#### Feature 1: Opportunity Creation & Management
**Description:** Complete CRUD operations for opportunity records capturing deal information, financial details, stakeholders, and sales context.

**User Stories:**
- As an AE, I want to create opportunities from qualified leads with pre-populated account/contact data
- As an AE, I want to edit deal value, close date, and probability as deals progress
- As a manager, I want required fields (name, account, close date, value) enforced for forecast reliability

**Specifications:**
- **Required Fields:** Name, organization ID, account (linked to crm_Accounts), close date, budget (deal value), sales stage
- **Standard Fields:**
  - Deal Details: Name (e.g., "Acme Corp - Enterprise License"), description, type (linked to crm_Opportunities_Type: New Business, Renewal, Upsell, Cross-sell)
  - Financial: Budget (integer, base unit currency), expected_revenue (calculated: budget * probability), currency (default: org currency)
  - Stakeholders: Assigned to (AE owner), contact (primary contact at account), campaign (attributed campaign)
  - Dates: Close date, created date, last activity date
  - Status: ACTIVE, INACTIVE, PENDING, CLOSED (crm_Opportunity_Status enum)
  - Sales Stage: Foreign key to crm_Opportunities_Sales_Stages (configurable stages like "Discovery", "Proposal", "Negotiation", "Closed Won")
- **Audit Fields:** createdAt, createdBy, updatedAt, updatedBy, last_activity_by
- **Calculated Fields:**
  - Expected Revenue: budget * (stage probability / 100)
  - Days in Stage: Current date - last stage change date
  - Age: Current date - created date
- **Validation:**
  - Close date cannot be in the past (unless status = CLOSED)
  - Budget must be > 0
  - Sales stage required (cannot be null)

**UI/UX Considerations:**
- Two-column form with deal details on left, financial/dates on right
- Quick-create modal from lead conversion or account page
- Inline editing on opportunity detail page (click-to-edit fields)
- Visual indicators for overdue close dates (red flag icon)

---

#### Feature 2: Sales Pipeline & Stage Management
**Description:** Visual Kanban board and configurable sales stages with probability weighting, stage conversion tracking, and drag-drop progression.

**User Stories:**
- As an AE, I want to drag deals across stages on a Kanban board to quickly update progress
- As a sales ops admin, I want to configure custom sales stages matching our process (5-7 stages)
- As a manager, I want to see stage conversion rates to identify bottlenecks in our process

**Specifications:**
- **Sales Stage Model (crm_Opportunities_Sales_Stages):**
  - Name: Stage name (e.g., "Discovery", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost")
  - Probability: Integer 0-100 (e.g., Discovery=20%, Proposal=40%, Negotiation=70%, Closed Won=100%)
  - Order: Display order (1-10)
- **Stage Progression Rules:**
  - Stages ordered sequentially (1 → 2 → 3 → ... → Closed)
  - Allows forward and backward movement (deals can regress)
  - Stage change triggers: Update last_activity date, add audit log entry, recalculate expected_revenue
- **Pipeline Views:**
  - **Kanban Board:** Columns per stage, cards showing opp name, account, value, close date, days in stage
  - **List View:** Sortable table with filters (stage, rep, close date range, value range)
  - **Forecast View:** Table grouped by stage, showing total count, total value, weighted value (sum of expected_revenue)
- **Stage Analytics:**
  - Conversion rate: % of opps moving from stage N to N+1
  - Average days in stage: Velocity metric per stage
  - Stage-to-stage leakage: % of opps lost per stage

**UI/UX Considerations:**
- Kanban board with swimlanes for each stage, drag-drop cards
- Card design: Bold account name, opp value ($100K), close date, days in stage (7d), assigned rep avatar
- Color-coded cards: Green (on track), yellow (close date <7 days), red (overdue)
- List view with server-side pagination (50 opps per page)

---

#### Feature 3: Sales Forecasting
**Description:** Probability-weighted revenue projections by stage, rep, and time period with commit/upside categories for accurate quarterly planning.

**User Stories:**
- As an AE, I want to submit my monthly forecast showing deals I'm confident in vs. pipeline
- As a manager, I want to roll up team forecasts and adjust rep probabilities for my forecast submission
- As leadership, I want quarterly revenue projections with historical accuracy metrics

**Specifications:**
- **Forecast Calculation:**
  - **Pipeline Value:** Sum of all ACTIVE opportunity budget values
  - **Weighted Pipeline:** Sum of expected_revenue (budget * probability) for all ACTIVE opps
  - **Forecast Categories:**
    - **Commit:** Opps at 70%+ probability (e.g., Negotiation stage and beyond)
    - **Best Case:** Opps at 40-69% probability (e.g., Proposal stage)
    - **Pipeline:** Opps at 10-39% probability (e.g., Discovery, Qualification)
- **Forecast Views:**
  - **By Rep:** Table showing each rep's commit/best case/pipeline values
  - **By Stage:** Chart showing weighted revenue by stage
  - **By Close Date:** Time-series showing expected closings by week/month/quarter
  - **Historical Accuracy:** Comparison of forecasted vs. actual closed revenue (past 4 quarters)
- **Forecast Period Filters:**
  - This Month
  - This Quarter
  - Next Quarter
  - Custom Date Range
- **Forecast Accuracy Metric:**
  - Formula: (Actual Closed Revenue / Forecasted Commit) * 100
  - Target: 85%+ accuracy (industry benchmark)
  - Historical tracking: Show past 4 quarters with trend line

**UI/UX Considerations:**
- Dashboard with 3 KPI cards: Pipeline ($2.5M), Weighted ($1.2M), Commit ($800K)
- Funnel chart showing deals by stage with weighted values
- Time-series chart showing close date distribution (histogram by week)
- Manager override: Ability to adjust rep's opp probabilities for roll-up forecast

---

#### Feature 4: Win/Loss Analysis
**Description:** Structured win/loss reason tracking with post-close surveys enabling data-driven sales process optimization.

**User Stories:**
- As an AE, I want to mark deals as "Closed Won" or "Closed Lost" with reason selection
- As a manager, I want win/loss reports showing top reasons for losses to coach team
- As RevOps, I want to correlate loss reasons with sales stages to identify process gaps

**Specifications:**
- **Close Actions:**
  - **Close Won:** Update status to CLOSED, sales_stage to "Closed Won", probability to 100%
  - **Close Lost:** Update status to CLOSED, sales_stage to "Closed Lost", probability to 0%, require loss reason
- **Loss Reason Categories (stored in description or new loss_reason field):**
  - **Competitive:** Lost to Competitor (specify competitor name)
  - **Budget:** No Budget / Budget Cut
  - **Timing:** Not Ready to Buy / Bad Timing
  - **Product Fit:** Feature Gap / Technical Limitations
  - **Champion Loss:** Champion Left Company / Lost Executive Support
  - **No Decision:** No Decision Made / Went Dark
  - **Other:** Free text explanation
- **Win Reason Categories (optional):**
  - Product superiority
  - Price advantage
  - Relationship strength
  - Timing (urgent need)
- **Post-Close Analysis:**
  - Win rate: (Closed Won / Total Closed) * 100
  - Average deal size: Sum(closed won budget) / count(closed won)
  - Average sales cycle: Avg days from created to closed
  - Loss reason distribution: Pie chart showing % by reason
  - Competitive intelligence: Table showing competitors and win/loss records

**UI/UX Considerations:**
- "Close Won" and "Close Lost" buttons prominent on opp detail page
- Close Lost modal requiring loss reason dropdown selection + optional notes
- Win/Loss dashboard with pie charts, bar charts, and competitor tables
- Filterable by date range, rep, product line, deal size

---

#### Feature 5: Opportunity Relationships & Context
**Description:** Link opportunities to related entities (accounts, contacts, documents, tasks) and display comprehensive activity timeline for complete deal context.

**User Stories:**
- As an AE, I want to see all stakeholders (contacts) involved in a deal to map decision-makers
- As an AE, I want to attach proposals, contracts, and NDAs to opportunities for easy access
- As a manager, I want to see activity timeline showing all rep touchpoints with buyer

**Specifications:**
- **Related Entities:**
  - **Account:** One-to-many relationship (one account, many opportunities)
  - **Contacts:** Many-to-many (via connected_contacts array) - all stakeholders in buying committee
  - **Documents:** Many-to-many (via connected_documents array) - proposals, contracts, SOWs
  - **Tasks:** One-to-many (future: link tasks to opportunities for follow-up tracking)
  - **Campaign:** Many-to-one (attributed marketing campaign)
- **Activity Timeline:**
  - Field changes (stage, value, close date, probability)
  - Status changes (ACTIVE → CLOSED)
  - Document uploads (proposal sent, contract signed)
  - Contact interactions (calls, emails, meetings - future integration)
  - Notes added by reps
  - Task completions (future)
- **Stakeholder Management:**
  - Add/remove contacts from opportunity
  - Designate primary contact (decision-maker)
  - Contact roles: Economic Buyer, Technical Buyer, Champion, Influencer (future)

**UI/UX Considerations:**
- Tabbed interface on opp detail page: Overview, Contacts (list with roles), Documents, Activity
- Activity timeline similar to Facebook feed: avatar, action description, timestamp
- "Add Contact" button with modal showing all contacts from linked account
- Drag-drop document upload directly to opportunity

---

#### Feature 6: Search, Filter & Reporting
**Description:** Advanced filtering, saved views, and export capabilities for pipeline analysis and CRM customization.

**User Stories:**
- As an AE, I want to filter my opportunities by close date to focus on deals closing this month
- As a manager, I want to save custom views (e.g., "Team's Q1 Pipeline", "At-Risk Deals")
- As RevOps, I want to export filtered opportunities to CSV for external analysis

**Specifications:**
- **Filter Options:**
  - Assigned to (rep)
  - Sales stage (multi-select)
  - Status (ACTIVE, CLOSED)
  - Close date range (this week, this month, this quarter, custom)
  - Budget range ($10K-$50K, $50K-$100K, $100K+)
  - Account (search by account name)
  - Campaign attribution
  - Opportunity type (New Business, Renewal, Upsell)
  - Days in stage (>30 days for stale deal detection)
- **Saved Views:**
  - User can save filter combinations with names
  - Org-level shared views (created by admins)
  - Default view per user (e.g., "My Open Opps")
- **Search:**
  - Full-text search on opportunity name, account name, description
  - Fuzzy matching with relevance ranking
- **Export:**
  - CSV export with all standard fields
  - Include related account name, assigned rep name, sales stage name
  - Respect current filters (export only visible opportunities)

**UI/UX Considerations:**
- Filter panel collapsible sidebar on left of list view
- "Save View" button storing current filter state
- View dropdown at top of page for quick switching
- Search bar with autocomplete suggestions
- Export button with format selection (CSV, JSON future: Excel)

---

### 4.2 Secondary Features

#### Feature 7: Opportunity Cloning
**Description:** Duplicate existing opportunities to quickly create similar deals (e.g., multi-year renewals, similar accounts in vertical).

**Specifications:**
- "Clone" button on opp detail page
- Creates new opp with all fields copied except: ID, created date, close date (set to +30 days), status (NEW)
- User prompted to edit name (e.g., "Acme Corp - Year 2 Renewal")

#### Feature 8: Bulk Operations
**Description:** Mass update, delete, export on selected opportunities for data management efficiency.

**Specifications:**
- Bulk actions: Update assigned to, update stage, update close date, delete, export
- Safety: Confirmation modal, undo capability (30 sec), audit log

#### Feature 9: Deal Health Scoring (Future)
**Description:** AI-powered deal health score (0-100) based on activity recency, stakeholder engagement, and historical patterns.

**Specifications:**
- Calculated score: Activity recency (40 pts), stakeholder breadth (30 pts), stage progression velocity (30 pts)
- Visual indicator: Green (healthy), yellow (at risk), red (urgent attention)

#### Feature 10: Competitive Intelligence Tracking
**Description:** Structured competitor tracking per opportunity showing which vendors are being evaluated.

**Specifications:**
- Competitors field: Array of competitor names (Salesforce, HubSpot, Pipedrive, etc.)
- Win/loss by competitor reports
- Competitor battle cards (future: knowledge base integration)

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Page Load Time:** Opportunity detail page <1.5 seconds (p95)
- **Pipeline Load:** Kanban board with 200 opportunities renders <2 seconds
- **Search Response:** <500ms for 50K opportunity database
- **Forecast Calculation:** Real-time weighted pipeline calc for 10K opps <1 second
- **Concurrent Users:** 500 concurrent users without degradation
- **Data Volume:** Support 1M opportunity records per platform

### 5.2 Security
- **Authentication:** All endpoints require valid JWT token
- **Authorization:** RBAC enforcement:
  - Viewers: Read-only all org opps
  - Members: Read all, edit/delete assigned opps
  - Admins/Owners: Full CRUD on all opps
- **Data Isolation:** 100% organizationId filtering (no cross-org data leakage)
- **Financial Data Protection:** Budget/revenue fields only visible to Member+ roles
- **Audit Logging:** All create, update, delete, close operations logged with user ID

### 5.3 Accessibility
- **WCAG AA Compliance:** All views accessible
- **Keyboard Navigation:** Full keyboard support for Kanban drag-drop (arrow keys + Enter)
- **Screen Reader:** All form fields properly labeled

### 5.4 Internationalization
- **Languages:** en, de, cz, uk
- **Currency:** Support 50+ currencies with locale-specific formatting
- **Date Formats:** Locale-aware date display

### 5.5 Compliance
- **GDPR:** Data export, right to erasure (cascade delete)
- **SOC 2:** Audit logs 7-year retention, encryption at rest/transit

---

## 6. Acceptance Criteria

### Core Functionality
- [ ] User can create opportunity with all required fields, linked to account
- [ ] User can update opportunity stage via dropdown or Kanban drag-drop
- [ ] User can close opportunity as Won/Lost with reason selection
- [ ] User can view forecast showing weighted pipeline by stage
- [ ] User can filter opportunities by stage, rep, close date, value
- [ ] User can add contacts to opportunity from linked account
- [ ] User can attach documents to opportunity via drag-drop
- [ ] User can view activity timeline showing all field changes and actions
- [ ] User can export filtered opportunities to CSV
- [ ] User can clone existing opportunity with one click

### Performance
- [ ] Opportunity detail page loads in <1.5 seconds
- [ ] Pipeline Kanban with 200 opps renders <2 seconds
- [ ] Forecast calculates weighted pipeline for 10K opps in <1 second
- [ ] Search returns results in <500ms
- [ ] Supports 500 concurrent users (load tested)

### Security
- [ ] All opp data isolated by organizationId (tested)
- [ ] RBAC enforced: Members can only edit assigned opps
- [ ] Audit logs capture all close, stage change, value updates
- [ ] Financial data (budget, revenue) hidden from Viewer role

### Accessibility
- [ ] WCAG AA compliant (0 critical violations)
- [ ] Full keyboard navigation (including Kanban drag-drop)
- [ ] Screen reader tested with NVDA

### i18n
- [ ] All UI strings externalized
- [ ] Tested in all 4 languages
- [ ] Currency formatted per locale

### Forecasting
- [ ] Weighted pipeline calculated correctly (budget * probability)
- [ ] Forecast shows commit/best case/pipeline buckets by probability
- [ ] Historical forecast accuracy report shows past 4 quarters
- [ ] Manager can roll up team forecasts

---

## 7. Success Metrics

| Metric Category | Metric | Target | Measurement Method |
|----------------|--------|--------|-------------------|
| **Adoption** | Active opportunities per org | 50+ | Monthly unique opp views |
| **Engagement** | Daily active opp users | 80% of sales team | Users editing opps daily |
| **Performance** | Opp page load time | <1.5 sec (p95) | DataDog RUM |
| **Quality** | Forecast accuracy | 85%+ | Forecasted vs actual closed revenue |
| **Business Impact** | Sales cycle length | 45 days avg | Avg days from created to closed won |
| **Win Rate** | Closed won % | 25%+ | (Closed won / Total closed) * 100 |
| **Pipeline Velocity** | Avg days per stage | <15 days | Time between stage changes |
| **Data Completeness** | Opps with all required fields | 95%+ | Weekly scan |
| **User Satisfaction** | Opp module NPS | 50+ | Quarterly survey |

**Key Performance Indicators (KPIs):**
1. **Forecast Accuracy:** 85%+ quarterly (forecasted commit vs actual closed revenue)
2. **Win Rate:** 25%+ of opportunities close as won (industry benchmark: 47% for B2B SaaS - Hubspot)
3. **Sales Cycle:** Average 45 days from created to closed won (vs industry avg 84 days)

---

## 8. Dependencies

### Internal Dependencies
| Dependency | Type | Status | Impact if Delayed |
|-----------|------|--------|------------------|
| Multi-Tenancy & RBAC | Hard | Complete | Cannot enforce permissions |
| CRM Accounts Module | Hard | Complete | Opportunities require account links |
| CRM Contacts Module | Soft | Complete | Cannot link stakeholders to deals |
| Document Management | Soft | Complete | Cannot attach proposals to opps |

### External Dependencies
| Dependency | Provider | SLA | Risk Level |
|-----------|----------|-----|-----------|
| MongoDB Atlas | MongoDB Inc | 99.95% uptime | Low |
| Prisma ORM | Prisma Labs | Community | Low |

---

## 9. Out of Scope

- [ ] AI deal scoring and health predictions
- [ ] Automated stage progression rules
- [ ] Email integration (track sent proposals)
- [ ] Advanced reporting dashboards (see PRD-ADMIN.md)
- [ ] Mobile native app
- [ ] CRM integrations (Salesforce sync)
- [ ] Commission calculation engine
- [ ] Automated task creation per stage

**Future Considerations:**
- Predictive close date recommendations using ML
- Slack notifications for at-risk deals
- Email tracking (proposal opens, link clicks)

---

## 10. Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|------|------------|--------|-------------------|-------|
| **Forecast Inaccuracy:** Reps game probabilities, forecasts unreliable | High | High | Manager override capability, historical accuracy tracking, probability calibration | Product Manager |
| **Data Quality:** Inconsistent stage progression, missing close dates | Medium | High | Required field enforcement, stage progression rules, automated reminders | Engineering |
| **Performance:** Large pipelines (1000+ opps) slow to render | Medium | Medium | Server-side pagination, virtual scrolling on Kanban, query optimization | Backend Engineer |
| **Low Adoption:** Reps continue using spreadsheets | Medium | High | Gamification (leaderboards), mobile-responsive UI, CSV import for migration | Product Designer |

---

## 11. Launch Requirements

### Pre-Launch Checklist

#### Development
- [ ] All acceptance criteria met
- [ ] Code review completed (2+ approvals)
- [ ] Unit tests >90% coverage
- [ ] Integration tests passing (CRUD, stage progression, forecasting)
- [ ] Performance tested (1000 opp pipeline load)
- [ ] Security audit completed

#### QA
- [ ] Functional testing (all user stories)
- [ ] Regression testing (CRM modules not broken)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive (iOS/Android)
- [ ] Accessibility testing (screen reader)
- [ ] Load testing (500 concurrent users)

#### Documentation
- [ ] User guide with screenshots
- [ ] API documentation updated
- [ ] Admin guide for stage configuration
- [ ] Training video (15-minute walkthrough)
- [ ] Release notes drafted

#### Operations
- [ ] Monitoring configured (forecast accuracy, win rate, page load time)
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] On-call rotation scheduled
- [ ] Incident response runbook

#### Go-to-Market
- [ ] Marketing materials (demo video, screenshots)
- [ ] Sales team trained
- [ ] Support FAQ prepared
- [ ] Beta testing completed (10 customers)

---

## Appendix

### A. User Flows
1. **Create Opportunity:** Lead Detail (status=QUALIFIED) → Convert to Opp → Account Selection → Opp Form → Save → Opp Detail Page
2. **Update Stage:** Opp List → Kanban View → Drag Card to New Stage → Confirm → Timeline Updated
3. **Close Won:** Opp Detail → Close Won Button → Confirm → Status=CLOSED, Stage=Closed Won, Probability=100%
4. **Submit Forecast:** Pipeline View → Forecast Tab → Review Commit/Best Case/Pipeline → Submit → Manager Notification

### B. API Specifications
- `GET /api/crm/opportunities` - List with filters, pagination
- `POST /api/crm/opportunities` - Create
- `PUT /api/crm/opportunities/[id]` - Update
- `DELETE /api/crm/opportunities/[id]` - Delete
- `POST /api/crm/opportunities/[id]/close` - Close won/lost
- `GET /api/crm/opportunities/forecast` - Forecast data

### C. Database Schema
See [prisma/schema.prisma](../../prisma/schema.prisma) - `crm_Opportunities` model (lines 213-252)

### D. Related Documents
- [Technical Design: Forecast Calculation Engine](../ARCHITECTURE.md)
- [Security: RBAC Implementation](../RBAC.md)
- [Test Plan: Opportunity Module](../QA_COMPREHENSIVE_REPORT.md)

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
| Design Lead | TBD | | |
| Security Lead | TBD | | |
