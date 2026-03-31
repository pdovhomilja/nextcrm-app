# Reports Module Remaster — Design Spec

**Date:** 2026-03-31
**Status:** Approved

## Overview

Remaster the `/reports` module from a static, hardcoded chart page into a full BI-lite reporting system serving sales managers, marketing managers, and executives. Features include a KPI summary dashboard with drill-down sub-pages, date range filtering, category-specific filters, CSV/PDF export, saved report configurations (personal + shared), and scheduled email report delivery via Inngest + Resend.

## Architecture: Approach A — Monolithic Server Components

Reports are built as Next.js server components with client-side interactivity only for filters, date pickers, and toolbar actions. Data fetching happens server-side via Prisma. Charts render client-side via Tremor. This stays consistent with the existing app architecture.

---

## 1. Information Architecture & URL Structure

### Summary Dashboard

`/reports` — top-level page with 10 KPI cards arranged in a 2x5 grid. Each card shows:
- Metric value
- Comparison vs previous period (% change with trend indicator)
- Mini sparkline
- Clickable — navigates to the relevant detail sub-page with current date range preserved

### KPI Cards (10 total)

1. **Total Revenue** — sum of won opportunities in period
2. **Pipeline Value** — sum of open opportunities in period
3. **New Leads** — leads created in period
4. **Lead-to-Opportunity Conversion Rate** — leads converted / total leads in period
5. **New Contacts** — contacts created in period
6. **Active Users** — users with status = ACTIVE (by year or lifetime)
7. **Open / Overdue Tasks** — open tasks count, overdue highlighted
8. **Campaign Performance** — sent / opened / clicked aggregate
9. **New Accounts** — accounts created in period
10. **Contracts Expiring Soon** — contracts with end date within 30/60/90 days

### Detail Sub-Pages (6 categories)

| Category | URL | Reports |
|---|---|---|
| **Sales** | `/reports/sales` | Revenue over time, pipeline value breakdown, opportunities by stage, opportunities by month, win/loss rate, average deal size, sales cycle length |
| **Leads & Contacts** | `/reports/leads` | New leads by month, lead sources, lead-to-opportunity conversion rate, new contacts by month, contacts by account |
| **Accounts** | `/reports/accounts` | New accounts over time, accounts by industry, top accounts by revenue, accounts by size |
| **Activity** | `/reports/activity` | Tasks created/completed over time, overdue tasks, tasks by assignee, activities by type |
| **Campaigns** | `/reports/campaigns` | Campaign performance (sent/opened/clicked), campaign ROI, best performing templates, target list growth |
| **Users** | `/reports/users` | Active users by year, active users lifetime, user growth over time, users by role |

### Shared Layout

Every sub-page includes:
- **Date range picker** at the top — presets: Last 7 days, Last 30 days, Last 90 days, This Year, All Time, Custom (calendar popover)
- **Category-specific filters** in a collapsible filter bar below the date picker
- **Toolbar** with: Export CSV, Export PDF, Save Config, Schedule Report buttons

---

## 2. Data Model Changes

### New Prisma Models

```prisma
model crm_Report_Config {
  id        String   @id @default(cuid())
  name      String   // user-given name, e.g. "Q1 Sales"
  category  String   // sales | leads | accounts | activity | campaigns | users
  filters   Json     // serialized: { dateFrom, dateTo, ...category-specific filters }
  isShared  Boolean  @default(false)
  createdBy String
  user      Users    @relation(fields: [createdBy], references: [id])
  schedules crm_Report_Schedule[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model crm_Report_Schedule {
  id             String   @id @default(cuid())
  reportConfigId String
  reportConfig   crm_Report_Config @relation(fields: [reportConfigId], references: [id], onDelete: Cascade)
  cronExpression String   // e.g. "0 9 * * 1" for Monday 9am
  recipients     Json     // array of email addresses
  format         String   // csv | pdf | both
  isActive       Boolean  @default(true)
  lastSentAt     DateTime?
  createdBy      String
  user           Users    @relation(fields: [createdBy], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

No changes to existing models. All report data is derived by querying existing tables with date range filters.

---

## 3. Server Actions & Data Fetching

### Action Files

```
actions/reports/
├── sales.ts        — getRevenue(), getPipelineValue(), getOppsByStage(),
│                     getOppsByMonth(), getWinLossRate(), getAvgDealSize(),
│                     getSalesCycleLength()
├── leads.ts        — getNewLeads(), getLeadSources(), getConversionRate(),
│                     getNewContacts(), getContactsByAccount()
├── accounts.ts     — getNewAccounts(), getAccountsByIndustry(),
│                     getTopAccountsByRevenue(), getAccountsBySize()
├── activity.ts     — getTasksCreatedCompleted(), getOverdueTasks(),
│                     getTasksByAssignee(), getActivitiesByType()
├── campaigns.ts    — getCampaignPerformance(), getCampaignROI(),
│                     getTopTemplates(), getTargetListGrowth()
├── users.ts        — getActiveUsersByYear(), getActiveUsersLifetime(),
│                     getUserGrowth(), getUsersByRole()
├── dashboard.ts    — getDashboardKPIs() (one number per KPI + sparkline data)
├── export.ts       — generateCSV(), generatePDF()
├── config.ts       — saveConfig(), loadConfig(), listConfigs(), deleteConfig(),
│                     shareConfig()
├── schedule.ts     — createSchedule(), updateSchedule(), deleteSchedule(),
│                     listSchedules()
```

### Common Filter Type

```ts
type ReportFilters = {
  dateFrom: Date
  dateTo: Date
  assigneeId?: string
  accountId?: string
  salesStage?: string
  campaignId?: string
  industryType?: string
  userRole?: string
}
```

Every data-fetching action accepts `ReportFilters`. Existing actions (`get-users.ts`, `get-opportunities.ts`, `get-tasks.ts`) remain in place for backward compatibility. New report actions query Prisma directly with proper date range filtering.

---

## 4. UI Components Architecture

### New Shared Components

```
components/reports/
├── DateRangePicker.tsx    — preset buttons (7d, 30d, 90d, YTD, All Time)
│                            + custom range via calendar popover
├── FilterBar.tsx          — collapsible bar, renders category-specific filters
├── KPICard.tsx            — number + label + sparkline + trend indicator (↑12%)
│                            clickable, navigates to detail page
├── ReportToolbar.tsx      — Export CSV, Export PDF, Save Config, Schedule buttons
├── SaveConfigDialog.tsx   — modal: name input, share toggle
├── ScheduleDialog.tsx     — modal: frequency (daily/weekly/monthly/custom cron),
│                            recipients input, format select (csv/pdf/both)
├── ReportChart.tsx        — wrapper around Tremor BarChart/AreaChart with
│                            consistent styling and empty states
├── ReportTable.tsx        — tabular data view with sorting for drill-downs
├── SavedReportsDropdown.tsx — dropdown listing user's own + shared configs
```

### Page Structure Pattern

Each sub-page follows this structure:

```
/reports/[category]/page.tsx  (server component)
├── FilterBar (client)        — URL search params for date range + filters
├── ReportToolbar (client)    — export/save/schedule actions
├── SavedReportsDropdown      — load saved filter configs
├── Grid of ReportChart/ReportTable (server) — charts populated by server actions
```

### Date Range & Filter Flow

Filters flow via **URL search params** (`?from=2025-01-01&to=2025-12-31&stage=won`):
- Reports are shareable by link
- Works naturally with server components
- `FilterBar` client component updates the URL, triggering server re-render
- Date range is preserved when navigating between dashboard and sub-pages

### Summary Dashboard Layout

`/reports/page.tsx`:
- Date range picker at the top (affects all KPI cards)
- 2x5 responsive grid of `KPICard` components
- Each card click navigates to relevant sub-page with date range in URL

---

## 5. Export & Scheduling

### CSV Export

- Server action receives current filters + category
- Queries Prisma for raw data
- Streams response as CSV using `Response` with `text/csv` content type
- Column headers are human-readable, localized via `next-intl`
- Filename pattern: `"Sales Report - 2025-01-01 to 2025-03-31.csv"`

### PDF Export

- Uses `@react-pdf/renderer` for server-side generation
- Simple, clean layout:
  - Header: app name, report title, date range
  - Body: data tables and chart images
  - White background, no heavy branding
- Charts rendered as static images via Tremor server-side snapshot
  - Fallback: data tables only if chart imaging proves too complex (iterative)
- Returns as downloadable file

### Scheduled Reports (Inngest)

```
Inngest function: "reports/send-scheduled"
├── Cron trigger: runs every 15 minutes
├── Queries crm_Report_Schedule where isActive = true and due
│   (lastSentAt is null or enough time has elapsed per cronExpression)
├── For each due schedule:
│   ├── Load linked crm_Report_Config (category + filters)
│   ├── Generate CSV and/or PDF via same export actions
│   ├── Send via Resend with attachments
│   ├── Update lastSentAt
```

### Schedule Frequency Options (UI)

- **Daily** — every morning at 9am
- **Weekly** — choose day of week
- **Monthly** — choose day of month
- **Custom** — raw cron expression input for power users

### Resend Integration

- New email template for report delivery
- Subject line: report name + date range (e.g., "Q1 Sales Pipeline — Jan 1 to Mar 31, 2025")
- Body: brief summary text + attached file(s)
- Reuses existing Resend API key from app config

---

## 6. Saved Configurations & Sharing

### Save Flow

1. User sets date range + filters on any report sub-page
2. Clicks "Save Config" in toolbar → `SaveConfigDialog` opens
3. Enters a name (e.g., "Q1 Sales Pipeline"), toggles "Share with team" if desired
4. Saves to `crm_Report_Config` with current URL params serialized as JSON in `filters` field

### Load Flow

- Each report sub-page shows a `SavedReportsDropdown` next to the filter bar
- Lists user's own configs + all shared configs for that category
- Selecting one applies the saved filters (updates URL params)

### Management

- Users can rename, delete, and toggle sharing on their own configs
- Shared configs are read-only to other users (they can "duplicate" to create their own copy)
- No admin approval needed for sharing — any user can share

### Schedule-Config Relationship

- When creating a schedule, user picks from their saved configs (or saves current view first)
- If a config is deleted, linked schedules are cascade-deleted (Prisma `onDelete: Cascade`)

---

## 7. Localization

All report titles, KPI labels, filter labels, button text, date format, and number formatting use `next-intl`. New translation keys added under `ReportsPage` namespace for all supported locales (en, cs, de, uk).

---

## 8. New Dependencies

- `@react-pdf/renderer` — PDF generation
- No new chart library — continues using Tremor

---

## 9. Migration from Current Reports

The current `/reports/page.tsx` (hardcoded 2023/2024 user charts, tasks, opportunities) is fully replaced by the new summary dashboard. Existing server actions (`get-users.ts`, `get-opportunities.ts`, `get-tasks.ts`) remain available for other parts of the app but are not used by the new reports module.
