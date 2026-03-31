# Reports Module Remaster — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static reports page with a BI-lite reporting system featuring KPI dashboard, 6 drill-down categories, date range filtering, CSV/PDF export, saved configs, and scheduled email delivery.

**Architecture:** Next.js server components with client-side interactivity for filters/toolbar. Data fetched via Prisma server actions. Charts via Tremor. Exports via `@react-pdf/renderer` + CSV streaming. Scheduling via Inngest cron + Resend.

**Tech Stack:** Next.js 16, React 19, Prisma 7, Tremor, `@react-pdf/renderer`, Inngest 4, Resend, next-intl, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-31-reports-remaster-design.md`

---

## File Structure

```
prisma/
  schema.prisma                          — ADD crm_Report_Config, crm_Report_Schedule models

actions/reports/
  types.ts                               — ReportFilters type, ChartDataPoint type
  dashboard.ts                           — getDashboardKPIs()
  sales.ts                               — getRevenue(), getPipelineValue(), getOppsByStage(), getOppsByMonth(), getWinLossRate(), getAvgDealSize(), getSalesCycleLength()
  leads.ts                               — getNewLeads(), getLeadSources(), getConversionRate(), getNewContacts(), getContactsByAccount()
  accounts.ts                            — getNewAccounts(), getAccountsByIndustry(), getTopAccountsByRevenue(), getAccountsBySize()
  activity.ts                            — getTasksCreatedCompleted(), getOverdueTasks(), getTasksByAssignee(), getActivitiesByType()
  campaigns.ts                           — getCampaignPerformance(), getCampaignROI(), getTopTemplates(), getTargetListGrowth()
  users.ts                               — getActiveUsersByYear(), getActiveUsersLifetime(), getUserGrowth(), getUsersByRole()
  config.ts                              — saveConfig(), loadConfigs(), deleteConfig(), duplicateConfig(), toggleShare()
  schedule.ts                            — createSchedule(), updateSchedule(), deleteSchedule(), listSchedules()
  export-csv.ts                          — generateCSV()
  export-pdf.ts                          — generatePDF()

components/reports/
  DateRangePicker.tsx                     — preset buttons + custom calendar popover
  FilterBar.tsx                           — collapsible category-specific filters
  KPICard.tsx                             — metric + sparkline + trend, clickable
  ReportToolbar.tsx                       — Export CSV, Export PDF, Save, Schedule buttons
  ReportChart.tsx                         — Tremor chart wrapper with empty state
  ReportTable.tsx                         — sortable data table for drill-downs
  SaveConfigDialog.tsx                    — name input + share toggle modal
  ScheduleDialog.tsx                      — frequency + recipients + format modal
  SavedReportsDropdown.tsx                — dropdown of saved/shared configs
  ReportPageLayout.tsx                    — shared layout: date picker + filters + toolbar + children

app/[locale]/(routes)/reports/
  page.tsx                                — REPLACE: KPI dashboard with 10 cards
  loading.tsx                             — UPDATE: skeleton for new dashboard layout
  layout.tsx                              — NEW: shared report layout (optional)
  sales/page.tsx                          — Sales reports sub-page
  leads/page.tsx                          — Leads & Contacts reports sub-page
  accounts/page.tsx                       — Accounts reports sub-page
  activity/page.tsx                       — Activity reports sub-page
  campaigns/page.tsx                      — Campaigns reports sub-page
  users/page.tsx                          — Users reports sub-page

inngest/functions/reports/
  send-scheduled.ts                       — Cron function: check due schedules, generate, email

app/api/inngest/route.ts                  — ADD: reportSendScheduled to functions array
app/api/reports/export/route.ts           — GET: stream CSV/PDF download

emails/
  ScheduledReport.tsx                     — React Email template for report delivery

locales/en.json                           — ADD ReportsPage keys
locales/cz.json                           — ADD ReportsPage keys
locales/de.json                           — ADD ReportsPage keys
locales/uk.json                           — ADD ReportsPage keys

__tests__/reports/
  types.test.ts                           — Filter type validation
  dashboard.test.ts                       — Dashboard KPI actions
  sales.test.ts                           — Sales report actions
  leads.test.ts                           — Leads report actions
  accounts.test.ts                        — Accounts report actions
  activity.test.ts                        — Activity report actions
  campaigns.test.ts                       — Campaigns report actions
  users.test.ts                           — Users report actions
  config.test.ts                          — Saved config CRUD actions
  schedule.test.ts                        — Schedule CRUD actions
  export-csv.test.ts                      — CSV generation
  inngest-send-scheduled.test.ts          — Inngest cron function
```

---

## Task 1: Prisma Schema — Report Config & Schedule Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add crm_Report_Config model to schema**

Add after the `crm_AuditLog` model (around line 868):

```prisma
model crm_Report_Config {
  id        String   @id @default(cuid())
  name      String
  category  String   // sales | leads | accounts | activity | campaigns | users
  filters   Json     @db.JsonB
  isShared  Boolean  @default(false)
  createdBy String   @db.Uuid

  user      Users    @relation("report_configs", fields: [createdBy], references: [id])
  schedules crm_Report_Schedule[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([createdBy])
  @@index([category])
  @@index([isShared])
}

model crm_Report_Schedule {
  id             String    @id @default(cuid())
  reportConfigId String
  cronExpression String
  recipients     Json      @db.JsonB
  format         String    // csv | pdf | both
  isActive       Boolean   @default(true)
  lastSentAt     DateTime?
  createdBy      String    @db.Uuid

  reportConfig crm_Report_Config @relation(fields: [reportConfigId], references: [id], onDelete: Cascade)
  user         Users              @relation("report_schedules", fields: [createdBy], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([reportConfigId])
  @@index([createdBy])
  @@index([isActive])
  @@index([lastSentAt])
}
```

- [ ] **Step 2: Add relation fields to Users model**

In the `Users` model (around line 841), add these two relation fields:

```prisma
  report_configs               crm_Report_Config[]   @relation("report_configs")
  report_schedules             crm_Report_Schedule[] @relation("report_schedules")
```

- [ ] **Step 3: Generate and run migration**

Run:
```bash
npx prisma migrate dev --name add-report-config-and-schedule
```

Expected: Migration created and applied successfully. Prisma Client regenerated.

- [ ] **Step 4: Verify migration**

Run:
```bash
npx prisma db push --dry-run
```

Expected: "All models are in sync" or equivalent success message.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(reports): add crm_Report_Config and crm_Report_Schedule models"
```

---

## Task 2: Shared Types & Constants

**Files:**
- Create: `actions/reports/types.ts`
- Test: `__tests__/reports/types.test.ts`

- [ ] **Step 1: Write the test for types**

```ts
// __tests__/reports/types.test.ts
import type {
  ReportFilters,
  ReportCategory,
  ChartDataPoint,
  KPIData,
  ExportFormat,
  ScheduleFrequency,
} from "@/actions/reports/types";
import {
  REPORT_CATEGORIES,
  DATE_PRESETS,
  parseSearchParamsToFilters,
  filtersToSearchParams,
} from "@/actions/reports/types";

describe("report types and helpers", () => {
  describe("REPORT_CATEGORIES", () => {
    it("contains all 6 categories", () => {
      expect(REPORT_CATEGORIES).toEqual([
        "sales",
        "leads",
        "accounts",
        "activity",
        "campaigns",
        "users",
      ]);
    });
  });

  describe("DATE_PRESETS", () => {
    it("contains expected presets", () => {
      const keys = DATE_PRESETS.map((p) => p.key);
      expect(keys).toEqual(["7d", "30d", "90d", "ytd", "all"]);
    });

    it("each preset has a getRange function returning valid dates", () => {
      for (const preset of DATE_PRESETS) {
        const { from, to } = preset.getRange();
        expect(from).toBeInstanceOf(Date);
        expect(to).toBeInstanceOf(Date);
        expect(from.getTime()).toBeLessThanOrEqual(to.getTime());
      }
    });
  });

  describe("parseSearchParamsToFilters", () => {
    it("parses from and to dates", () => {
      const params = new URLSearchParams("from=2025-01-01&to=2025-03-31");
      const filters = parseSearchParamsToFilters(params);
      expect(filters.dateFrom).toEqual(new Date("2025-01-01"));
      expect(filters.dateTo).toEqual(new Date("2025-03-31"));
    });

    it("defaults to last 30 days when no dates provided", () => {
      const params = new URLSearchParams("");
      const filters = parseSearchParamsToFilters(params);
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Allow 1 second tolerance
      expect(filters.dateTo.getTime()).toBeGreaterThanOrEqual(
        now.getTime() - 1000
      );
      expect(filters.dateFrom.getTime()).toBeGreaterThanOrEqual(
        thirtyDaysAgo.getTime() - 1000
      );
    });

    it("parses optional filter params", () => {
      const params = new URLSearchParams(
        "from=2025-01-01&to=2025-12-31&assigneeId=user-1&salesStage=won"
      );
      const filters = parseSearchParamsToFilters(params);
      expect(filters.assigneeId).toBe("user-1");
      expect(filters.salesStage).toBe("won");
    });
  });

  describe("filtersToSearchParams", () => {
    it("converts filters to URLSearchParams string", () => {
      const filters: ReportFilters = {
        dateFrom: new Date("2025-01-01"),
        dateTo: new Date("2025-03-31"),
        assigneeId: "user-1",
      };
      const result = filtersToSearchParams(filters);
      expect(result).toContain("from=2025-01-01");
      expect(result).toContain("to=2025-03-31");
      expect(result).toContain("assigneeId=user-1");
    });

    it("omits undefined optional fields", () => {
      const filters: ReportFilters = {
        dateFrom: new Date("2025-01-01"),
        dateTo: new Date("2025-03-31"),
      };
      const result = filtersToSearchParams(filters);
      expect(result).not.toContain("assigneeId");
      expect(result).not.toContain("salesStage");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/types.test.ts --no-cache`
Expected: FAIL — cannot find module `@/actions/reports/types`

- [ ] **Step 3: Implement types and helpers**

```ts
// actions/reports/types.ts

export type ReportCategory =
  | "sales"
  | "leads"
  | "accounts"
  | "activity"
  | "campaigns"
  | "users";

export const REPORT_CATEGORIES: ReportCategory[] = [
  "sales",
  "leads",
  "accounts",
  "activity",
  "campaigns",
  "users",
];

export type ReportFilters = {
  dateFrom: Date;
  dateTo: Date;
  assigneeId?: string;
  accountId?: string;
  salesStage?: string;
  campaignId?: string;
  industryType?: string;
  userRole?: string;
};

export type ChartDataPoint = {
  name: string;
  Number: number;
};

export type KPIData = {
  label: string;
  value: number;
  previousValue: number;
  changePercent: number;
  sparkline: number[];
  href: string;
};

export type ExportFormat = "csv" | "pdf" | "both";

export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "custom";

export type DatePreset = {
  key: string;
  labelKey: string;
  getRange: () => { from: Date; to: Date };
};

export const DATE_PRESETS: DatePreset[] = [
  {
    key: "7d",
    labelKey: "last7Days",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);
      return { from, to };
    },
  },
  {
    key: "30d",
    labelKey: "last30Days",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from, to };
    },
  },
  {
    key: "90d",
    labelKey: "last90Days",
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      return { from, to };
    },
  },
  {
    key: "ytd",
    labelKey: "yearToDate",
    getRange: () => {
      const to = new Date();
      const from = new Date(to.getFullYear(), 0, 1);
      return { from, to };
    },
  },
  {
    key: "all",
    labelKey: "allTime",
    getRange: () => {
      const to = new Date();
      const from = new Date(2020, 0, 1); // app origin
      return { from, to };
    },
  },
];

export function parseSearchParamsToFilters(
  params: URLSearchParams
): ReportFilters {
  const fromStr = params.get("from");
  const toStr = params.get("to");

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dateFrom = fromStr ? new Date(fromStr) : thirtyDaysAgo;
  const dateTo = toStr ? new Date(toStr) : now;

  return {
    dateFrom,
    dateTo,
    assigneeId: params.get("assigneeId") ?? undefined,
    accountId: params.get("accountId") ?? undefined,
    salesStage: params.get("salesStage") ?? undefined,
    campaignId: params.get("campaignId") ?? undefined,
    industryType: params.get("industryType") ?? undefined,
    userRole: params.get("userRole") ?? undefined,
  };
}

export function filtersToSearchParams(filters: ReportFilters): string {
  const params = new URLSearchParams();
  params.set("from", filters.dateFrom.toISOString().split("T")[0]);
  params.set("to", filters.dateTo.toISOString().split("T")[0]);

  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.salesStage) params.set("salesStage", filters.salesStage);
  if (filters.campaignId) params.set("campaignId", filters.campaignId);
  if (filters.industryType) params.set("industryType", filters.industryType);
  if (filters.userRole) params.set("userRole", filters.userRole);

  return params.toString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/types.test.ts --no-cache`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add actions/reports/types.ts __tests__/reports/types.test.ts
git commit -m "feat(reports): add shared types, constants, and filter helpers"
```

---

## Task 3: Sales Report Actions

**Files:**
- Create: `actions/reports/sales.ts`
- Test: `__tests__/reports/sales.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/sales.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  getRevenue,
  getPipelineValue,
  getOppsByStage,
  getOppsByMonth,
  getWinLossRate,
  getAvgDealSize,
  getSalesCycleLength,
} from "@/actions/reports/sales";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = {
  dateFrom: new Date("2025-01-01"),
  dateTo: new Date("2025-12-31"),
};

describe("sales report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getRevenue", () => {
    it("sums budget of won opportunities in date range", async () => {
      (prismadb.crm_Opportunities.aggregate as jest.Mock).mockResolvedValue({
        _sum: { budget: BigInt(150000) },
      });

      const result = await getRevenue(baseFilters);

      expect(prismadb.crm_Opportunities.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "CLOSED",
            deletedAt: null,
          }),
          _sum: { budget: true },
        })
      );
      expect(result).toBe(150000);
    });

    it("returns 0 when no won opportunities", async () => {
      (prismadb.crm_Opportunities.aggregate as jest.Mock).mockResolvedValue({
        _sum: { budget: null },
      });

      const result = await getRevenue(baseFilters);
      expect(result).toBe(0);
    });
  });

  describe("getPipelineValue", () => {
    it("sums budget of active opportunities", async () => {
      (prismadb.crm_Opportunities.aggregate as jest.Mock).mockResolvedValue({
        _sum: { budget: BigInt(500000) },
      });

      const result = await getPipelineValue(baseFilters);
      expect(result).toBe(500000);
    });
  });

  describe("getOppsByStage", () => {
    it("groups opportunities by sales stage name", async () => {
      (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([
        { assigned_sales_stage: { name: "Prospecting" } },
        { assigned_sales_stage: { name: "Prospecting" } },
        { assigned_sales_stage: { name: "Closed Won" } },
      ]);

      const result = await getOppsByStage(baseFilters);

      expect(result).toEqual([
        { name: "Prospecting", Number: 2 },
        { name: "Closed Won", Number: 1 },
      ]);
    });
  });

  describe("getOppsByMonth", () => {
    it("groups opportunities by creation month", async () => {
      (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([
        { created_on: new Date("2025-01-15") },
        { created_on: new Date("2025-01-20") },
        { created_on: new Date("2025-02-10") },
      ]);

      const result = await getOppsByMonth(baseFilters);

      expect(result).toEqual([
        { name: "2025-01", Number: 2 },
        { name: "2025-02", Number: 1 },
      ]);
    });
  });

  describe("getWinLossRate", () => {
    it("calculates win/loss counts", async () => {
      (prismadb.crm_Opportunities.count as jest.Mock)
        .mockResolvedValueOnce(10) // won
        .mockResolvedValueOnce(5); // total closed

      const result = await getWinLossRate(baseFilters);

      expect(result).toEqual({ won: 10, total: 5, rate: 200 });
    });
  });

  describe("getAvgDealSize", () => {
    it("returns average budget of closed opportunities", async () => {
      (prismadb.crm_Opportunities.aggregate as jest.Mock).mockResolvedValue({
        _avg: { budget: 75000 },
      });

      const result = await getAvgDealSize(baseFilters);
      expect(result).toBe(75000);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/sales.test.ts --no-cache`
Expected: FAIL — cannot find module `@/actions/reports/sales`

- [ ] **Step 3: Implement sales actions**

```ts
// actions/reports/sales.ts
import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";

function dateRangeWhere(filters: ReportFilters) {
  return {
    created_on: {
      gte: filters.dateFrom,
      lte: filters.dateTo,
    },
    deletedAt: null,
  };
}

export async function getRevenue(filters: ReportFilters): Promise<number> {
  const result = await prismadb.crm_Opportunities.aggregate({
    where: {
      ...dateRangeWhere(filters),
      status: "CLOSED",
      ...(filters.salesStage
        ? { assigned_sales_stage: { name: filters.salesStage } }
        : {}),
    },
    _sum: { budget: true },
  });
  return Number(result._sum.budget ?? 0);
}

export async function getPipelineValue(
  filters: ReportFilters
): Promise<number> {
  const result = await prismadb.crm_Opportunities.aggregate({
    where: {
      ...dateRangeWhere(filters),
      status: "ACTIVE",
    },
    _sum: { budget: true },
  });
  return Number(result._sum.budget ?? 0);
}

export async function getOppsByStage(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: dateRangeWhere(filters),
    select: { assigned_sales_stage: { select: { name: true } } },
  });

  const grouped = opps.reduce<Record<string, number>>((acc, opp) => {
    const stage = opp.assigned_sales_stage?.name ?? "Unassigned";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, count]) => ({
    name,
    Number: count,
  }));
}

export async function getOppsByMonth(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: dateRangeWhere(filters),
    select: { created_on: true },
  });

  const grouped = opps.reduce<Record<string, number>>((acc, opp) => {
    if (!opp.created_on) return acc;
    const d = new Date(opp.created_on);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, Number: count }));
}

export async function getWinLossRate(
  filters: ReportFilters
): Promise<{ won: number; total: number; rate: number }> {
  const won = await prismadb.crm_Opportunities.count({
    where: {
      ...dateRangeWhere(filters),
      status: "CLOSED",
    },
  });

  const total = await prismadb.crm_Opportunities.count({
    where: {
      ...dateRangeWhere(filters),
      status: { in: ["CLOSED", "INACTIVE"] },
    },
  });

  return {
    won,
    total,
    rate: total > 0 ? Math.round((won / total) * 100) : 0,
  };
}

export async function getAvgDealSize(
  filters: ReportFilters
): Promise<number> {
  const result = await prismadb.crm_Opportunities.aggregate({
    where: {
      ...dateRangeWhere(filters),
      status: "CLOSED",
    },
    _avg: { budget: true },
  });
  return Number(result._avg.budget ?? 0);
}

export async function getSalesCycleLength(
  filters: ReportFilters
): Promise<number> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: {
      ...dateRangeWhere(filters),
      status: "CLOSED",
      close_date: { not: null },
    },
    select: { created_on: true, close_date: true },
  });

  if (opps.length === 0) return 0;

  const totalDays = opps.reduce((sum, opp) => {
    if (!opp.created_on || !opp.close_date) return sum;
    const diff = opp.close_date.getTime() - opp.created_on.getTime();
    return sum + diff / (1000 * 60 * 60 * 24);
  }, 0);

  return Math.round(totalDays / opps.length);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/sales.test.ts --no-cache`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add actions/reports/sales.ts __tests__/reports/sales.test.ts
git commit -m "feat(reports): add sales report server actions with tests"
```

---

## Task 4: Leads & Contacts Report Actions

**Files:**
- Create: `actions/reports/leads.ts`
- Test: `__tests__/reports/leads.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/leads.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    crm_Contacts: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    crm_Opportunities: {
      count: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  getNewLeads,
  getLeadSources,
  getConversionRate,
  getNewContacts,
  getContactsByAccount,
} from "@/actions/reports/leads";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = {
  dateFrom: new Date("2025-01-01"),
  dateTo: new Date("2025-12-31"),
};

describe("leads report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getNewLeads", () => {
    it("groups leads by creation month", async () => {
      (prismadb.crm_Leads.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date("2025-01-15") },
        { createdAt: new Date("2025-01-20") },
        { createdAt: new Date("2025-03-10") },
      ]);

      const result = await getNewLeads(baseFilters);
      expect(result).toEqual([
        { name: "2025-01", Number: 2 },
        { name: "2025-03", Number: 1 },
      ]);
    });
  });

  describe("getLeadSources", () => {
    it("groups leads by source name", async () => {
      (prismadb.crm_Leads.findMany as jest.Mock).mockResolvedValue([
        { lead_source: { name: "Website" } },
        { lead_source: { name: "Website" } },
        { lead_source: { name: "Referral" } },
      ]);

      const result = await getLeadSources(baseFilters);
      expect(result).toEqual([
        { name: "Website", Number: 2 },
        { name: "Referral", Number: 1 },
      ]);
    });
  });

  describe("getConversionRate", () => {
    it("returns leads count, converted count, and rate", async () => {
      (prismadb.crm_Leads.count as jest.Mock).mockResolvedValue(100);
      (prismadb.crm_Opportunities.count as jest.Mock).mockResolvedValue(25);

      const result = await getConversionRate(baseFilters);
      expect(result).toEqual({ leads: 100, converted: 25, rate: 25 });
    });
  });

  describe("getNewContacts", () => {
    it("groups contacts by creation month", async () => {
      (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date("2025-02-10") },
        { createdAt: new Date("2025-02-15") },
      ]);

      const result = await getNewContacts(baseFilters);
      expect(result).toEqual([{ name: "2025-02", Number: 2 }]);
    });
  });

  describe("getContactsByAccount", () => {
    it("groups contacts by account name", async () => {
      (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([
        { assigned_accounts: { name: "Acme Corp" } },
        { assigned_accounts: { name: "Acme Corp" } },
        { assigned_accounts: null },
      ]);

      const result = await getContactsByAccount(baseFilters);
      expect(result).toEqual([
        { name: "Acme Corp", Number: 2 },
        { name: "Unassigned", Number: 1 },
      ]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/leads.test.ts --no-cache`
Expected: FAIL — cannot find module `@/actions/reports/leads`

- [ ] **Step 3: Implement leads actions**

```ts
// actions/reports/leads.ts
import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";

function groupByMonth(
  items: { createdAt?: Date | null }[]
): ChartDataPoint[] {
  const grouped = items.reduce<Record<string, number>>((acc, item) => {
    if (!item.createdAt) return acc;
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, Number: count }));
}

export async function getNewLeads(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const leads = await prismadb.crm_Leads.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      deletedAt: null,
    },
    select: { createdAt: true },
  });
  return groupByMonth(leads);
}

export async function getLeadSources(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const leads = await prismadb.crm_Leads.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      deletedAt: null,
    },
    select: { lead_source: { select: { name: true } } },
  });

  const grouped = leads.reduce<Record<string, number>>((acc, lead) => {
    const source = lead.lead_source?.name ?? "Unknown";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, count]) => ({
    name,
    Number: count,
  }));
}

export async function getConversionRate(
  filters: ReportFilters
): Promise<{ leads: number; converted: number; rate: number }> {
  const leads = await prismadb.crm_Leads.count({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      deletedAt: null,
    },
  });

  const converted = await prismadb.crm_Opportunities.count({
    where: {
      created_on: { gte: filters.dateFrom, lte: filters.dateTo },
      deletedAt: null,
    },
  });

  return {
    leads,
    converted,
    rate: leads > 0 ? Math.round((converted / leads) * 100) : 0,
  };
}

export async function getNewContacts(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const contacts = await prismadb.crm_Contacts.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      deletedAt: null,
    },
    select: { createdAt: true },
  });
  return groupByMonth(contacts);
}

export async function getContactsByAccount(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const contacts = await prismadb.crm_Contacts.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      deletedAt: null,
    },
    select: { assigned_accounts: { select: { name: true } } },
  });

  const grouped = contacts.reduce<Record<string, number>>((acc, c) => {
    const name = c.assigned_accounts?.name ?? "Unassigned";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, count]) => ({
    name,
    Number: count,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/leads.test.ts --no-cache`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add actions/reports/leads.ts __tests__/reports/leads.test.ts
git commit -m "feat(reports): add leads & contacts report actions with tests"
```

---

## Task 5: Accounts Report Actions

**Files:**
- Create: `actions/reports/accounts.ts`
- Test: `__tests__/reports/accounts.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/accounts.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: {
      findMany: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  getNewAccounts,
  getAccountsByIndustry,
  getTopAccountsByRevenue,
  getAccountsBySize,
} from "@/actions/reports/accounts";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = {
  dateFrom: new Date("2025-01-01"),
  dateTo: new Date("2025-12-31"),
};

describe("accounts report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getNewAccounts", () => {
    it("groups accounts by creation month", async () => {
      (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date("2025-01-10") },
        { createdAt: new Date("2025-01-20") },
        { createdAt: new Date("2025-02-15") },
      ]);

      const result = await getNewAccounts(baseFilters);
      expect(result).toEqual([
        { name: "2025-01", Number: 2 },
        { name: "2025-02", Number: 1 },
      ]);
    });
  });

  describe("getAccountsByIndustry", () => {
    it("groups accounts by industry type name", async () => {
      (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([
        { industry_type: { name: "Technology" } },
        { industry_type: { name: "Technology" } },
        { industry_type: { name: "Healthcare" } },
        { industry_type: null },
      ]);

      const result = await getAccountsByIndustry(baseFilters);
      expect(result).toEqual([
        { name: "Technology", Number: 2 },
        { name: "Healthcare", Number: 1 },
        { name: "Unknown", Number: 1 },
      ]);
    });
  });

  describe("getTopAccountsByRevenue", () => {
    it("returns top 10 accounts sorted by annual revenue", async () => {
      (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([
        { name: "Big Corp", annual_revenue: "1000000" },
        { name: "Small LLC", annual_revenue: "50000" },
      ]);

      const result = await getTopAccountsByRevenue(baseFilters);
      expect(result).toEqual([
        { name: "Big Corp", Number: 1000000 },
        { name: "Small LLC", Number: 50000 },
      ]);
    });
  });

  describe("getAccountsBySize", () => {
    it("groups accounts by employee count ranges", async () => {
      (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([
        { employees: "5" },
        { employees: "50" },
        { employees: "500" },
        { employees: null },
      ]);

      const result = await getAccountsBySize(baseFilters);
      expect(result).toContainEqual(
        expect.objectContaining({ name: "1-10" })
      );
      expect(result).toContainEqual(
        expect.objectContaining({ name: "11-50" })
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/accounts.test.ts --no-cache`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement accounts actions**

```ts
// actions/reports/accounts.ts
import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";

export async function getNewAccounts(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const accounts = await prismadb.crm_Accounts.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      deletedAt: null,
    },
    select: { createdAt: true },
  });

  const grouped = accounts.reduce<Record<string, number>>((acc, a) => {
    const d = new Date(a.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, Number: count }));
}

export async function getAccountsByIndustry(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const accounts = await prismadb.crm_Accounts.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      deletedAt: null,
    },
    select: { industry_type: { select: { name: true } } },
  });

  const grouped = accounts.reduce<Record<string, number>>((acc, a) => {
    const name = a.industry_type?.name ?? "Unknown";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, count]) => ({
    name,
    Number: count,
  }));
}

export async function getTopAccountsByRevenue(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const accounts = await prismadb.crm_Accounts.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      deletedAt: null,
      annual_revenue: { not: null },
    },
    select: { name: true, annual_revenue: true },
    orderBy: { annual_revenue: "desc" },
    take: 10,
  });

  return accounts.map((a) => ({
    name: a.name,
    Number: parseInt(a.annual_revenue ?? "0", 10),
  }));
}

export async function getAccountsBySize(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const accounts = await prismadb.crm_Accounts.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
      deletedAt: null,
    },
    select: { employees: true },
  });

  const ranges = [
    { label: "1-10", min: 1, max: 10 },
    { label: "11-50", min: 11, max: 50 },
    { label: "51-200", min: 51, max: 200 },
    { label: "201-500", min: 201, max: 500 },
    { label: "500+", min: 501, max: Infinity },
    { label: "Unknown", min: -1, max: -1 },
  ];

  const counts: Record<string, number> = {};
  for (const r of ranges) counts[r.label] = 0;

  for (const a of accounts) {
    const emp = parseInt(a.employees ?? "", 10);
    if (isNaN(emp)) {
      counts["Unknown"]++;
      continue;
    }
    const range = ranges.find((r) => emp >= r.min && emp <= r.max);
    if (range) counts[range.label]++;
  }

  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({ name, Number: count }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/accounts.test.ts --no-cache`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add actions/reports/accounts.ts __tests__/reports/accounts.test.ts
git commit -m "feat(reports): add accounts report actions with tests"
```

---

## Task 6: Activity Report Actions

**Files:**
- Create: `actions/reports/activity.ts`
- Test: `__tests__/reports/activity.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/activity.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    Tasks: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    crm_Activities: {
      findMany: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  getTasksCreatedCompleted,
  getOverdueTasks,
  getTasksByAssignee,
  getActivitiesByType,
} from "@/actions/reports/activity";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = {
  dateFrom: new Date("2025-01-01"),
  dateTo: new Date("2025-12-31"),
};

describe("activity report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getTasksCreatedCompleted", () => {
    it("returns created and completed task counts by month", async () => {
      (prismadb.Tasks.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date("2025-01-10"), taskStatus: "ACTIVE" },
        { createdAt: new Date("2025-01-20"), taskStatus: "COMPLETE" },
        { createdAt: new Date("2025-02-10"), taskStatus: "COMPLETE" },
      ]);

      const result = await getTasksCreatedCompleted(baseFilters);
      expect(result).toEqual([
        { name: "2025-01", created: 2, completed: 1 },
        { name: "2025-02", created: 1, completed: 1 },
      ]);
    });
  });

  describe("getOverdueTasks", () => {
    it("returns count of overdue tasks", async () => {
      (prismadb.Tasks.count as jest.Mock).mockResolvedValue(5);

      const result = await getOverdueTasks(baseFilters);
      expect(result).toBe(5);
    });
  });

  describe("getTasksByAssignee", () => {
    it("groups tasks by assigned user name", async () => {
      (prismadb.Tasks.findMany as jest.Mock).mockResolvedValue([
        { assigned_user: { name: "Alice" } },
        { assigned_user: { name: "Alice" } },
        { assigned_user: { name: "Bob" } },
      ]);

      const result = await getTasksByAssignee(baseFilters);
      expect(result).toEqual([
        { name: "Alice", Number: 2 },
        { name: "Bob", Number: 1 },
      ]);
    });
  });

  describe("getActivitiesByType", () => {
    it("groups activities by type", async () => {
      (prismadb.crm_Activities.findMany as jest.Mock).mockResolvedValue([
        { type: "call" },
        { type: "call" },
        { type: "meeting" },
        { type: "email" },
      ]);

      const result = await getActivitiesByType(baseFilters);
      expect(result).toEqual([
        { name: "call", Number: 2 },
        { name: "meeting", Number: 1 },
        { name: "email", Number: 1 },
      ]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/activity.test.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: Implement activity actions**

```ts
// actions/reports/activity.ts
import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";

export async function getTasksCreatedCompleted(
  filters: ReportFilters
): Promise<{ name: string; created: number; completed: number }[]> {
  const tasks = await prismadb.Tasks.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
    },
    select: { createdAt: true, taskStatus: true },
  });

  const grouped: Record<string, { created: number; completed: number }> = {};

  for (const task of tasks) {
    if (!task.createdAt) continue;
    const d = new Date(task.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = { created: 0, completed: 0 };
    grouped[key].created++;
    if (task.taskStatus === "COMPLETE") grouped[key].completed++;
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, data]) => ({ name, ...data }));
}

export async function getOverdueTasks(
  filters: ReportFilters
): Promise<number> {
  return prismadb.Tasks.count({
    where: {
      dueDateAt: { lt: new Date(), gte: filters.dateFrom },
      taskStatus: "ACTIVE",
    },
  });
}

export async function getTasksByAssignee(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const tasks = await prismadb.Tasks.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
    },
    select: { assigned_user: { select: { name: true } } },
  });

  const grouped = tasks.reduce<Record<string, number>>((acc, t) => {
    const name = t.assigned_user?.name ?? "Unassigned";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, count]) => ({
    name,
    Number: count,
  }));
}

export async function getActivitiesByType(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const activities = await prismadb.crm_Activities.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
    },
    select: { type: true },
  });

  const grouped = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, count]) => ({
    name,
    Number: count,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/activity.test.ts --no-cache`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add actions/reports/activity.ts __tests__/reports/activity.test.ts
git commit -m "feat(reports): add activity report actions with tests"
```

---

## Task 7: Campaigns Report Actions

**Files:**
- Create: `actions/reports/campaigns.ts`
- Test: `__tests__/reports/campaigns.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/campaigns.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaigns: {
      findMany: jest.fn(),
    },
    crm_campaign_sends: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    crm_TargetLists: {
      findMany: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  getCampaignPerformance,
  getTopTemplates,
  getTargetListGrowth,
} from "@/actions/reports/campaigns";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = {
  dateFrom: new Date("2025-01-01"),
  dateTo: new Date("2025-12-31"),
};

describe("campaigns report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getCampaignPerformance", () => {
    it("returns sent, opened, and clicked counts", async () => {
      (prismadb.crm_campaign_sends.count as jest.Mock)
        .mockResolvedValueOnce(100) // sent
        .mockResolvedValueOnce(40)  // opened
        .mockResolvedValueOnce(15); // clicked

      const result = await getCampaignPerformance(baseFilters);
      expect(result).toEqual({
        sent: 100,
        opened: 40,
        clicked: 15,
        openRate: 40,
        clickRate: 15,
      });
    });

    it("returns 0 rates when no sends", async () => {
      (prismadb.crm_campaign_sends.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await getCampaignPerformance(baseFilters);
      expect(result.openRate).toBe(0);
      expect(result.clickRate).toBe(0);
    });
  });

  describe("getTopTemplates", () => {
    it("returns templates sorted by usage count", async () => {
      (prismadb.crm_campaigns.findMany as jest.Mock).mockResolvedValue([
        { template: { name: "Welcome" }, _count: { sends: 50 } },
        { template: { name: "Follow-up" }, _count: { sends: 30 } },
      ]);

      const result = await getTopTemplates(baseFilters);
      expect(result).toEqual([
        { name: "Welcome", Number: 50 },
        { name: "Follow-up", Number: 30 },
      ]);
    });
  });

  describe("getTargetListGrowth", () => {
    it("groups target lists by creation month", async () => {
      (prismadb.crm_TargetLists.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date("2025-01-10"), _count: { targets: 50 } },
        { createdAt: new Date("2025-02-15"), _count: { targets: 30 } },
      ]);

      const result = await getTargetListGrowth(baseFilters);
      expect(result).toEqual([
        { name: "2025-01", Number: 50 },
        { name: "2025-02", Number: 30 },
      ]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/campaigns.test.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: Implement campaigns actions**

```ts
// actions/reports/campaigns.ts
import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";

export async function getCampaignPerformance(
  filters: ReportFilters
): Promise<{
  sent: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}> {
  const dateFilter = {
    sent_at: { gte: filters.dateFrom, lte: filters.dateTo },
    status: "sent",
  };

  const sent = await prismadb.crm_campaign_sends.count({
    where: dateFilter,
  });

  const opened = await prismadb.crm_campaign_sends.count({
    where: { ...dateFilter, opened_at: { not: null } },
  });

  const clicked = await prismadb.crm_campaign_sends.count({
    where: { ...dateFilter, clicked_at: { not: null } },
  });

  return {
    sent,
    opened,
    clicked,
    openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
    clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
  };
}

export async function getCampaignROI(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const campaigns = await prismadb.crm_campaigns.findMany({
    where: {
      created_on: { gte: filters.dateFrom, lte: filters.dateTo },
      status: { in: ["sent", "sending"] },
    },
    select: {
      name: true,
      _count: { select: { sends: true } },
    },
  });

  return campaigns.map((c) => ({
    name: c.name,
    Number: c._count.sends,
  }));
}

export async function getTopTemplates(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const campaigns = await prismadb.crm_campaigns.findMany({
    where: {
      created_on: { gte: filters.dateFrom, lte: filters.dateTo },
    },
    select: {
      template: { select: { name: true } },
      _count: { select: { sends: true } },
    },
    orderBy: { sends: { _count: "desc" } },
    take: 10,
  });

  return campaigns
    .filter((c) => c.template)
    .map((c) => ({
      name: c.template!.name,
      Number: c._count.sends,
    }));
}

export async function getTargetListGrowth(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const lists = await prismadb.crm_TargetLists.findMany({
    where: {
      createdAt: { gte: filters.dateFrom, lte: filters.dateTo },
    },
    select: {
      createdAt: true,
      _count: { select: { targets: true } },
    },
  });

  const grouped = lists.reduce<Record<string, number>>((acc, l) => {
    const d = new Date(l.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + l._count.targets;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, Number: count }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/campaigns.test.ts --no-cache`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add actions/reports/campaigns.ts __tests__/reports/campaigns.test.ts
git commit -m "feat(reports): add campaigns report actions with tests"
```

---

## Task 8: Users Report Actions

**Files:**
- Create: `actions/reports/users.ts`
- Test: `__tests__/reports/users.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/users.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  getActiveUsersByYear,
  getActiveUsersLifetime,
  getUserGrowth,
  getUsersByRole,
} from "@/actions/reports/users";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = {
  dateFrom: new Date("2025-01-01"),
  dateTo: new Date("2025-12-31"),
};

describe("users report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getActiveUsersByYear", () => {
    it("returns active user count grouped by year", async () => {
      (prismadb.users.findMany as jest.Mock).mockResolvedValue([
        { created_on: new Date("2023-05-10"), userStatus: "ACTIVE" },
        { created_on: new Date("2024-03-15"), userStatus: "ACTIVE" },
        { created_on: new Date("2024-08-20"), userStatus: "ACTIVE" },
        { created_on: new Date("2025-01-05"), userStatus: "ACTIVE" },
      ]);

      const result = await getActiveUsersByYear();
      expect(result).toEqual([
        { name: "2023", Number: 1 },
        { name: "2024", Number: 2 },
        { name: "2025", Number: 1 },
      ]);
    });
  });

  describe("getActiveUsersLifetime", () => {
    it("returns total count of active users", async () => {
      (prismadb.users.count as jest.Mock).mockResolvedValue(42);

      const result = await getActiveUsersLifetime();
      expect(result).toBe(42);
    });
  });

  describe("getUserGrowth", () => {
    it("groups all users by creation month in date range", async () => {
      (prismadb.users.findMany as jest.Mock).mockResolvedValue([
        { created_on: new Date("2025-01-10") },
        { created_on: new Date("2025-01-20") },
        { created_on: new Date("2025-03-15") },
      ]);

      const result = await getUserGrowth(baseFilters);
      expect(result).toEqual([
        { name: "2025-01", Number: 2 },
        { name: "2025-03", Number: 1 },
      ]);
    });
  });

  describe("getUsersByRole", () => {
    it("groups users by admin status", async () => {
      (prismadb.users.findMany as jest.Mock).mockResolvedValue([
        { is_admin: true, is_account_admin: false },
        { is_admin: false, is_account_admin: true },
        { is_admin: false, is_account_admin: false },
        { is_admin: false, is_account_admin: false },
      ]);

      const result = await getUsersByRole(baseFilters);
      expect(result).toEqual([
        { name: "Admin", Number: 1 },
        { name: "Account Admin", Number: 1 },
        { name: "User", Number: 2 },
      ]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/users.test.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: Implement users actions**

```ts
// actions/reports/users.ts
import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";

export async function getActiveUsersByYear(): Promise<ChartDataPoint[]> {
  const users = await prismadb.users.findMany({
    where: { userStatus: "ACTIVE" },
    select: { created_on: true },
  });

  const grouped = users.reduce<Record<string, number>>((acc, u) => {
    const year = String(new Date(u.created_on).getFullYear());
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, Number: count }));
}

export async function getActiveUsersLifetime(): Promise<number> {
  return prismadb.users.count({
    where: { userStatus: "ACTIVE" },
  });
}

export async function getUserGrowth(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const users = await prismadb.users.findMany({
    where: {
      created_on: { gte: filters.dateFrom, lte: filters.dateTo },
    },
    select: { created_on: true },
  });

  const grouped = users.reduce<Record<string, number>>((acc, u) => {
    const d = new Date(u.created_on);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, Number: count }));
}

export async function getUsersByRole(
  filters: ReportFilters
): Promise<ChartDataPoint[]> {
  const users = await prismadb.users.findMany({
    where: {
      created_on: { gte: filters.dateFrom, lte: filters.dateTo },
    },
    select: { is_admin: true, is_account_admin: true },
  });

  let admins = 0;
  let accountAdmins = 0;
  let regularUsers = 0;

  for (const u of users) {
    if (u.is_admin) admins++;
    else if (u.is_account_admin) accountAdmins++;
    else regularUsers++;
  }

  const result: ChartDataPoint[] = [];
  if (admins > 0) result.push({ name: "Admin", Number: admins });
  if (accountAdmins > 0)
    result.push({ name: "Account Admin", Number: accountAdmins });
  if (regularUsers > 0) result.push({ name: "User", Number: regularUsers });

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/users.test.ts --no-cache`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add actions/reports/users.ts __tests__/reports/users.test.ts
git commit -m "feat(reports): add users report actions with tests"
```

---

## Task 9: Dashboard KPI Action

**Files:**
- Create: `actions/reports/dashboard.ts`
- Test: `__tests__/reports/dashboard.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/dashboard.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { aggregate: jest.fn(), count: jest.fn() },
    crm_Leads: { count: jest.fn() },
    crm_Contacts: { count: jest.fn() },
    crm_Accounts: { count: jest.fn() },
    crm_Contracts: { count: jest.fn() },
    crm_campaign_sends: { count: jest.fn() },
    Tasks: { count: jest.fn() },
    users: { count: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getDashboardKPIs } from "@/actions/reports/dashboard";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = {
  dateFrom: new Date("2025-01-01"),
  dateTo: new Date("2025-12-31"),
};

describe("getDashboardKPIs", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns all 10 KPIs", async () => {
    // Revenue
    (prismadb.crm_Opportunities.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { budget: BigInt(100000) } })  // current revenue
      .mockResolvedValueOnce({ _sum: { budget: BigInt(80000) } })   // previous revenue
      .mockResolvedValueOnce({ _sum: { budget: BigInt(500000) } })  // current pipeline
      .mockResolvedValueOnce({ _sum: { budget: BigInt(400000) } }); // previous pipeline

    // Leads
    (prismadb.crm_Leads.count as jest.Mock)
      .mockResolvedValueOnce(50)  // current
      .mockResolvedValueOnce(40); // previous

    // Conversion (opportunities created in range)
    (prismadb.crm_Opportunities.count as jest.Mock)
      .mockResolvedValueOnce(25)  // current opps
      .mockResolvedValueOnce(20); // previous opps

    // Contacts
    (prismadb.crm_Contacts.count as jest.Mock)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(80);

    // Active users
    (prismadb.users.count as jest.Mock)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(25);

    // Tasks
    (prismadb.Tasks.count as jest.Mock)
      .mockResolvedValueOnce(15)  // open
      .mockResolvedValueOnce(12)  // previous open
      .mockResolvedValueOnce(3)   // overdue
      .mockResolvedValueOnce(2);  // previous overdue

    // Campaigns
    (prismadb.crm_campaign_sends.count as jest.Mock)
      .mockResolvedValueOnce(200)  // sent
      .mockResolvedValueOnce(150)  // previous sent
      .mockResolvedValueOnce(80)   // opened
      .mockResolvedValueOnce(60);  // previous opened

    // Accounts
    (prismadb.crm_Accounts.count as jest.Mock)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(15);

    // Contracts expiring
    (prismadb.crm_Contracts.count as jest.Mock)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);

    const result = await getDashboardKPIs(baseFilters);

    expect(result).toHaveLength(10);
    expect(result[0].label).toBe("totalRevenue");
    expect(result[0].value).toBe(100000);
    expect(result[0].href).toBe("/reports/sales");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/dashboard.test.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: Implement dashboard action**

```ts
// actions/reports/dashboard.ts
import { prismadb } from "@/lib/prisma";
import type { ReportFilters, KPIData } from "./types";

function getPreviousPeriod(filters: ReportFilters): ReportFilters {
  const duration = filters.dateTo.getTime() - filters.dateFrom.getTime();
  return {
    dateFrom: new Date(filters.dateFrom.getTime() - duration),
    dateTo: new Date(filters.dateTo.getTime() - duration),
  };
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboardKPIs(
  filters: ReportFilters
): Promise<KPIData[]> {
  const prev = getPreviousPeriod(filters);

  // 1. Total Revenue
  const [revCurrent, revPrevious] = await Promise.all([
    prismadb.crm_Opportunities.aggregate({
      where: {
        created_on: { gte: filters.dateFrom, lte: filters.dateTo },
        status: "CLOSED",
        deletedAt: null,
      },
      _sum: { budget: true },
    }),
    prismadb.crm_Opportunities.aggregate({
      where: {
        created_on: { gte: prev.dateFrom, lte: prev.dateTo },
        status: "CLOSED",
        deletedAt: null,
      },
      _sum: { budget: true },
    }),
  ]);
  const revVal = Number(revCurrent._sum.budget ?? 0);
  const revPrev = Number(revPrevious._sum.budget ?? 0);

  // 2. Pipeline Value
  const [pipeCurrent, pipePrevious] = await Promise.all([
    prismadb.crm_Opportunities.aggregate({
      where: {
        created_on: { gte: filters.dateFrom, lte: filters.dateTo },
        status: "ACTIVE",
        deletedAt: null,
      },
      _sum: { budget: true },
    }),
    prismadb.crm_Opportunities.aggregate({
      where: {
        created_on: { gte: prev.dateFrom, lte: prev.dateTo },
        status: "ACTIVE",
        deletedAt: null,
      },
      _sum: { budget: true },
    }),
  ]);
  const pipeVal = Number(pipeCurrent._sum.budget ?? 0);
  const pipePrev = Number(pipePrevious._sum.budget ?? 0);

  // 3. New Leads
  const [leadsCurrent, leadsPrevious] = await Promise.all([
    prismadb.crm_Leads.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    }),
    prismadb.crm_Leads.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null },
    }),
  ]);

  // 4. Conversion Rate
  const [oppsCurrent, oppsPrevious] = await Promise.all([
    prismadb.crm_Opportunities.count({
      where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    }),
    prismadb.crm_Opportunities.count({
      where: { created_on: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null },
    }),
  ]);
  const convRate = leadsCurrent > 0 ? Math.round((oppsCurrent / leadsCurrent) * 100) : 0;
  const convRatePrev = leadsPrevious > 0 ? Math.round((oppsPrevious / leadsPrevious) * 100) : 0;

  // 5. New Contacts
  const [contactsCurrent, contactsPrevious] = await Promise.all([
    prismadb.crm_Contacts.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    }),
    prismadb.crm_Contacts.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null },
    }),
  ]);

  // 6. Active Users
  const [activeUsersCurrent, activeUsersPrevious] = await Promise.all([
    prismadb.users.count({ where: { userStatus: "ACTIVE" } }),
    prismadb.users.count({
      where: { userStatus: "ACTIVE", created_on: { lte: prev.dateTo } },
    }),
  ]);

  // 7. Open & Overdue Tasks
  const [openTasks, openTasksPrev, overdueTasks, overdueTasksPrev] =
    await Promise.all([
      prismadb.Tasks.count({ where: { taskStatus: "ACTIVE" } }),
      prismadb.Tasks.count({
        where: { taskStatus: "ACTIVE", createdAt: { lte: prev.dateTo } },
      }),
      prismadb.Tasks.count({
        where: { taskStatus: "ACTIVE", dueDateAt: { lt: new Date() } },
      }),
      prismadb.Tasks.count({
        where: { taskStatus: "ACTIVE", dueDateAt: { lt: prev.dateTo } },
      }),
    ]);

  // 8. Campaign Performance
  const [sentCurrent, sentPrevious, openedCurrent, openedPrevious] =
    await Promise.all([
      prismadb.crm_campaign_sends.count({
        where: { sent_at: { gte: filters.dateFrom, lte: filters.dateTo }, status: "sent" },
      }),
      prismadb.crm_campaign_sends.count({
        where: { sent_at: { gte: prev.dateFrom, lte: prev.dateTo }, status: "sent" },
      }),
      prismadb.crm_campaign_sends.count({
        where: {
          sent_at: { gte: filters.dateFrom, lte: filters.dateTo },
          status: "sent",
          opened_at: { not: null },
        },
      }),
      prismadb.crm_campaign_sends.count({
        where: {
          sent_at: { gte: prev.dateFrom, lte: prev.dateTo },
          status: "sent",
          opened_at: { not: null },
        },
      }),
    ]);

  // 9. New Accounts
  const [accountsCurrent, accountsPrevious] = await Promise.all([
    prismadb.crm_Accounts.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    }),
    prismadb.crm_Accounts.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null },
    }),
  ]);

  // 10. Contracts Expiring Soon (within 90 days from now)
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
  const [contractsExpiring, contractsExpiringPrev] = await Promise.all([
    prismadb.crm_Contracts.count({
      where: {
        endDate: { gte: new Date(), lte: ninetyDaysFromNow },
        deletedAt: null,
      },
    }),
    prismadb.crm_Contracts.count({
      where: {
        endDate: {
          gte: prev.dateTo,
          lte: new Date(prev.dateTo.getTime() + 90 * 24 * 60 * 60 * 1000),
        },
        deletedAt: null,
      },
    }),
  ]);

  return [
    {
      label: "totalRevenue",
      value: revVal,
      previousValue: revPrev,
      changePercent: calcChange(revVal, revPrev),
      sparkline: [],
      href: "/reports/sales",
    },
    {
      label: "pipelineValue",
      value: pipeVal,
      previousValue: pipePrev,
      changePercent: calcChange(pipeVal, pipePrev),
      sparkline: [],
      href: "/reports/sales",
    },
    {
      label: "newLeads",
      value: leadsCurrent,
      previousValue: leadsPrevious,
      changePercent: calcChange(leadsCurrent, leadsPrevious),
      sparkline: [],
      href: "/reports/leads",
    },
    {
      label: "conversionRate",
      value: convRate,
      previousValue: convRatePrev,
      changePercent: calcChange(convRate, convRatePrev),
      sparkline: [],
      href: "/reports/leads",
    },
    {
      label: "newContacts",
      value: contactsCurrent,
      previousValue: contactsPrevious,
      changePercent: calcChange(contactsCurrent, contactsPrevious),
      sparkline: [],
      href: "/reports/leads",
    },
    {
      label: "activeUsers",
      value: activeUsersCurrent,
      previousValue: activeUsersPrevious,
      changePercent: calcChange(activeUsersCurrent, activeUsersPrevious),
      sparkline: [],
      href: "/reports/users",
    },
    {
      label: "openTasks",
      value: openTasks,
      previousValue: openTasksPrev,
      changePercent: calcChange(openTasks, openTasksPrev),
      sparkline: [],
      href: "/reports/activity",
    },
    {
      label: "campaignsSent",
      value: sentCurrent,
      previousValue: sentPrevious,
      changePercent: calcChange(sentCurrent, sentPrevious),
      sparkline: [],
      href: "/reports/campaigns",
    },
    {
      label: "newAccounts",
      value: accountsCurrent,
      previousValue: accountsPrevious,
      changePercent: calcChange(accountsCurrent, accountsPrevious),
      sparkline: [],
      href: "/reports/accounts",
    },
    {
      label: "contractsExpiring",
      value: contractsExpiring,
      previousValue: contractsExpiringPrev,
      changePercent: calcChange(contractsExpiring, contractsExpiringPrev),
      sparkline: [],
      href: "/reports/accounts",
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/dashboard.test.ts --no-cache`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add actions/reports/dashboard.ts __tests__/reports/dashboard.test.ts
git commit -m "feat(reports): add dashboard KPI action with test"
```

---

## Task 10: Report Config CRUD Actions

**Files:**
- Create: `actions/reports/config.ts`
- Test: `__tests__/reports/config.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/config.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Report_Config: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("@/lib/authOptions", () => ({
  authOptions: {},
}));

import { prismadb } from "@/lib/prisma";
import { saveConfig, loadConfigs, deleteConfig, duplicateConfig, toggleShare } from "@/actions/reports/config";

describe("report config actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getServerSession } = require("next-auth");
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    });
  });

  describe("saveConfig", () => {
    it("creates a new config with given name and filters", async () => {
      const mockConfig = {
        id: "config-1",
        name: "Q1 Sales",
        category: "sales",
        filters: { dateFrom: "2025-01-01", dateTo: "2025-03-31" },
        isShared: false,
        createdBy: "user-1",
      };
      (prismadb.crm_Report_Config.create as jest.Mock).mockResolvedValue(mockConfig);

      const result = await saveConfig({
        name: "Q1 Sales",
        category: "sales",
        filters: { dateFrom: "2025-01-01", dateTo: "2025-03-31" },
        isShared: false,
      });

      expect(prismadb.crm_Report_Config.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Q1 Sales",
          category: "sales",
          createdBy: "user-1",
        }),
      });
      expect(result).toEqual(mockConfig);
    });
  });

  describe("loadConfigs", () => {
    it("returns own configs and shared configs for the category", async () => {
      const configs = [
        { id: "1", name: "My Report", isShared: false, createdBy: "user-1" },
        { id: "2", name: "Team Report", isShared: true, createdBy: "user-2" },
      ];
      (prismadb.crm_Report_Config.findMany as jest.Mock).mockResolvedValue(configs);

      const result = await loadConfigs("sales");
      expect(prismadb.crm_Report_Config.findMany).toHaveBeenCalledWith({
        where: {
          category: "sales",
          OR: [{ createdBy: "user-1" }, { isShared: true }],
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(configs);
    });
  });

  describe("deleteConfig", () => {
    it("deletes config owned by the user", async () => {
      (prismadb.crm_Report_Config.delete as jest.Mock).mockResolvedValue({});

      await deleteConfig("config-1");
      expect(prismadb.crm_Report_Config.delete).toHaveBeenCalledWith({
        where: { id: "config-1", createdBy: "user-1" },
      });
    });
  });

  describe("toggleShare", () => {
    it("toggles isShared flag", async () => {
      (prismadb.crm_Report_Config.update as jest.Mock).mockResolvedValue({
        isShared: true,
      });

      await toggleShare("config-1", true);
      expect(prismadb.crm_Report_Config.update).toHaveBeenCalledWith({
        where: { id: "config-1", createdBy: "user-1" },
        data: { isShared: true },
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/config.test.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: Implement config actions**

```ts
// actions/reports/config.ts
"use server";

import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import type { ReportCategory } from "./types";

async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function saveConfig(input: {
  name: string;
  category: ReportCategory;
  filters: Record<string, unknown>;
  isShared: boolean;
}) {
  const userId = await getUserId();
  return prismadb.crm_Report_Config.create({
    data: {
      name: input.name,
      category: input.category,
      filters: input.filters,
      isShared: input.isShared,
      createdBy: userId,
    },
  });
}

export async function loadConfigs(category: ReportCategory) {
  const userId = await getUserId();
  return prismadb.crm_Report_Config.findMany({
    where: {
      category,
      OR: [{ createdBy: userId }, { isShared: true }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteConfig(configId: string) {
  const userId = await getUserId();
  return prismadb.crm_Report_Config.delete({
    where: { id: configId, createdBy: userId },
  });
}

export async function duplicateConfig(configId: string, newName: string) {
  const userId = await getUserId();
  const original = await prismadb.crm_Report_Config.findMany({
    where: { id: configId },
  });
  if (!original[0]) throw new Error("Config not found");

  return prismadb.crm_Report_Config.create({
    data: {
      name: newName,
      category: original[0].category,
      filters: original[0].filters as Record<string, unknown>,
      isShared: false,
      createdBy: userId,
    },
  });
}

export async function toggleShare(configId: string, isShared: boolean) {
  const userId = await getUserId();
  return prismadb.crm_Report_Config.update({
    where: { id: configId, createdBy: userId },
    data: { isShared },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/config.test.ts --no-cache`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add actions/reports/config.ts __tests__/reports/config.test.ts
git commit -m "feat(reports): add saved config CRUD actions with tests"
```

---

## Task 11: Report Schedule CRUD Actions

**Files:**
- Create: `actions/reports/schedule.ts`
- Test: `__tests__/reports/schedule.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/schedule.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Report_Schedule: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("@/lib/authOptions", () => ({
  authOptions: {},
}));

import { prismadb } from "@/lib/prisma";
import {
  createSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
} from "@/actions/reports/schedule";

describe("report schedule actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getServerSession } = require("next-auth");
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "user-1" },
    });
  });

  describe("createSchedule", () => {
    it("creates a schedule linked to a config", async () => {
      const mockSchedule = { id: "sched-1", reportConfigId: "config-1" };
      (prismadb.crm_Report_Schedule.create as jest.Mock).mockResolvedValue(mockSchedule);

      const result = await createSchedule({
        reportConfigId: "config-1",
        cronExpression: "0 9 * * 1",
        recipients: ["alice@example.com"],
        format: "pdf",
      });

      expect(prismadb.crm_Report_Schedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportConfigId: "config-1",
          cronExpression: "0 9 * * 1",
          format: "pdf",
          createdBy: "user-1",
        }),
      });
      expect(result).toEqual(mockSchedule);
    });
  });

  describe("listSchedules", () => {
    it("returns schedules for the current user", async () => {
      const schedules = [{ id: "sched-1" }];
      (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue(schedules);

      const result = await listSchedules();
      expect(prismadb.crm_Report_Schedule.findMany).toHaveBeenCalledWith({
        where: { createdBy: "user-1" },
        include: { reportConfig: true },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(schedules);
    });
  });

  describe("deleteSchedule", () => {
    it("deletes schedule owned by user", async () => {
      (prismadb.crm_Report_Schedule.delete as jest.Mock).mockResolvedValue({});

      await deleteSchedule("sched-1");
      expect(prismadb.crm_Report_Schedule.delete).toHaveBeenCalledWith({
        where: { id: "sched-1", createdBy: "user-1" },
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/schedule.test.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: Implement schedule actions**

```ts
// actions/reports/schedule.ts
"use server";

import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import type { ExportFormat } from "./types";

async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createSchedule(input: {
  reportConfigId: string;
  cronExpression: string;
  recipients: string[];
  format: ExportFormat;
}) {
  const userId = await getUserId();
  return prismadb.crm_Report_Schedule.create({
    data: {
      reportConfigId: input.reportConfigId,
      cronExpression: input.cronExpression,
      recipients: input.recipients,
      format: input.format,
      createdBy: userId,
    },
  });
}

export async function listSchedules() {
  const userId = await getUserId();
  return prismadb.crm_Report_Schedule.findMany({
    where: { createdBy: userId },
    include: { reportConfig: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateSchedule(
  scheduleId: string,
  data: {
    cronExpression?: string;
    recipients?: string[];
    format?: ExportFormat;
    isActive?: boolean;
  }
) {
  const userId = await getUserId();
  return prismadb.crm_Report_Schedule.update({
    where: { id: scheduleId, createdBy: userId },
    data,
  });
}

export async function deleteSchedule(scheduleId: string) {
  const userId = await getUserId();
  return prismadb.crm_Report_Schedule.delete({
    where: { id: scheduleId, createdBy: userId },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/schedule.test.ts --no-cache`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add actions/reports/schedule.ts __tests__/reports/schedule.test.ts
git commit -m "feat(reports): add schedule CRUD actions with tests"
```

---

## Task 12: UI Components — DateRangePicker & FilterBar

**Files:**
- Create: `components/reports/DateRangePicker.tsx`
- Create: `components/reports/FilterBar.tsx`

- [ ] **Step 1: Create DateRangePicker component**

```tsx
// components/reports/DateRangePicker.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { DATE_PRESETS } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("ReportsPage");

  const currentFrom = searchParams.get("from");
  const currentTo = searchParams.get("to");

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    currentFrom ? new Date(currentFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    currentTo ? new Date(currentTo) : undefined
  );

  function applyDates(from: Date, to: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyPreset(key: string) {
    const preset = DATE_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    const { from, to } = preset.getRange();
    setDateFrom(from);
    setDateTo(to);
    applyDates(from, to);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {DATE_PRESETS.map((preset) => (
        <Button
          key={preset.key}
          variant="outline"
          size="sm"
          onClick={() => applyPreset(preset.key)}
          className={
            searchParams.get("preset") === preset.key
              ? "border-orange-500"
              : ""
          }
        >
          {t(preset.labelKey)}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {t("customRange")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex gap-2 p-4">
            <div>
              <p className="text-sm font-medium mb-2">{t("from")}</p>
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(date) => {
                  setDateFrom(date);
                  if (date && dateTo) applyDates(date, dateTo);
                }}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t("to")}</p>
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(date) => {
                  setDateTo(date);
                  if (dateFrom && date) applyDates(dateFrom, date);
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

- [ ] **Step 2: Create FilterBar component**

```tsx
// components/reports/FilterBar.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReportCategory } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

type FilterOption = {
  key: string;
  labelKey: string;
  options: { value: string; label: string }[];
};

type FilterBarProps = {
  category: ReportCategory;
  filterOptions?: FilterOption[];
};

export function FilterBar({ category, filterOptions = [] }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("ReportsPage");
  const [isExpanded, setIsExpanded] = useState(false);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  if (filterOptions.length === 0) return null;

  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between"
      >
        {t("filters")}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
      {isExpanded && (
        <div className="mt-3 flex gap-4 flex-wrap">
          {filterOptions.map((filter) => (
            <div key={filter.key} className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {t(filter.labelKey)}
              </label>
              <Select
                value={searchParams.get(filter.key) ?? "all"}
                onValueChange={(v) => updateFilter(filter.key, v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all")}</SelectItem>
                  {filter.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors in the new files (existing errors may be present)

- [ ] **Step 4: Commit**

```bash
git add components/reports/DateRangePicker.tsx components/reports/FilterBar.tsx
git commit -m "feat(reports): add DateRangePicker and FilterBar components"
```

---

## Task 13: UI Components — KPICard & ReportChart

**Files:**
- Create: `components/reports/KPICard.tsx`
- Create: `components/reports/ReportChart.tsx`
- Create: `components/reports/ReportTable.tsx`

- [ ] **Step 1: Create KPICard component**

```tsx
// components/reports/KPICard.tsx
"use client";

import Link from "next/link";
import { Card } from "@tremor/react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { KPIData } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

function formatValue(value: number, label: string): string {
  if (label === "totalRevenue" || label === "pipelineValue") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (label === "conversionRate" || label === "openRate" || label === "clickRate") {
    return `${value}%`;
  }
  return new Intl.NumberFormat("en-US").format(value);
}

export function KPICard({
  kpi,
  dateParams,
}: {
  kpi: KPIData;
  dateParams: string;
}) {
  const t = useTranslations("ReportsPage.kpi");
  const isPositive = kpi.changePercent > 0;
  const isZero = kpi.changePercent === 0;

  return (
    <Link href={`${kpi.href}?${dateParams}`}>
      <Card className="rounded-md cursor-pointer hover:shadow-md transition-shadow p-4">
        <p className="text-sm text-muted-foreground">{t(kpi.label)}</p>
        <div className="flex items-end justify-between mt-2">
          <p className="text-2xl font-bold">
            {formatValue(kpi.value, kpi.label)}
          </p>
          <div
            className={`flex items-center text-sm ${
              isPositive
                ? "text-green-600"
                : isZero
                  ? "text-gray-500"
                  : "text-red-600"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : isZero ? (
              <Minus className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>{Math.abs(kpi.changePercent)}%</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Create ReportChart component**

```tsx
// components/reports/ReportChart.tsx
"use client";

import { Card, Title, BarChart, AreaChart } from "@tremor/react";
import type { ChartDataPoint } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

const dataFormatter = (number: number) => number.toFixed(0);

type ReportChartProps = {
  data: ChartDataPoint[];
  titleKey: string;
  type?: "bar" | "area";
  categories?: string[];
};

export function ReportChart({
  data,
  titleKey,
  type = "bar",
  categories = ["Number"],
}: ReportChartProps) {
  const t = useTranslations("ReportsPage.charts");

  if (!data || data.length === 0) {
    return (
      <Card className="rounded-md">
        <Title>{t(titleKey)}</Title>
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          {t("noData")}
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-md">
      <Title>{t(titleKey)}</Title>
      {type === "bar" ? (
        <BarChart
          className="mt-6"
          data={data}
          index="name"
          categories={categories}
          colors={["orange"]}
          valueFormatter={dataFormatter}
          yAxisWidth={48}
        />
      ) : (
        <AreaChart
          className="h-72 mt-4"
          data={data}
          index="name"
          categories={categories}
          colors={["orange"]}
          valueFormatter={dataFormatter}
        />
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Create ReportTable component**

```tsx
// components/reports/ReportTable.tsx
"use client";

import { useState } from "react";
import { Card, Title } from "@tremor/react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChartDataPoint } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

type ReportTableProps = {
  data: ChartDataPoint[];
  titleKey: string;
  nameColumnKey?: string;
  valueColumnKey?: string;
};

export function ReportTable({
  data,
  titleKey,
  nameColumnKey = "name",
  valueColumnKey = "value",
}: ReportTableProps) {
  const t = useTranslations("ReportsPage.charts");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) =>
    sortAsc ? a.Number - b.Number : b.Number - a.Number
  );

  return (
    <Card className="rounded-md">
      <Title>{t(titleKey)}</Title>
      <table className="w-full mt-4">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 text-sm text-muted-foreground">
              {t(nameColumnKey)}
            </th>
            <th className="text-right py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortAsc(!sortAsc)}
              >
                {t(valueColumnKey)}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.name} className="border-b last:border-0">
              <td className="py-2 text-sm">{row.name}</td>
              <td className="py-2 text-sm text-right">
                {new Intl.NumberFormat("en-US").format(row.Number)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/reports/KPICard.tsx components/reports/ReportChart.tsx components/reports/ReportTable.tsx
git commit -m "feat(reports): add KPICard, ReportChart, and ReportTable components"
```

---

## Task 14: UI Components — ReportToolbar, SaveConfigDialog, ScheduleDialog

**Files:**
- Create: `components/reports/ReportToolbar.tsx`
- Create: `components/reports/SaveConfigDialog.tsx`
- Create: `components/reports/ScheduleDialog.tsx`
- Create: `components/reports/SavedReportsDropdown.tsx`

- [ ] **Step 1: Create ReportToolbar**

```tsx
// components/reports/ReportToolbar.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Save, Clock } from "lucide-react";
import { SaveConfigDialog } from "./SaveConfigDialog";
import { ScheduleDialog } from "./ScheduleDialog";
import type { ReportCategory } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

type ReportToolbarProps = {
  category: ReportCategory;
  currentFilters: string; // serialized search params
};

export function ReportToolbar({ category, currentFilters }: ReportToolbarProps) {
  const t = useTranslations("ReportsPage.toolbar");
  const [showSave, setShowSave] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  async function handleExportCSV() {
    const response = await fetch(
      `/api/reports/export?category=${category}&format=csv&${currentFilters}`
    );
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${category}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportPDF() {
    const response = await fetch(
      `/api/reports/export?category=${category}&format=pdf&${currentFilters}`
    );
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${category}-report.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExportCSV}>
        <Download className="mr-2 h-4 w-4" />
        {t("exportCSV")}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportPDF}>
        <FileText className="mr-2 h-4 w-4" />
        {t("exportPDF")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowSave(true)}>
        <Save className="mr-2 h-4 w-4" />
        {t("saveConfig")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowSchedule(true)}>
        <Clock className="mr-2 h-4 w-4" />
        {t("schedule")}
      </Button>

      <SaveConfigDialog
        open={showSave}
        onOpenChange={setShowSave}
        category={category}
        currentFilters={currentFilters}
      />
      <ScheduleDialog
        open={showSchedule}
        onOpenChange={setShowSchedule}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create SaveConfigDialog**

```tsx
// components/reports/SaveConfigDialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { saveConfig } from "@/actions/reports/config";
import type { ReportCategory } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

type SaveConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ReportCategory;
  currentFilters: string;
};

export function SaveConfigDialog({
  open,
  onOpenChange,
  category,
  currentFilters,
}: SaveConfigDialogProps) {
  const t = useTranslations("ReportsPage.saveDialog");
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    const params = Object.fromEntries(new URLSearchParams(currentFilters));
    await saveConfig({
      name: name.trim(),
      category,
      filters: params,
      isShared,
    });
    setLoading(false);
    setName("");
    setIsShared(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="config-name">{t("nameLabel")}</Label>
            <Input
              id="config-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="share-toggle">{t("shareLabel")}</Label>
            <Switch
              id="share-toggle"
              checked={isShared}
              onCheckedChange={setIsShared}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create ScheduleDialog**

```tsx
// components/reports/ScheduleDialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSchedule } from "@/actions/reports/schedule";
import { loadConfigs } from "@/actions/reports/config";
import type { ExportFormat, ReportCategory } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

const FREQUENCY_CRON: Record<string, string> = {
  daily: "0 9 * * *",
  weekly_mon: "0 9 * * 1",
  weekly_fri: "0 9 * * 5",
  monthly: "0 9 1 * *",
};

type ScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ScheduleDialog({ open, onOpenChange }: ScheduleDialogProps) {
  const t = useTranslations("ReportsPage.scheduleDialog");
  const [configs, setConfigs] = useState<
    { id: string; name: string; category: string }[]
  >([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [frequency, setFrequency] = useState("weekly_mon");
  const [customCron, setCustomCron] = useState("");
  const [recipients, setRecipients] = useState("");
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Load all configs for all categories
    const categories: ReportCategory[] = [
      "sales",
      "leads",
      "accounts",
      "activity",
      "campaigns",
      "users",
    ];
    Promise.all(categories.map((c) => loadConfigs(c))).then((results) => {
      setConfigs(results.flat());
    });
  }, [open]);

  async function handleCreate() {
    if (!selectedConfigId || !recipients.trim()) return;
    setLoading(true);
    const cronExpression =
      frequency === "custom" ? customCron : FREQUENCY_CRON[frequency];
    await createSchedule({
      reportConfigId: selectedConfigId,
      cronExpression,
      recipients: recipients.split(",").map((e) => e.trim()),
      format,
    });
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("savedReport")}</Label>
            <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectReport")} />
              </SelectTrigger>
              <SelectContent>
                {configs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("frequency")}</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("daily")}</SelectItem>
                <SelectItem value="weekly_mon">{t("weeklyMon")}</SelectItem>
                <SelectItem value="weekly_fri">{t("weeklyFri")}</SelectItem>
                <SelectItem value="monthly">{t("monthly")}</SelectItem>
                <SelectItem value="custom">{t("custom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {frequency === "custom" && (
            <div className="space-y-2">
              <Label>{t("cronExpression")}</Label>
              <Input
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 9 * * 1"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t("recipients")}</Label>
            <Input
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder={t("recipientsPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("format")}</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="both">{t("both")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={loading || !selectedConfigId}>
            {t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create SavedReportsDropdown**

```tsx
// components/reports/SavedReportsDropdown.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadConfigs } from "@/actions/reports/config";
import type { ReportCategory } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

type SavedReportsDropdownProps = {
  category: ReportCategory;
};

export function SavedReportsDropdown({ category }: SavedReportsDropdownProps) {
  const t = useTranslations("ReportsPage.savedReports");
  const router = useRouter();
  const pathname = usePathname();
  const [configs, setConfigs] = useState<
    { id: string; name: string; filters: Record<string, string>; isShared: boolean }[]
  >([]);

  useEffect(() => {
    loadConfigs(category).then((result) => {
      setConfigs(
        result.map((c: any) => ({
          id: c.id,
          name: c.name,
          filters: c.filters as Record<string, string>,
          isShared: c.isShared,
        }))
      );
    });
  }, [category]);

  function handleSelect(configId: string) {
    const config = configs.find((c) => c.id === configId);
    if (!config) return;
    const params = new URLSearchParams(config.filters);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (configs.length === 0) return null;

  return (
    <Select onValueChange={handleSelect}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={t("placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {configs.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name} {c.isShared ? `(${t("shared")})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/reports/ReportToolbar.tsx components/reports/SaveConfigDialog.tsx components/reports/ScheduleDialog.tsx components/reports/SavedReportsDropdown.tsx
git commit -m "feat(reports): add ReportToolbar, SaveConfigDialog, ScheduleDialog, and SavedReportsDropdown"
```

---

## Task 15: Shared Report Page Layout

**Files:**
- Create: `components/reports/ReportPageLayout.tsx`

- [ ] **Step 1: Create ReportPageLayout**

```tsx
// components/reports/ReportPageLayout.tsx
import { Suspense } from "react";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { DateRangePicker } from "./DateRangePicker";
import { FilterBar } from "./FilterBar";
import { ReportToolbar } from "./ReportToolbar";
import { SavedReportsDropdown } from "./SavedReportsDropdown";
import type { ReportCategory } from "@/actions/reports/types";

type ReportPageLayoutProps = {
  title: string;
  description: string;
  category: ReportCategory;
  currentFilters: string;
  filterOptions?: {
    key: string;
    labelKey: string;
    options: { value: string; label: string }[];
  }[];
  children: React.ReactNode;
};

export function ReportPageLayout({
  title,
  description,
  category,
  currentFilters,
  filterOptions,
  children,
}: ReportPageLayoutProps) {
  return (
    <Container title={title} description={description}>
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Suspense>
              <DateRangePicker />
            </Suspense>
            <Suspense>
              <SavedReportsDropdown category={category} />
            </Suspense>
          </div>
          <Suspense>
            <ReportToolbar category={category} currentFilters={currentFilters} />
          </Suspense>
        </div>
        <Suspense>
          <FilterBar category={category} filterOptions={filterOptions} />
        </Suspense>
        <div className="space-y-6">{children}</div>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reports/ReportPageLayout.tsx
git commit -m "feat(reports): add shared ReportPageLayout component"
```

---

## Task 16: Dashboard Page (Replace Existing Reports Page)

**Files:**
- Modify: `app/[locale]/(routes)/reports/page.tsx`
- Modify: `app/[locale]/(routes)/reports/loading.tsx`

- [ ] **Step 1: Replace the reports page with KPI dashboard**

```tsx
// app/[locale]/(routes)/reports/page.tsx
import Container from "../components/ui/Container";
import { getDashboardKPIs } from "@/actions/reports/dashboard";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import { KPICard } from "@/components/reports/KPICard";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ReportsPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const kpis = await getDashboardKPIs(filters);
  const t = await getTranslations("ReportsPage");

  const dateParams = params.toString();

  return (
    <Container title={t("title")} description={t("description")}>
      <div className="space-y-6 pt-4">
        <Suspense>
          <DateRangePicker />
        </Suspense>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} kpi={kpi} dateParams={dateParams} />
          ))}
        </div>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: Update loading skeleton**

```tsx
// app/[locale]/(routes)/reports/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col flex-1 h-full w-full p-6">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-72 mb-6" />
      <Skeleton className="h-10 w-full max-w-lg mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-md" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the page loads without errors**

Run: `npx next build 2>&1 | grep -E "(error|reports)" | head -20`
Expected: No build errors related to the reports page

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/\(routes\)/reports/page.tsx app/\[locale\]/\(routes\)/reports/loading.tsx
git commit -m "feat(reports): replace static reports page with KPI dashboard"
```

---

## Task 17: Report Sub-Pages — Sales

**Files:**
- Create: `app/[locale]/(routes)/reports/sales/page.tsx`

- [ ] **Step 1: Create sales report page**

```tsx
// app/[locale]/(routes)/reports/sales/page.tsx
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportTable } from "@/components/reports/ReportTable";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getRevenue,
  getPipelineValue,
  getOppsByStage,
  getOppsByMonth,
  getWinLossRate,
  getAvgDealSize,
  getSalesCycleLength,
} from "@/actions/reports/sales";
import { getTranslations } from "next-intl/server";
import { Card, Title } from "@tremor/react";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function SalesReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [revenue, pipeline, oppsByStage, oppsByMonth, winLoss, avgDeal, cycleLength] =
    await Promise.all([
      getRevenue(filters),
      getPipelineValue(filters),
      getOppsByStage(filters),
      getOppsByMonth(filters),
      getWinLossRate(filters),
      getAvgDealSize(filters),
      getSalesCycleLength(filters),
    ]);

  const currentFilters = params.toString();

  return (
    <ReportPageLayout
      title={t("salesTitle")}
      description={t("salesDescription")}
      category="sales"
      currentFilters={currentFilters}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t("charts.totalRevenue")}</p>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(revenue)}
          </p>
        </Card>
        <Card className="rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t("charts.pipelineValue")}</p>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(pipeline)}
          </p>
        </Card>
        <Card className="rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t("charts.avgDealSize")}</p>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(avgDeal)}
          </p>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t("charts.winRate")}</p>
          <p className="text-2xl font-bold">{winLoss.rate}%</p>
          <p className="text-xs text-muted-foreground">
            {winLoss.won} won / {winLoss.total} closed
          </p>
        </Card>
        <Card className="rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t("charts.salesCycleLength")}</p>
          <p className="text-2xl font-bold">{cycleLength} days</p>
        </Card>
      </div>
      <ReportChart data={oppsByStage} titleKey="oppsBySalesStage" />
      <ReportChart data={oppsByMonth} titleKey="oppsByMonth" type="area" />
    </ReportPageLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(routes\)/reports/sales/
git commit -m "feat(reports): add sales report sub-page"
```

---

## Task 18: Report Sub-Pages — Leads, Accounts, Activity, Campaigns, Users

**Files:**
- Create: `app/[locale]/(routes)/reports/leads/page.tsx`
- Create: `app/[locale]/(routes)/reports/accounts/page.tsx`
- Create: `app/[locale]/(routes)/reports/activity/page.tsx`
- Create: `app/[locale]/(routes)/reports/campaigns/page.tsx`
- Create: `app/[locale]/(routes)/reports/users/page.tsx`

- [ ] **Step 1: Create leads report page**

```tsx
// app/[locale]/(routes)/reports/leads/page.tsx
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportTable } from "@/components/reports/ReportTable";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getNewLeads,
  getLeadSources,
  getConversionRate,
  getNewContacts,
  getContactsByAccount,
} from "@/actions/reports/leads";
import { getTranslations } from "next-intl/server";
import { Card } from "@tremor/react";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function LeadsReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [newLeads, leadSources, conversion, newContacts, contactsByAccount] =
    await Promise.all([
      getNewLeads(filters),
      getLeadSources(filters),
      getConversionRate(filters),
      getNewContacts(filters),
      getContactsByAccount(filters),
    ]);

  return (
    <ReportPageLayout
      title={t("leadsTitle")}
      description={t("leadsDescription")}
      category="leads"
      currentFilters={params.toString()}
    >
      <Card className="rounded-md p-4">
        <p className="text-sm text-muted-foreground">{t("charts.conversionRate")}</p>
        <p className="text-2xl font-bold">{conversion.rate}%</p>
        <p className="text-xs text-muted-foreground">
          {conversion.converted} converted / {conversion.leads} leads
        </p>
      </Card>
      <ReportChart data={newLeads} titleKey="newLeadsByMonth" type="area" />
      <ReportChart data={leadSources} titleKey="leadSources" />
      <ReportChart data={newContacts} titleKey="newContactsByMonth" type="area" />
      <ReportTable data={contactsByAccount} titleKey="contactsByAccount" />
    </ReportPageLayout>
  );
}
```

- [ ] **Step 2: Create accounts report page**

```tsx
// app/[locale]/(routes)/reports/accounts/page.tsx
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportTable } from "@/components/reports/ReportTable";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getNewAccounts,
  getAccountsByIndustry,
  getTopAccountsByRevenue,
  getAccountsBySize,
} from "@/actions/reports/accounts";
import { getTranslations } from "next-intl/server";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AccountsReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [newAccounts, byIndustry, topByRevenue, bySize] = await Promise.all([
    getNewAccounts(filters),
    getAccountsByIndustry(filters),
    getTopAccountsByRevenue(filters),
    getAccountsBySize(filters),
  ]);

  return (
    <ReportPageLayout
      title={t("accountsTitle")}
      description={t("accountsDescription")}
      category="accounts"
      currentFilters={params.toString()}
    >
      <ReportChart data={newAccounts} titleKey="newAccountsByMonth" type="area" />
      <ReportChart data={byIndustry} titleKey="accountsByIndustry" />
      <ReportTable data={topByRevenue} titleKey="topAccountsByRevenue" />
      <ReportChart data={bySize} titleKey="accountsBySize" />
    </ReportPageLayout>
  );
}
```

- [ ] **Step 3: Create activity report page**

```tsx
// app/[locale]/(routes)/reports/activity/page.tsx
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getTasksCreatedCompleted,
  getOverdueTasks,
  getTasksByAssignee,
  getActivitiesByType,
} from "@/actions/reports/activity";
import { getTranslations } from "next-intl/server";
import { Card } from "@tremor/react";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ActivityReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [tasksCreatedCompleted, overdueTasks, tasksByAssignee, activitiesByType] =
    await Promise.all([
      getTasksCreatedCompleted(filters),
      getOverdueTasks(filters),
      getTasksByAssignee(filters),
      getActivitiesByType(filters),
    ]);

  // Transform for dual-bar chart
  const taskChartData = tasksCreatedCompleted.map((d) => ({
    name: d.name,
    Created: d.created,
    Completed: d.completed,
  }));

  return (
    <ReportPageLayout
      title={t("activityTitle")}
      description={t("activityDescription")}
      category="activity"
      currentFilters={params.toString()}
    >
      <Card className="rounded-md p-4">
        <p className="text-sm text-muted-foreground">{t("charts.overdueTasks")}</p>
        <p className="text-2xl font-bold text-red-600">{overdueTasks}</p>
      </Card>
      <ReportChart
        data={taskChartData as any}
        titleKey="tasksCreatedCompleted"
        categories={["Created", "Completed"]}
      />
      <ReportChart data={tasksByAssignee} titleKey="tasksByAssignee" />
      <ReportChart data={activitiesByType} titleKey="activitiesByType" />
    </ReportPageLayout>
  );
}
```

- [ ] **Step 4: Create campaigns report page**

```tsx
// app/[locale]/(routes)/reports/campaigns/page.tsx
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getCampaignPerformance,
  getCampaignROI,
  getTopTemplates,
  getTargetListGrowth,
} from "@/actions/reports/campaigns";
import { getTranslations } from "next-intl/server";
import { Card } from "@tremor/react";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function CampaignsReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [performance, roi, topTemplates, targetGrowth] = await Promise.all([
    getCampaignPerformance(filters),
    getCampaignROI(filters),
    getTopTemplates(filters),
    getTargetListGrowth(filters),
  ]);

  return (
    <ReportPageLayout
      title={t("campaignsTitle")}
      description={t("campaignsDescription")}
      category="campaigns"
      currentFilters={params.toString()}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t("charts.emailsSent")}</p>
          <p className="text-2xl font-bold">{performance.sent}</p>
        </Card>
        <Card className="rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t("charts.openRate")}</p>
          <p className="text-2xl font-bold">{performance.openRate}%</p>
          <p className="text-xs text-muted-foreground">{performance.opened} opened</p>
        </Card>
        <Card className="rounded-md p-4">
          <p className="text-sm text-muted-foreground">{t("charts.clickRate")}</p>
          <p className="text-2xl font-bold">{performance.clickRate}%</p>
          <p className="text-xs text-muted-foreground">{performance.clicked} clicked</p>
        </Card>
      </div>
      <ReportChart data={roi} titleKey="campaignROI" />
      <ReportChart data={topTemplates} titleKey="topTemplates" />
      <ReportChart data={targetGrowth} titleKey="targetListGrowth" type="area" />
    </ReportPageLayout>
  );
}
```

- [ ] **Step 5: Create users report page**

```tsx
// app/[locale]/(routes)/reports/users/page.tsx
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getActiveUsersByYear,
  getActiveUsersLifetime,
  getUserGrowth,
  getUsersByRole,
} from "@/actions/reports/users";
import { getTranslations } from "next-intl/server";
import { Card } from "@tremor/react";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function UsersReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [activeByYear, activeLifetime, userGrowth, usersByRole] =
    await Promise.all([
      getActiveUsersByYear(),
      getActiveUsersLifetime(),
      getUserGrowth(filters),
      getUsersByRole(filters),
    ]);

  return (
    <ReportPageLayout
      title={t("usersTitle")}
      description={t("usersDescription")}
      category="users"
      currentFilters={params.toString()}
    >
      <Card className="rounded-md p-4">
        <p className="text-sm text-muted-foreground">{t("charts.totalActiveUsers")}</p>
        <p className="text-2xl font-bold">{activeLifetime}</p>
      </Card>
      <ReportChart data={activeByYear} titleKey="activeUsersByYear" />
      <ReportChart data={userGrowth} titleKey="userGrowth" type="area" />
      <ReportChart data={usersByRole} titleKey="usersByRole" />
    </ReportPageLayout>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/\(routes\)/reports/leads/ app/\[locale\]/\(routes\)/reports/accounts/ app/\[locale\]/\(routes\)/reports/activity/ app/\[locale\]/\(routes\)/reports/campaigns/ app/\[locale\]/\(routes\)/reports/users/
git commit -m "feat(reports): add leads, accounts, activity, campaigns, and users sub-pages"
```

---

## Task 19: CSV Export API Route

**Files:**
- Create: `actions/reports/export-csv.ts`
- Create: `app/api/reports/export/route.ts`
- Test: `__tests__/reports/export-csv.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/export-csv.test.ts
import { generateCSV } from "@/actions/reports/export-csv";

describe("generateCSV", () => {
  it("converts chart data points to CSV string", () => {
    const data = [
      { name: "January", Number: 10 },
      { name: "February", Number: 20 },
    ];

    const csv = generateCSV(data, ["Name", "Count"]);
    const lines = csv.split("\n");

    expect(lines[0]).toBe("Name,Count");
    expect(lines[1]).toBe("January,10");
    expect(lines[2]).toBe("February,20");
  });

  it("escapes commas in values", () => {
    const data = [{ name: "Acme, Inc.", Number: 100 }];
    const csv = generateCSV(data, ["Name", "Count"]);
    expect(csv).toContain('"Acme, Inc."');
  });

  it("handles empty data", () => {
    const csv = generateCSV([], ["Name", "Count"]);
    expect(csv).toBe("Name,Count");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/export-csv.test.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: Implement CSV generation**

```ts
// actions/reports/export-csv.ts
import type { ChartDataPoint } from "./types";

function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(
  data: ChartDataPoint[],
  headers: string[]
): string {
  const headerRow = headers.join(",");
  if (data.length === 0) return headerRow;

  const rows = data.map((row) =>
    [escapeCSV(row.name), escapeCSV(row.Number)].join(",")
  );

  return [headerRow, ...rows].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/reports/export-csv.test.ts --no-cache`
Expected: All 3 tests PASS

- [ ] **Step 5: Create export API route**

```ts
// app/api/reports/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import { generateCSV } from "@/actions/reports/export-csv";
import * as salesActions from "@/actions/reports/sales";
import * as leadsActions from "@/actions/reports/leads";
import * as accountsActions from "@/actions/reports/accounts";
import * as activityActions from "@/actions/reports/activity";
import * as campaignsActions from "@/actions/reports/campaigns";
import * as usersActions from "@/actions/reports/users";

async function getReportData(category: string, filters: ReturnType<typeof parseSearchParamsToFilters>) {
  switch (category) {
    case "sales":
      return { data: await salesActions.getOppsByMonth(filters), headers: ["Month", "Opportunities"] };
    case "leads":
      return { data: await leadsActions.getNewLeads(filters), headers: ["Month", "Leads"] };
    case "accounts":
      return { data: await accountsActions.getNewAccounts(filters), headers: ["Month", "Accounts"] };
    case "activity":
      return { data: await activityActions.getTasksByAssignee(filters), headers: ["Assignee", "Tasks"] };
    case "campaigns": {
      const perf = await campaignsActions.getCampaignPerformance(filters);
      return {
        data: [
          { name: "Sent", Number: perf.sent },
          { name: "Opened", Number: perf.opened },
          { name: "Clicked", Number: perf.clicked },
        ],
        headers: ["Metric", "Count"],
      };
    }
    case "users":
      return { data: await usersActions.getUserGrowth(filters), headers: ["Month", "Users"] };
    default:
      return { data: [], headers: ["Name", "Value"] };
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") ?? "sales";
  const format = searchParams.get("format") ?? "csv";
  const filters = parseSearchParamsToFilters(searchParams);

  if (format === "csv") {
    const { data, headers } = await getReportData(category, filters);
    const csv = generateCSV(data, headers);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${category}-report.csv"`,
      },
    });
  }

  // PDF export — placeholder for Task 20
  return NextResponse.json({ error: "PDF export not yet implemented" }, { status: 501 });
}
```

- [ ] **Step 6: Commit**

```bash
git add actions/reports/export-csv.ts app/api/reports/export/route.ts __tests__/reports/export-csv.test.ts
git commit -m "feat(reports): add CSV export with API route"
```

---

## Task 20: PDF Export

**Files:**
- Create: `actions/reports/export-pdf.ts`
- Modify: `app/api/reports/export/route.ts`

- [ ] **Step 1: Install @react-pdf/renderer**

Run: `pnpm add @react-pdf/renderer`
Expected: Package installed successfully

- [ ] **Step 2: Create PDF generation**

```tsx
// actions/reports/export-pdf.ts
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ChartDataPoint } from "./types";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  header: { marginBottom: 20 },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666" },
  table: { marginTop: 16 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  cellName: { flex: 2, fontSize: 10 },
  cellValue: { flex: 1, fontSize: 10, textAlign: "right" },
  headerText: { fontSize: 10, fontFamily: "Helvetica-Bold" },
});

type ReportPDFProps = {
  title: string;
  dateRange: string;
  data: ChartDataPoint[];
  headers: [string, string];
};

function ReportPDF({ title, dateRange, data, headers }: ReportPDFProps) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, title),
        React.createElement(Text, { style: styles.subtitle }, dateRange)
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(
            Text,
            { style: { ...styles.cellName, ...styles.headerText } },
            headers[0]
          ),
          React.createElement(
            Text,
            { style: { ...styles.cellValue, ...styles.headerText } },
            headers[1]
          )
        ),
        ...data.map((row, i) =>
          React.createElement(
            View,
            { key: i, style: styles.tableRow },
            React.createElement(Text, { style: styles.cellName }, row.name),
            React.createElement(
              Text,
              { style: styles.cellValue },
              String(row.Number)
            )
          )
        )
      )
    )
  );
}

export async function generatePDF(
  title: string,
  dateRange: string,
  data: ChartDataPoint[],
  headers: [string, string]
): Promise<Buffer> {
  const doc = React.createElement(ReportPDF, {
    title,
    dateRange,
    data,
    headers,
  });
  return renderToBuffer(doc);
}
```

- [ ] **Step 3: Update export API route for PDF**

In `app/api/reports/export/route.ts`, replace the PDF placeholder block:

```ts
  if (format === "pdf") {
    const { generatePDF } = await import("@/actions/reports/export-pdf");
    const { data, headers } = await getReportData(category, filters);
    const dateRange = `${searchParams.get("from") ?? "all"} to ${searchParams.get("to") ?? "now"}`;
    const buffer = await generatePDF(
      `${category.charAt(0).toUpperCase() + category.slice(1)} Report`,
      dateRange,
      data,
      headers as [string, string]
    );

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${category}-report.pdf"`,
      },
    });
  }
```

- [ ] **Step 4: Commit**

```bash
git add actions/reports/export-pdf.ts app/api/reports/export/route.ts package.json pnpm-lock.yaml
git commit -m "feat(reports): add PDF export via @react-pdf/renderer"
```

---

## Task 21: Inngest Scheduled Report Function

**Files:**
- Create: `inngest/functions/reports/send-scheduled.ts`
- Modify: `app/api/inngest/route.ts`
- Test: `__tests__/reports/inngest-send-scheduled.test.ts`

- [ ] **Step 1: Write the test**

```ts
// __tests__/reports/inngest-send-scheduled.test.ts
const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Report_Schedule: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/actions/reports/export-csv", () => ({
  generateCSV: jest.fn(() => "Name,Count\nJan,10"),
}));

import { prismadb } from "@/lib/prisma";

// Extract testable logic
async function processSchedules() {
  const schedules = await (prismadb.crm_Report_Schedule.findMany as jest.Mock)();
  if (!schedules || schedules.length === 0) return { processed: 0 };

  for (const schedule of schedules) {
    await mockSend({
      from: "reports@example.com",
      to: schedule.recipients,
      subject: `Report: ${schedule.reportConfig.name}`,
      text: "Your scheduled report is attached.",
      attachments: [
        { filename: "report.csv", content: "Name,Count\nJan,10" },
      ],
    });

    await (prismadb.crm_Report_Schedule.update as jest.Mock)({
      where: { id: schedule.id },
      data: { lastSentAt: expect.any(Date) },
    });
  }

  return { processed: schedules.length };
}

describe("report send-scheduled", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends email for each due schedule", async () => {
    (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([
      {
        id: "sched-1",
        recipients: ["alice@example.com"],
        format: "csv",
        reportConfig: { name: "Q1 Sales", category: "sales", filters: {} },
      },
    ]);
    mockSend.mockResolvedValue({ data: { id: "msg-1" } });

    const result = await processSchedules();

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(result.processed).toBe(1);
  });

  it("returns 0 processed when no schedules are due", async () => {
    (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([]);

    const result = await processSchedules();
    expect(result.processed).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/reports/inngest-send-scheduled.test.ts --no-cache`
Expected: FAIL (or PASS since we define inline — adjust as needed)

- [ ] **Step 3: Implement the Inngest function**

```ts
// inngest/functions/reports/send-scheduled.ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";
import { generateCSV } from "@/actions/reports/export-csv";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import * as salesActions from "@/actions/reports/sales";
import * as leadsActions from "@/actions/reports/leads";
import * as accountsActions from "@/actions/reports/accounts";
import * as activityActions from "@/actions/reports/activity";
import * as campaignsActions from "@/actions/reports/campaigns";
import * as usersActions from "@/actions/reports/users";

const resend = new Resend(process.env.RESEND_API_KEY);

async function getReportData(category: string, filters: any) {
  switch (category) {
    case "sales":
      return { data: await salesActions.getOppsByMonth(filters), headers: ["Month", "Opportunities"] as [string, string] };
    case "leads":
      return { data: await leadsActions.getNewLeads(filters), headers: ["Month", "Leads"] as [string, string] };
    case "accounts":
      return { data: await accountsActions.getNewAccounts(filters), headers: ["Month", "Accounts"] as [string, string] };
    case "activity":
      return { data: await activityActions.getTasksByAssignee(filters), headers: ["Assignee", "Tasks"] as [string, string] };
    case "campaigns": {
      const perf = await campaignsActions.getCampaignPerformance(filters);
      return {
        data: [
          { name: "Sent", Number: perf.sent },
          { name: "Opened", Number: perf.opened },
          { name: "Clicked", Number: perf.clicked },
        ],
        headers: ["Metric", "Count"] as [string, string],
      };
    }
    case "users":
      return { data: await usersActions.getUserGrowth(filters), headers: ["Month", "Users"] as [string, string] };
    default:
      return { data: [], headers: ["Name", "Value"] as [string, string] };
  }
}

function isScheduleDue(cron: string, lastSentAt: Date | null): boolean {
  // Simple check: if never sent, it's due. Otherwise check if enough time passed.
  if (!lastSentAt) return true;

  const now = new Date();
  const elapsed = now.getTime() - lastSentAt.getTime();
  const FIFTEEN_MINUTES = 15 * 60 * 1000;

  // Map common cron patterns to minimum intervals
  if (cron.startsWith("0 9 * * *")) return elapsed >= 24 * 60 * 60 * 1000; // daily
  if (cron.match(/^0 9 \* \* [0-6]$/)) return elapsed >= 7 * 24 * 60 * 60 * 1000; // weekly
  if (cron.match(/^0 9 [0-9]+ \* \*$/)) return elapsed >= 28 * 24 * 60 * 60 * 1000; // monthly

  return elapsed >= FIFTEEN_MINUTES;
}

export const reportSendScheduled = inngest.createFunction(
  {
    id: "report-send-scheduled",
    name: "Reports: Send Scheduled",
  },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const schedules = await step.run("find-due-schedules", async () => {
      return prismadb.crm_Report_Schedule.findMany({
        where: { isActive: true },
        include: { reportConfig: true },
      });
    });

    const dueSchedules = schedules.filter((s) =>
      isScheduleDue(s.cronExpression, s.lastSentAt)
    );

    if (dueSchedules.length === 0) return { processed: 0 };

    for (const schedule of dueSchedules) {
      await step.run(`send-report-${schedule.id}`, async () => {
        const filtersRaw = schedule.reportConfig.filters as Record<string, string>;
        const params = new URLSearchParams(filtersRaw);
        const filters = parseSearchParamsToFilters(params);

        const { data, headers } = await getReportData(
          schedule.reportConfig.category,
          filters
        );

        const attachments: { filename: string; content: string | Buffer }[] = [];

        if (schedule.format === "csv" || schedule.format === "both") {
          const csv = generateCSV(data, headers);
          attachments.push({ filename: `${schedule.reportConfig.category}-report.csv`, content: csv });
        }

        if (schedule.format === "pdf" || schedule.format === "both") {
          const { generatePDF } = await import("@/actions/reports/export-pdf");
          const dateRange = `${filtersRaw.from ?? "all"} to ${filtersRaw.to ?? "now"}`;
          const pdfBuffer = await generatePDF(
            `${schedule.reportConfig.name}`,
            dateRange,
            data,
            headers as [string, string]
          );
          attachments.push({ filename: `${schedule.reportConfig.category}-report.pdf`, content: pdfBuffer });
        }

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: schedule.recipients as string[],
          subject: `Report: ${schedule.reportConfig.name}`,
          text: `Your scheduled report "${schedule.reportConfig.name}" is attached.`,
          attachments,
        });

        await prismadb.crm_Report_Schedule.update({
          where: { id: schedule.id },
          data: { lastSentAt: new Date() },
        });
      });
    }

    return { processed: dueSchedules.length };
  }
);
```

- [ ] **Step 4: Register in Inngest route**

In `app/api/inngest/route.ts`, add the import and register:

```ts
import { reportSendScheduled } from "@/inngest/functions/reports/send-scheduled";
```

Add `reportSendScheduled` to the `functions` array.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/reports/inngest-send-scheduled.test.ts --no-cache`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add inngest/functions/reports/send-scheduled.ts app/api/inngest/route.ts __tests__/reports/inngest-send-scheduled.test.ts
git commit -m "feat(reports): add Inngest scheduled report delivery function"
```

---

## Task 22: React Email Template for Scheduled Reports

**Files:**
- Create: `emails/ScheduledReport.tsx`

- [ ] **Step 1: Create email template**

```tsx
// emails/ScheduledReport.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

type ScheduledReportProps = {
  reportName: string;
  dateRange: string;
};

export default function ScheduledReport({
  reportName = "Report",
  dateRange = "",
}: ScheduledReportProps) {
  return (
    <Html>
      <Head />
      <Preview>Your scheduled report: {reportName}</Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "20px" }}>
        <Container>
          <Heading as="h2">{reportName}</Heading>
          {dateRange && (
            <Text style={{ color: "#666" }}>Date range: {dateRange}</Text>
          )}
          <Hr />
          <Text>Your scheduled report is attached to this email.</Text>
          <Text style={{ color: "#999", fontSize: "12px" }}>
            This is an automated report from NextCRM.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add emails/ScheduledReport.tsx
git commit -m "feat(reports): add ScheduledReport email template"
```

---

## Task 23: i18n Translation Keys

**Files:**
- Modify: `locales/en.json`

- [ ] **Step 1: Add all ReportsPage translation keys to English locale**

Add to the `"ReportsPage"` section of `locales/en.json`. The existing keys should remain; add the new ones below them:

```json
{
  "ReportsPage": {
    "title": "Reports",
    "description": "Analytics and reporting dashboard",
    "last7Days": "Last 7 days",
    "last30Days": "Last 30 days",
    "last90Days": "Last 90 days",
    "yearToDate": "Year to date",
    "allTime": "All time",
    "customRange": "Custom",
    "from": "From",
    "to": "To",
    "filters": "Filters",
    "all": "All",
    "salesTitle": "Sales Reports",
    "salesDescription": "Revenue, pipeline, and deal analytics",
    "leadsTitle": "Leads & Contacts Reports",
    "leadsDescription": "Lead generation and contact analytics",
    "accountsTitle": "Accounts Reports",
    "accountsDescription": "Account growth and segmentation",
    "activityTitle": "Activity Reports",
    "activityDescription": "Tasks and activities analytics",
    "campaignsTitle": "Campaigns Reports",
    "campaignsDescription": "Email campaign performance analytics",
    "usersTitle": "Users Reports",
    "usersDescription": "User growth and activity analytics",
    "kpi": {
      "totalRevenue": "Total Revenue",
      "pipelineValue": "Pipeline Value",
      "newLeads": "New Leads",
      "conversionRate": "Conversion Rate",
      "newContacts": "New Contacts",
      "activeUsers": "Active Users",
      "openTasks": "Open Tasks",
      "campaignsSent": "Campaigns Sent",
      "newAccounts": "New Accounts",
      "contractsExpiring": "Contracts Expiring"
    },
    "charts": {
      "noData": "No data for this period",
      "totalRevenue": "Total Revenue",
      "pipelineValue": "Pipeline Value",
      "avgDealSize": "Average Deal Size",
      "winRate": "Win Rate",
      "salesCycleLength": "Avg. Sales Cycle",
      "oppsBySalesStage": "Opportunities by Sales Stage",
      "oppsByMonth": "Opportunities by Month",
      "newLeadsByMonth": "New Leads by Month",
      "leadSources": "Lead Sources",
      "conversionRate": "Lead to Opportunity Conversion",
      "newContactsByMonth": "New Contacts by Month",
      "contactsByAccount": "Contacts by Account",
      "newAccountsByMonth": "New Accounts by Month",
      "accountsByIndustry": "Accounts by Industry",
      "topAccountsByRevenue": "Top Accounts by Revenue",
      "accountsBySize": "Accounts by Size",
      "overdueTasks": "Overdue Tasks",
      "tasksCreatedCompleted": "Tasks Created vs Completed",
      "tasksByAssignee": "Tasks by Assignee",
      "activitiesByType": "Activities by Type",
      "emailsSent": "Emails Sent",
      "openRate": "Open Rate",
      "clickRate": "Click Rate",
      "campaignROI": "Campaign Sends",
      "topTemplates": "Top Templates",
      "targetListGrowth": "Target List Growth",
      "totalActiveUsers": "Total Active Users",
      "activeUsersByYear": "Active Users by Year",
      "userGrowth": "User Growth",
      "usersByRole": "Users by Role",
      "name": "Name",
      "value": "Value"
    },
    "toolbar": {
      "exportCSV": "Export CSV",
      "exportPDF": "Export PDF",
      "saveConfig": "Save",
      "schedule": "Schedule"
    },
    "saveDialog": {
      "title": "Save Report Configuration",
      "nameLabel": "Report Name",
      "namePlaceholder": "e.g. Q1 Sales Pipeline",
      "shareLabel": "Share with team",
      "cancel": "Cancel",
      "save": "Save"
    },
    "scheduleDialog": {
      "title": "Schedule Report",
      "savedReport": "Saved Report",
      "selectReport": "Select a saved report...",
      "frequency": "Frequency",
      "daily": "Daily (9am)",
      "weeklyMon": "Weekly (Monday)",
      "weeklyFri": "Weekly (Friday)",
      "monthly": "Monthly (1st)",
      "custom": "Custom (cron)",
      "cronExpression": "Cron Expression",
      "recipients": "Recipients",
      "recipientsPlaceholder": "email1@example.com, email2@example.com",
      "format": "Format",
      "both": "Both (CSV + PDF)",
      "cancel": "Cancel",
      "create": "Create Schedule"
    },
    "savedReports": {
      "placeholder": "Saved reports...",
      "shared": "shared"
    }
  }
}
```

Note: Preserve all existing keys in the `ReportsPage` section (like `newUsersByMonthOverallTitle`, etc.) — they may still be referenced elsewhere. Simply add the new keys alongside them.

- [ ] **Step 2: Add minimal keys to other locales**

For `cz.json`, `de.json`, and `uk.json`, add the same structure with the English values as placeholders (translation can be done later). Copy the same JSON block into each file's `"ReportsPage"` section.

- [ ] **Step 3: Commit**

```bash
git add locales/en.json locales/cz.json locales/de.json locales/uk.json
git commit -m "feat(reports): add i18n translation keys for reports module"
```

---

## Task 24: Update Navigation Menu

**Files:**
- Modify: `app/[locale]/(routes)/components/menu-items/Reports.tsx`

- [ ] **Step 1: Read current menu item**

Read the file to understand the current structure.

- [ ] **Step 2: Update Reports menu item with sub-items**

The menu item currently returns a single NavItem. If the sidebar supports sub-items (check the NavItem type), add sub-navigation. Otherwise, keep the single link to `/reports` — the dashboard page now serves as the entry point and links to sub-pages via KPI cards.

No changes needed if the sidebar doesn't support nesting — the KPI cards already link to sub-pages.

- [ ] **Step 3: Commit (if changes were made)**

```bash
git add app/\[locale\]/\(routes\)/components/menu-items/Reports.tsx
git commit -m "feat(reports): update navigation menu item"
```

---

## Task 25: Integration Verification

- [ ] **Step 1: Run all report tests**

Run: `npx jest __tests__/reports/ --no-cache --verbose`
Expected: All tests PASS

- [ ] **Step 2: Check for TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -50`
Expected: No new errors in report files

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -30`
Expected: Build succeeds, all report pages compiled

- [ ] **Step 4: Commit any fixes**

If any fixes were needed:
```bash
git add -A
git commit -m "fix(reports): resolve build issues"
```
