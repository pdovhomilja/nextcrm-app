# Reports Module: Tremor → shadcn/ui Charts Refactor

**Date:** 2026-03-31
**Goal:** Replace `@tremor/react` charting with `shadcn/ui` charts across all report pages for a unified, professional UI with minimal custom code.

---

## 1. Current State

- **Charting library:** `@tremor/react` v3.18.7 (wraps Recharts internally)
- **Custom wrappers:** `components/tremor/BarChart.tsx`, `components/tremor/AreaChart.tsx`
- **Unified component:** `components/reports/ReportChart.tsx` — accepts `type: "bar" | "area"`, renders Tremor charts
- **Data shape:** `ChartDataPoint = { name: string; Number: number }` — used by all charts
- **7 report pages:** Dashboard, Sales, Leads, Accounts, Activity, Campaigns, Users
- **Chart count:** ~17 charts total across all pages
- **Other UI:** KPI cards (already shadcn Card), ReportTable, DateRangePicker, filters — all untouched by this refactor

## 2. Target State

- **Charting library:** `shadcn/ui` chart component (Recharts + `ChartContainer`/`ChartTooltip`/`ChartTooltipContent`/`ChartLegend`)
- **No Tremor dependency** — `@tremor/react` removed from `package.json`
- **Unified component:** New `components/reports/ReportChart.tsx` supporting `"bar" | "area" | "pie"` types
- **Data shape:** `ChartDataPoint` unchanged — works natively with Recharts
- **Theme integration:** Uses shadcn `ChartConfig` for consistent colors tied to CSS variables

## 3. Chart Type Mapping

### Per-page breakdown

#### Sales (`/reports/sales`)
| Chart | Current | New | Rationale |
|-------|---------|-----|-----------|
| Opps by Stage | Tremor Bar | shadcn **Bar** | Categorical comparison |
| Opps by Month | Tremor Area | shadcn **Area** | Time-series trend |

#### Leads (`/reports/leads`)
| Chart | Current | New | Rationale |
|-------|---------|-----|-----------|
| New Leads | Tremor Area | shadcn **Area** | Time-series trend |
| Lead Sources | Tremor Bar | shadcn **Bar** | Categorical comparison |
| New Contacts | Tremor Area | shadcn **Area** | Time-series trend |

#### Accounts (`/reports/accounts`)
| Chart | Current | New | Rationale |
|-------|---------|-----|-----------|
| New Accounts | Tremor Area | shadcn **Area** | Time-series trend |
| By Industry | Tremor Bar | shadcn **Bar** | Categorical comparison |
| By Size | Tremor Bar | shadcn **Bar** | Categorical comparison |

#### Activity (`/reports/activity`)
| Chart | Current | New | Rationale |
|-------|---------|-----|-----------|
| Tasks Created/Completed | Tremor Bar (multi-cat) | shadcn **Bar** (grouped, 2 series) | Side-by-side comparison |
| Tasks by Assignee | Tremor Bar | shadcn **Bar** | Categorical comparison |
| Activities by Type | Tremor Bar | shadcn **Bar** | Categorical comparison |

#### Campaigns (`/reports/campaigns`)
| Chart | Current | New | Rationale |
|-------|---------|-----|-----------|
| Campaign ROI | Tremor Bar | shadcn **Bar** | Categorical comparison |
| Top Templates | Tremor Bar | shadcn **Bar** (horizontal) | Ranked list — horizontal reads better for names |
| Target List Growth | Tremor Area | shadcn **Area** | Time-series trend |

#### Users (`/reports/users`)
| Chart | Current | New | Rationale |
|-------|---------|-----|-----------|
| Active Users by Year | Tremor Bar | shadcn **Bar** | Categorical comparison |
| User Growth | Tremor Area | shadcn **Area** | Time-series trend |
| Users by Role | Tremor Bar | shadcn **Pie** | Only 3 categories (Admin/Account Admin/User) — pie shows proportions clearly |

## 4. Component Architecture

### New `ReportChart` component

```tsx
// components/reports/ReportChart.tsx
interface ReportChartProps {
  data: ChartDataPoint[];
  titleKey: string;           // i18n key
  type?: "bar" | "area" | "pie";
  categories?: string[];      // data keys (default: ["Number"])
  layout?: "vertical" | "horizontal"; // bar orientation (default: "vertical")
}
```

**Internals:**
- Uses shadcn `ChartContainer` with a `ChartConfig` for color theming
- Renders `<BarChart>`, `<AreaChart>`, or `<PieChart>` from Recharts based on `type`
- Includes `<ChartTooltip>` with `<ChartTooltipContent>` for hover interactions
- Includes `<ChartLegend>` when multiple categories are present
- Empty state: shows translated "noData" message (preserves current behavior)
- Responsive: uses `ResponsiveContainer` from Recharts (handled by ChartContainer)

### Color theme via `ChartConfig`

```tsx
const chartConfig = {
  Number: {
    label: "Value",
    color: "var(--chart-1)",
  },
  Created: {
    label: "Created",
    color: "var(--chart-1)",
  },
  Completed: {
    label: "Completed",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;
```

This uses shadcn's built-in CSS variables (`--chart-1` through `--chart-5`) which automatically adapt to light/dark mode.

## 5. Files Changed

### New / Modified
| File | Action |
|------|--------|
| `components/ui/chart.tsx` | **Add** — `npx shadcn@latest add chart` |
| `components/reports/ReportChart.tsx` | **Rewrite** — new implementation using shadcn charts |
| `app/[locale]/(routes)/reports/sales/page.tsx` | **Update** — use new ReportChart props |
| `app/[locale]/(routes)/reports/leads/page.tsx` | **Update** — use new ReportChart props |
| `app/[locale]/(routes)/reports/accounts/page.tsx` | **Update** — use new ReportChart props |
| `app/[locale]/(routes)/reports/activity/page.tsx` | **Update** — multi-category chart config |
| `app/[locale]/(routes)/reports/campaigns/page.tsx` | **Update** — horizontal bar for templates |
| `app/[locale]/(routes)/reports/users/page.tsx` | **Update** — pie chart for roles |

### Deleted
| File | Reason |
|------|--------|
| `components/tremor/BarChart.tsx` | Replaced by shadcn chart |
| `components/tremor/AreaChart.tsx` | Replaced by shadcn chart |
| `@tremor/react` in `package.json` | No longer needed |

### Untouched
- All server actions (`actions/reports/*.ts`) — data shapes unchanged
- `actions/reports/types.ts` — `ChartDataPoint` type unchanged
- Dashboard page (`reports/page.tsx`) — KPI cards only, no charts
- `ReportTable`, `DateRangePicker`, filter components
- Layout components, translations

## 6. Migration Strategy

1. **Install shadcn chart** — adds Recharts (direct dep) + chart primitives
2. **Build new ReportChart** — self-contained, no Tremor imports
3. **Update pages one by one** — each page is independent, can be done in any order
4. **Delete Tremor wrappers** — after all pages migrated
5. **Remove `@tremor/react`** from dependencies
6. **Verify** — visual check + existing Playwright e2e tests pass

## 7. Risk Assessment

- **Low risk:** Data layer completely untouched. Same `ChartDataPoint` shape flows through.
- **Visual changes:** Charts will look slightly different (shadcn styling vs Tremor). This is expected and desired — the goal is a unified shadcn look.
- **Dark mode:** shadcn chart CSS variables handle this automatically via `--chart-N` tokens.
- **Testing:** Existing Playwright e2e tests (`test/reports/`) validate page rendering and should catch regressions.

## 8. Out of Scope

- Dashboard KPI cards (already shadcn)
- ReportTable component
- Data fetching logic / server actions
- Filter components
- Adding new charts or metrics
- Changing data aggregation logic
