# Currency Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-currency support to opportunities and contracts with admin management, ECB auto-update, a header currency switcher, and converted display across dashboard and reports.

**Architecture:** New Prisma models (Currency, ExchangeRate, crm_SystemSettings) store currency config and rates. A shared `lib/currency.ts` provides conversion utilities. Server actions snapshot exchange rates on save. A React context (`CurrencyProvider`) reads a cookie to determine display currency, and the header dropdown lets users switch it. An Inngest cron function fetches ECB rates daily.

**Tech Stack:** Prisma (PostgreSQL), Next.js App Router, React Server Components, shadcn/ui, Inngest, Jest, Playwright

**Spec:** `docs/superpowers/specs/2026-04-04-currency-support-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `prisma/migrations/<timestamp>_add_currency_support/migration.sql` | Schema migration |
| `prisma/seeds/currencies.ts` | Seed EUR, USD, CZK with initial rates |
| `lib/currency.ts` | `convertAmount()`, `formatCurrency()`, `getExchangeRates()`, `getSnapshotRate()` |
| `context/currency-context.tsx` | `CurrencyProvider` + `useCurrency()` hook — reads cookie, provides display currency + rates |
| `components/CurrencySwitcher.tsx` | Header dropdown — sets cookie, updates context |
| `app/[locale]/(routes)/admin/currencies/page.tsx` | Admin currency management page |
| `app/[locale]/(routes)/admin/currencies/_components/CurrencyTable.tsx` | Manage currencies (enable/disable/default) |
| `app/[locale]/(routes)/admin/currencies/_components/ExchangeRatesTable.tsx` | View/edit exchange rates |
| `app/[locale]/(routes)/admin/currencies/_components/ECBToggle.tsx` | Toggle ECB auto-update |
| `app/[locale]/(routes)/admin/currencies/_actions/currencies.ts` | Server actions for currency CRUD |
| `inngest/functions/ecb/sync-exchange-rates.ts` | Daily ECB rate sync |
| `__tests__/lib/currency.test.ts` | Unit tests for conversion logic |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Currency, ExchangeRate, crm_SystemSettings models; modify crm_Opportunities + crm_Contracts |
| `app/[locale]/(routes)/components/Header.tsx` | Add `<CurrencySwitcher />` between Feedback and ThemeToggle |
| `app/[locale]/(routes)/layout.tsx` | Wrap children in `<CurrencyProvider>` |
| `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx` | Add "Currencies" nav item |
| `actions/crm/opportunities/create-opportunity.ts` | Add snapshot_rate lookup on create |
| `actions/crm/opportunities/update-opportunity.ts` | Add snapshot_rate lookup on update |
| `actions/crm/opportunity/get-expected-revenue.ts` | Convert to display currency |
| `actions/reports/sales.ts` | Convert revenue/pipeline/avgDeal to display currency |
| `app/[locale]/(routes)/page.tsx` | Pass display currency to revenue display, use formatCurrency |
| `app/[locale]/(routes)/reports/sales/page.tsx` | Remove hardcoded USD formatter, use display currency |
| `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx` | Currency dropdown from DB |
| `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx` | Currency dropdown from DB |
| `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/BasicView.tsx` | Show currency symbol + converted value |
| `app/[locale]/(routes)/crm/opportunities/table-components/columns.tsx` | Format with currency |
| `app/[locale]/(routes)/crm/contracts/[contractId]/components/BasicView.tsx` | Replace hardcoded USD |
| `app/[locale]/(routes)/crm/contracts/_forms/create-contract.tsx` | Add currency field |
| `app/[locale]/(routes)/crm/contracts/_forms/update-contract.tsx` | Add currency field |
| `actions/crm/contracts/create-new-contract/schema.ts` | Add currency field |
| `actions/crm/contracts/create-new-contract/index.ts` | Add snapshot_rate on create |
| `actions/crm/contracts/update-contract/schema.ts` | Add currency field |
| `actions/crm/contracts/update-contract/index.ts` | Add snapshot_rate on update |
| `app/api/inngest/route.ts` | Register ECB sync function |

---

### Task 1: Prisma Schema — New Models + Field Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enum for exchange rate source**

Add after the `crm_Contracts_Status` enum (around line 508):

```prisma
enum ExchangeRateSource {
  MANUAL
  ECB
}
```

- [ ] **Step 2: Add Currency model**

Add after the new enum:

```prisma
model Currency {
  code      String   @id @db.VarChar(3)
  name      String
  symbol    String   @db.VarChar(5)
  isEnabled Boolean  @default(true)
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ratesFrom    ExchangeRate[]    @relation("rate_from")
  ratesTo      ExchangeRate[]    @relation("rate_to")
  opportunities crm_Opportunities[]
  contracts    crm_Contracts[]
}
```

- [ ] **Step 3: Add ExchangeRate model**

```prisma
model ExchangeRate {
  id            String             @id @default(uuid()) @db.Uuid
  fromCurrency  String             @db.VarChar(3)
  toCurrency    String             @db.VarChar(3)
  rate          Decimal            @db.Decimal(18, 8)
  source        ExchangeRateSource @default(MANUAL)
  effectiveDate DateTime           @default(now())
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  from Currency @relation("rate_from", fields: [fromCurrency], references: [code])
  to   Currency @relation("rate_to", fields: [toCurrency], references: [code])

  @@unique([fromCurrency, toCurrency])
  @@index([fromCurrency])
  @@index([toCurrency])
}
```

- [ ] **Step 4: Add crm_SystemSettings model**

```prisma
model crm_SystemSettings {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 5: Modify crm_Opportunities model**

In the `crm_Opportunities` model (line 194), make these changes:

Change `budget` from:
```prisma
  budget           BigInt                  @default(0)
```
to:
```prisma
  budget           Decimal                 @default(0) @db.Decimal(18, 2)
```

Change `expected_revenue` from:
```prisma
  expected_revenue BigInt                  @default(0)
```
to:
```prisma
  expected_revenue Decimal                 @default(0) @db.Decimal(18, 2)
```

Add new field `snapshot_rate` after `currency`:
```prisma
  snapshot_rate    Decimal?                @db.Decimal(18, 8)
```

Add relation after `assigned_campaings` line:
```prisma
  assigned_currency Currency?              @relation(fields: [currency], references: [code])
```

- [ ] **Step 6: Modify crm_Contracts model**

In the `crm_Contracts` model (line 467), make these changes:

Change `value` from:
```prisma
  value               Int
```
to:
```prisma
  value               Decimal              @db.Decimal(18, 2)
```

Add new fields after `type`:
```prisma
  currency            String?              @db.VarChar(3)
  snapshot_rate       Decimal?             @db.Decimal(18, 8)
```

Add relation after `assigned_to_user`:
```prisma
  assigned_currency Currency? @relation(fields: [currency], references: [code])
```

- [ ] **Step 7: Generate migration**

Run: `pnpm prisma migrate dev --name add_currency_support`

Expected: Migration created successfully, Prisma Client regenerated.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add Currency, ExchangeRate, SystemSettings models and migrate money fields to Decimal"
```

---

### Task 2: Seed Currencies

**Files:**
- Create: `prisma/seeds/currencies.ts`

- [ ] **Step 1: Create the seed script**

```typescript
import { PrismaClient, ExchangeRateSource } from "@prisma/client";

const prisma = new PrismaClient();

const currencies = [
  { code: "EUR", name: "Euro", symbol: "€", isEnabled: true, isDefault: true },
  { code: "USD", name: "US Dollar", symbol: "$", isEnabled: true, isDefault: false },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", isEnabled: true, isDefault: false },
];

const rates = [
  { fromCurrency: "EUR", toCurrency: "USD", rate: 1.084, source: ExchangeRateSource.ECB },
  { fromCurrency: "EUR", toCurrency: "CZK", rate: 25.315, source: ExchangeRateSource.ECB },
  { fromCurrency: "USD", toCurrency: "EUR", rate: 0.92251, source: ExchangeRateSource.ECB },
  { fromCurrency: "USD", toCurrency: "CZK", rate: 23.35, source: ExchangeRateSource.ECB },
  { fromCurrency: "CZK", toCurrency: "EUR", rate: 0.0395, source: ExchangeRateSource.ECB },
  { fromCurrency: "CZK", toCurrency: "USD", rate: 0.04283, source: ExchangeRateSource.ECB },
];

export async function seedCurrencies() {
  console.log("Seeding currencies...");

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: { name: currency.name, symbol: currency.symbol },
      create: currency,
    });
  }

  for (const rate of rates) {
    await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency,
        },
      },
      update: { rate: rate.rate, source: rate.source },
      create: rate,
    });
  }

  await prisma.crm_SystemSettings.upsert({
    where: { key: "ecb_auto_update" },
    update: {},
    create: { key: "ecb_auto_update", value: "false" },
  });

  await prisma.crm_SystemSettings.upsert({
    where: { key: "default_currency" },
    update: {},
    create: { key: "default_currency", value: "EUR" },
  });

  console.log("Currencies seeded.");
}
```

- [ ] **Step 2: Run the seed**

Run: `pnpm exec tsx prisma/seeds/currencies.ts`

If the project's existing seed entry point is `prisma/seeds/seed.ts`, instead add a call to `seedCurrencies()` from there and run: `pnpm prisma db seed`

Expected: "Currencies seeded." output, no errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/seeds/currencies.ts
git commit -m "feat(seed): add currency and exchange rate seed data"
```

---

### Task 3: Currency Conversion Library

**Files:**
- Create: `lib/currency.ts`
- Create: `__tests__/lib/currency.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { convertAmount, formatCurrency, findRate } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/library";

type Rate = { fromCurrency: string; toCurrency: string; rate: Decimal };

const mockRates: Rate[] = [
  { fromCurrency: "EUR", toCurrency: "USD", rate: new Decimal("1.084") },
  { fromCurrency: "EUR", toCurrency: "CZK", rate: new Decimal("25.315") },
  { fromCurrency: "USD", toCurrency: "EUR", rate: new Decimal("0.92251") },
  { fromCurrency: "USD", toCurrency: "CZK", rate: new Decimal("23.35") },
  { fromCurrency: "CZK", toCurrency: "EUR", rate: new Decimal("0.0395") },
  { fromCurrency: "CZK", toCurrency: "USD", rate: new Decimal("0.04283") },
];

describe("findRate", () => {
  it("returns direct rate when available", () => {
    const rate = findRate("EUR", "USD", mockRates);
    expect(rate?.toString()).toBe("1.084");
  });

  it("returns 1 when from === to", () => {
    const rate = findRate("EUR", "EUR", mockRates);
    expect(rate?.toString()).toBe("1");
  });

  it("returns null when no rate exists", () => {
    const rate = findRate("GBP", "USD", mockRates);
    expect(rate).toBeNull();
  });
});

describe("convertAmount", () => {
  it("converts EUR to USD using direct rate", () => {
    const result = convertAmount(new Decimal("1000"), "EUR", "USD", mockRates);
    expect(result?.toString()).toBe("1084");
  });

  it("returns same amount when currencies match", () => {
    const result = convertAmount(new Decimal("500"), "EUR", "EUR", mockRates);
    expect(result?.toString()).toBe("500");
  });

  it("converts CZK to USD", () => {
    const result = convertAmount(new Decimal("10000"), "CZK", "USD", mockRates);
    expect(result?.toString()).toBe("428.3");
  });

  it("returns null when rate is missing", () => {
    const result = convertAmount(new Decimal("100"), "GBP", "USD", mockRates);
    expect(result).toBeNull();
  });
});

describe("formatCurrency", () => {
  it("formats EUR amount", () => {
    const result = formatCurrency(new Decimal("1234.56"), "EUR");
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("€");
  });

  it("formats USD amount", () => {
    const result = formatCurrency(new Decimal("1234.56"), "USD");
    expect(result).toContain("$");
  });

  it("formats CZK amount", () => {
    const result = formatCurrency(new Decimal("1234.56"), "CZK");
    expect(result).toContain("CZK");
  });

  it("formats whole numbers without unnecessary decimals", () => {
    const result = formatCurrency(new Decimal("1000"), "EUR");
    expect(result).not.toContain(".00");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/lib/currency.test.ts`

Expected: FAIL — `Cannot find module '@/lib/currency'`

- [ ] **Step 3: Write the implementation**

```typescript
import { Decimal } from "@prisma/client/runtime/library";
import { prismadb } from "@/lib/prisma";

type Rate = { fromCurrency: string; toCurrency: string; rate: Decimal };

const currencyLocaleMap: Record<string, string> = {
  EUR: "de-DE",
  USD: "en-US",
  CZK: "cs-CZ",
  GBP: "en-GB",
};

export function findRate(
  from: string,
  to: string,
  rates: Rate[]
): Decimal | null {
  if (from === to) return new Decimal("1");
  const direct = rates.find(
    (r) => r.fromCurrency === from && r.toCurrency === to
  );
  return direct ? new Decimal(direct.rate) : null;
}

export function convertAmount(
  amount: Decimal,
  from: string,
  to: string,
  rates: Rate[]
): Decimal | null {
  const rate = findRate(from, to, rates);
  if (!rate) return null;
  return amount.mul(rate).toDecimalPlaces(2);
}

export function formatCurrency(amount: Decimal, currencyCode: string): string {
  const num = amount.toNumber();
  const locale = currencyLocaleMap[currencyCode] || "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

export async function getExchangeRates(): Promise<Rate[]> {
  const rates = await prismadb.exchangeRate.findMany();
  return rates.map((r) => ({
    fromCurrency: r.fromCurrency,
    toCurrency: r.toCurrency,
    rate: r.rate,
  }));
}

export async function getSnapshotRate(
  from: string,
  to: string
): Promise<Decimal | null> {
  if (from === to) return new Decimal("1");
  const rate = await prismadb.exchangeRate.findUnique({
    where: {
      fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to },
    },
  });
  return rate ? rate.rate : null;
}

export async function getDefaultCurrency(): Promise<string> {
  const setting = await prismadb.crm_SystemSettings.findUnique({
    where: { key: "default_currency" },
  });
  return setting?.value || "EUR";
}

export async function getEnabledCurrencies() {
  return prismadb.currency.findMany({
    where: { isEnabled: true },
    orderBy: { code: "asc" },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/lib/currency.test.ts`

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/currency.ts __tests__/lib/currency.test.ts
git commit -m "feat: add currency conversion library with unit tests"
```

---

### Task 4: CurrencyProvider Context + CurrencySwitcher Component

**Files:**
- Create: `context/currency-context.tsx`
- Create: `components/CurrencySwitcher.tsx`
- Modify: `app/[locale]/(routes)/layout.tsx`
- Modify: `app/[locale]/(routes)/components/Header.tsx`

- [ ] **Step 1: Create CurrencyProvider context**

```typescript
"use client";

import { createContext, useContext, useState, useCallback, useTransition } from "react";

type CurrencyInfo = {
  code: string;
  symbol: string;
  name: string;
};

type CurrencyContextValue = {
  displayCurrency: string;
  currencies: CurrencyInfo[];
  setDisplayCurrency: (code: string) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  children,
  initialCurrency,
  currencies,
}: {
  children: React.ReactNode;
  initialCurrency: string;
  currencies: CurrencyInfo[];
}) {
  const [displayCurrency, setDisplayCurrencyState] = useState(initialCurrency);
  const [, startTransition] = useTransition();

  const setDisplayCurrency = useCallback(
    (code: string) => {
      setDisplayCurrencyState(code);
      document.cookie = `display_currency=${code};path=/;max-age=${60 * 60 * 24 * 365}`;
      startTransition(() => {
        window.location.reload();
      });
    },
    []
  );

  return (
    <CurrencyContext.Provider
      value={{ displayCurrency, currencies, setDisplayCurrency }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
```

- [ ] **Step 2: Create CurrencySwitcher component**

Follow the ThemeToggle pattern (shadcn DropdownMenu, Button variant="outline" size="icon"):

```typescript
"use client";

import { useCurrency } from "@/context/currency-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CurrencySwitcher() {
  const { displayCurrency, currencies, setDisplayCurrency } = useCurrency();
  const current = currencies.find((c) => c.code === displayCurrency);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs font-medium">
          <span>{current?.symbol ?? "$"}</span>
          <span>{displayCurrency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currencies.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setDisplayCurrency(c.code)}
            className={c.code === displayCurrency ? "bg-accent" : ""}
          >
            <span className="w-6 text-center">{c.symbol}</span>
            <span className="font-medium">{c.code}</span>
            <span className="ml-auto text-xs text-muted-foreground">{c.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Add CurrencyProvider to layout**

In `app/[locale]/(routes)/layout.tsx`, add imports at the top:

```typescript
import { CurrencyProvider } from "@/context/currency-context";
import { getEnabledCurrencies, getDefaultCurrency } from "@/lib/currency";
```

Inside the component function, before the return, add:

```typescript
  const enabledCurrencies = await getEnabledCurrencies();
  const defaultCurrency = await getDefaultCurrency();
  const cookieCurrency = cookieStore.get("display_currency")?.value;
  const displayCurrency = cookieCurrency && enabledCurrencies.some(c => c.code === cookieCurrency)
    ? cookieCurrency
    : defaultCurrency;
  const currencyList = enabledCurrencies.map(c => ({ code: c.code, name: c.name, symbol: c.symbol }));
```

Wrap the existing `<AvatarProvider>` children with:

```tsx
<CurrencyProvider initialCurrency={displayCurrency} currencies={currencyList}>
  {/* existing content */}
</CurrencyProvider>
```

- [ ] **Step 4: Add CurrencySwitcher to Header**

In `app/[locale]/(routes)/components/Header.tsx`, add import:

```typescript
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
```

In the right-side `<div>`, add `<CurrencySwitcher />` between `<Feedback />` and `<ThemeToggle />`:

```tsx
          <Feedback />
          <CurrencySwitcher />
          <ThemeToggle />
```

- [ ] **Step 5: Verify the app compiles**

Run: `pnpm dev` and open the app. Verify the currency switcher appears in the header.

Expected: Dropdown shows EUR, USD, CZK. Clicking one sets a cookie and reloads.

- [ ] **Step 6: Commit**

```bash
git add context/currency-context.tsx components/CurrencySwitcher.tsx app/\[locale\]/\(routes\)/layout.tsx app/\[locale\]/\(routes\)/components/Header.tsx
git commit -m "feat: add CurrencyProvider context and header CurrencySwitcher"
```

---

### Task 5: Admin Currencies Page — Server Actions

**Files:**
- Create: `app/[locale]/(routes)/admin/currencies/_actions/currencies.ts`

- [ ] **Step 1: Create server actions**

Follow the pattern from `admin/crm-settings/_actions/crm-settings.ts`:

```typescript
"use server";

import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ExchangeRateSource } from "@prisma/client";

export type CurrencyValue = {
  code: string;
  name: string;
  symbol: string;
  isEnabled: boolean;
  isDefault: boolean;
};

export type ExchangeRateValue = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  source: ExchangeRateSource;
  effectiveDate: Date;
  updatedAt: Date;
};

const currencySchema = z.object({
  code: z.string().length(3, "Must be 3-letter ISO code").toUpperCase(),
  name: z.string().min(1, "Name is required").max(100),
  symbol: z.string().min(1).max(5),
});

const rateSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  rate: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Rate must be positive"),
});

export async function getCurrencies(): Promise<CurrencyValue[]> {
  const currencies = await prismadb.currency.findMany({ orderBy: { code: "asc" } });
  return currencies.map((c) => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    isEnabled: c.isEnabled,
    isDefault: c.isDefault,
  }));
}

export async function getExchangeRatesAdmin(): Promise<ExchangeRateValue[]> {
  const rates = await prismadb.exchangeRate.findMany({
    orderBy: [{ fromCurrency: "asc" }, { toCurrency: "asc" }],
  });
  return rates.map((r) => ({
    id: r.id,
    fromCurrency: r.fromCurrency,
    toCurrency: r.toCurrency,
    rate: r.rate.toString(),
    source: r.source,
    effectiveDate: r.effectiveDate,
    updatedAt: r.updatedAt,
  }));
}

export async function createCurrency(data: { code: string; name: string; symbol: string }) {
  const parsed = currencySchema.parse(data);
  await prismadb.currency.create({ data: { ...parsed, isEnabled: true, isDefault: false } });
  revalidatePath("/", "layout");
}

export async function toggleCurrency(code: string, isEnabled: boolean) {
  await prismadb.currency.update({ where: { code }, data: { isEnabled } });
  revalidatePath("/", "layout");
}

export async function setDefaultCurrency(code: string) {
  await prismadb.$transaction([
    prismadb.currency.updateMany({ data: { isDefault: false } }),
    prismadb.currency.update({ where: { code }, data: { isDefault: true, isEnabled: true } }),
    prismadb.crm_SystemSettings.upsert({
      where: { key: "default_currency" },
      update: { value: code },
      create: { key: "default_currency", value: code },
    }),
  ]);
  revalidatePath("/", "layout");
}

export async function updateExchangeRate(data: {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
}) {
  const parsed = rateSchema.parse(data);
  await prismadb.exchangeRate.upsert({
    where: {
      fromCurrency_toCurrency: {
        fromCurrency: parsed.fromCurrency,
        toCurrency: parsed.toCurrency,
      },
    },
    update: {
      rate: parseFloat(parsed.rate),
      source: ExchangeRateSource.MANUAL,
      effectiveDate: new Date(),
    },
    create: {
      fromCurrency: parsed.fromCurrency,
      toCurrency: parsed.toCurrency,
      rate: parseFloat(parsed.rate),
      source: ExchangeRateSource.MANUAL,
      effectiveDate: new Date(),
    },
  });
  revalidatePath("/", "layout");
}

export async function getEcbAutoUpdate(): Promise<boolean> {
  const setting = await prismadb.crm_SystemSettings.findUnique({
    where: { key: "ecb_auto_update" },
  });
  return setting?.value === "true";
}

export async function setEcbAutoUpdate(enabled: boolean) {
  await prismadb.crm_SystemSettings.upsert({
    where: { key: "ecb_auto_update" },
    update: { value: enabled ? "true" : "false" },
    create: { key: "ecb_auto_update", value: enabled ? "true" : "false" },
  });
  revalidatePath("/", "layout");
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(routes\)/admin/currencies/_actions/currencies.ts
git commit -m "feat(admin): add server actions for currency management"
```

---

### Task 6: Admin Currencies Page — UI Components

**Files:**
- Create: `app/[locale]/(routes)/admin/currencies/_components/CurrencyTable.tsx`
- Create: `app/[locale]/(routes)/admin/currencies/_components/ExchangeRatesTable.tsx`
- Create: `app/[locale]/(routes)/admin/currencies/_components/ECBToggle.tsx`
- Create: `app/[locale]/(routes)/admin/currencies/page.tsx`
- Modify: `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx`

- [ ] **Step 1: Create CurrencyTable component**

```typescript
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toggleCurrency, setDefaultCurrency, createCurrency } from "../_actions/currencies";
import type { CurrencyValue } from "../_actions/currencies";

export function CurrencyTable({ currencies }: { currencies: CurrencyValue[] }) {
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");

  const handleToggle = async (code: string, enabled: boolean) => {
    try {
      await toggleCurrency(code, enabled);
      toast.success(`Currency ${code} ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update currency");
    }
  };

  const handleSetDefault = async (code: string) => {
    try {
      await setDefaultCurrency(code);
      toast.success(`${code} set as default currency`);
    } catch {
      toast.error("Failed to set default currency");
    }
  };

  const handleCreate = async () => {
    try {
      await createCurrency({ code: newCode, name: newName, symbol: newSymbol });
      toast.success(`Currency ${newCode} added`);
      setAdding(false);
      setNewCode("");
      setNewName("");
      setNewSymbol("");
    } catch (e: any) {
      toast.error(e.message || "Failed to add currency");
    }
  };

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead>Default</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currencies.map((c) => (
            <TableRow key={c.code} className={!c.isEnabled ? "opacity-50" : ""}>
              <TableCell className="font-semibold">{c.code}</TableCell>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.symbol}</TableCell>
              <TableCell>
                <Switch
                  checked={c.isEnabled}
                  onCheckedChange={(checked) => handleToggle(c.code, checked)}
                  disabled={c.isDefault}
                />
              </TableCell>
              <TableCell>
                <input
                  type="radio"
                  name="defaultCurrency"
                  checked={c.isDefault}
                  onChange={() => handleSetDefault(c.code)}
                  className="h-4 w-4"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="mt-4">
            + Add Currency
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Currency</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Code (e.g. GBP)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              maxLength={3}
            />
            <Input
              placeholder="Name (e.g. British Pound)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder="Symbol (e.g. £)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              maxLength={5}
            />
            <Button onClick={handleCreate} disabled={!newCode || !newName || !newSymbol}>
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Create ExchangeRatesTable component**

```typescript
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateExchangeRate } from "../_actions/currencies";
import type { ExchangeRateValue } from "../_actions/currencies";

export function ExchangeRatesTable({
  rates,
  ecbEnabled,
}: {
  rates: ExchangeRateValue[];
  ecbEnabled: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleSave = async (rate: ExchangeRateValue) => {
    try {
      await updateExchangeRate({
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        rate: editValue,
      });
      toast.success("Rate updated");
      setEditing(null);
    } catch {
      toast.error("Failed to update rate");
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rates.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.fromCurrency}</TableCell>
            <TableCell>{r.toCurrency}</TableCell>
            <TableCell>
              {editing === r.id ? (
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-32"
                  autoFocus
                />
              ) : (
                <code>{r.rate}</code>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={r.source === "ECB" ? "default" : "secondary"}>
                {r.source}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(r.updatedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {editing === r.id ? (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => handleSave(r)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(r.id);
                    setEditValue(r.rate);
                  }}
                  disabled={ecbEnabled && r.source === "ECB"}
                >
                  Edit
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Create ECBToggle component**

```typescript
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setEcbAutoUpdate } from "../_actions/currencies";

export function ECBToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);

  const handleToggle = async (checked: boolean) => {
    try {
      await setEcbAutoUpdate(checked);
      setEnabled(checked);
      toast.success(`ECB auto-update ${checked ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update ECB setting");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">ECB Auto-Update</span>
      <Switch checked={enabled} onCheckedChange={handleToggle} />
    </div>
  );
}
```

- [ ] **Step 4: Create the admin page**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrencies, getExchangeRatesAdmin, getEcbAutoUpdate } from "./_actions/currencies";
import { CurrencyTable } from "./_components/CurrencyTable";
import { ExchangeRatesTable } from "./_components/ExchangeRatesTable";
import { ECBToggle } from "./_components/ECBToggle";

export default async function CurrenciesPage() {
  const [currencies, rates, ecbEnabled] = await Promise.all([
    getCurrencies(),
    getExchangeRatesAdmin(),
    getEcbAutoUpdate(),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Currencies</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrencyTable currencies={currencies} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exchange Rates</CardTitle>
          <ECBToggle initialEnabled={ecbEnabled} />
        </CardHeader>
        <CardContent>
          <ExchangeRatesTable rates={rates} ecbEnabled={ecbEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Add "Currencies" to AdminSidebarNav**

In `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx`, add `Coins` to the lucide-react import:

```typescript
import { Key, Users, Settings, SlidersHorizontal, ClipboardList, Coins } from "lucide-react";
```

Add a new item to the `navItems` array after the "CRM Settings" entry:

```typescript
  { label: "Currencies",   href: "/admin/currencies",  icon: Coins },
```

- [ ] **Step 6: Verify the admin page loads**

Run: `pnpm dev` and navigate to `/admin/currencies`.

Expected: Currency table and exchange rates table render with seeded data. Toggle and edit controls work.

- [ ] **Step 7: Commit**

```bash
git add app/\[locale\]/\(routes\)/admin/currencies/ app/\[locale\]/\(routes\)/admin/_components/AdminSidebarNav.tsx
git commit -m "feat(admin): add currencies management page with table, rates, and ECB toggle"
```

---

### Task 7: Update Opportunity Create/Update Actions — Snapshot Rate

**Files:**
- Modify: `actions/crm/opportunities/create-opportunity.ts`
- Modify: `actions/crm/opportunities/update-opportunity.ts`

- [ ] **Step 1: Update create-opportunity action**

In `actions/crm/opportunities/create-opportunity.ts`, add import at top:

```typescript
import { getSnapshotRate, getDefaultCurrency } from "@/lib/currency";
```

In the `try` block, before the `prismadb.crm_Opportunities.create` call, add:

```typescript
    const defaultCurrency = await getDefaultCurrency();
    const snapshotRate = currency
      ? await getSnapshotRate(currency, defaultCurrency)
      : null;
```

In the `data` object passed to `prismadb.crm_Opportunities.create`, change `budget` and `expected_revenue` and add `snapshot_rate`:

```typescript
        budget: budget ? parseFloat(budget) : undefined,
        expected_revenue: expected_revenue ? parseFloat(expected_revenue) : undefined,
        snapshot_rate: snapshotRate ? parseFloat(snapshotRate.toString()) : undefined,
```

Note: `Number(budget)` becomes `parseFloat(budget)` — the value is now Decimal, not BigInt.

- [ ] **Step 2: Update update-opportunity action**

In `actions/crm/opportunities/update-opportunity.ts`, add import at top:

```typescript
import { getSnapshotRate, getDefaultCurrency } from "@/lib/currency";
```

In the `try` block, before the `prismadb.crm_Opportunities.update` call, add:

```typescript
    const defaultCurrency = await getDefaultCurrency();
    const snapshotRate = currency
      ? await getSnapshotRate(currency, defaultCurrency)
      : null;
```

In the `data` object passed to `prismadb.crm_Opportunities.update`, change `budget` and `expected_revenue` and add `snapshot_rate`:

```typescript
        budget: budget ? parseFloat(budget) : undefined,
        expected_revenue: expected_revenue ? parseFloat(expected_revenue) : undefined,
        snapshot_rate: snapshotRate ? parseFloat(snapshotRate.toString()) : undefined,
```

Also remove the `serialize` helper's BigInt handling since we no longer use BigInt — the `typeof v === "bigint"` branch can stay harmless or be removed.

- [ ] **Step 3: Commit**

```bash
git add actions/crm/opportunities/create-opportunity.ts actions/crm/opportunities/update-opportunity.ts
git commit -m "feat(opportunities): add snapshot rate lookup on create/update"
```

---

### Task 8: Update Contract Create/Update Actions — Currency + Snapshot Rate

**Files:**
- Modify: `actions/crm/contracts/create-new-contract/schema.ts`
- Modify: `actions/crm/contracts/create-new-contract/index.ts`
- Modify: `actions/crm/contracts/update-contract/schema.ts`
- Modify: `actions/crm/contracts/update-contract/index.ts`

- [ ] **Step 1: Add currency to contract create schema**

In `actions/crm/contracts/create-new-contract/schema.ts`, add `currency` field:

```typescript
import { z } from "zod";

export const CreateNewContract = z.object({
  title: z.string().min(3).max(255),
  value: z.string(),
  currency: z.string().length(3).optional(),
  startDate: z.date(),
  endDate: z.date(),
  renewalReminderDate: z.date(),
  customerSignedDate: z.date(),
  companySignedDate: z.date(),
  description: z.string().max(255),
  account: z.string(),
  assigned_to: z.string(),
});
```

- [ ] **Step 2: Add snapshot rate to contract create action**

In `actions/crm/contracts/create-new-contract/index.ts`, add import:

```typescript
import { getSnapshotRate, getDefaultCurrency } from "@/lib/currency";
```

Destructure `currency` from `data`:

```typescript
  const {
    title,
    value,
    currency,
    startDate,
    ...
  } = data;
```

Before the `prismadb.crm_Contracts.create` call, add:

```typescript
    const defaultCurrency = await getDefaultCurrency();
    const snapshotRate = currency
      ? await getSnapshotRate(currency, defaultCurrency)
      : null;
```

Add to the create data:

```typescript
        currency: currency || undefined,
        snapshot_rate: snapshotRate ? parseFloat(snapshotRate.toString()) : undefined,
```

- [ ] **Step 3: Add currency to contract update schema**

In `actions/crm/contracts/update-contract/schema.ts`, add `currency` field:

```typescript
  currency: z.string().length(3).optional(),
```

- [ ] **Step 4: Add snapshot rate to contract update action**

Same pattern as create — import `getSnapshotRate`, `getDefaultCurrency`, destructure `currency`, compute snapshot rate, add to update data.

In `actions/crm/contracts/update-contract/index.ts`, add import:

```typescript
import { getSnapshotRate, getDefaultCurrency } from "@/lib/currency";
```

Destructure `currency` from `data`:

```typescript
  const {
    id,
    v,
    title,
    value,
    currency,
    startDate,
    ...
  } = data;
```

Before `prismadb.crm_Contracts.update`, add:

```typescript
    const defaultCurrency = await getDefaultCurrency();
    const snapshotRate = currency
      ? await getSnapshotRate(currency, defaultCurrency)
      : null;
```

Add to the update data:

```typescript
        currency: currency || undefined,
        snapshot_rate: snapshotRate ? parseFloat(snapshotRate.toString()) : undefined,
```

- [ ] **Step 5: Commit**

```bash
git add actions/crm/contracts/
git commit -m "feat(contracts): add currency and snapshot rate to create/update actions"
```

---

### Task 9: Update Opportunity Forms — Currency Dropdown

**Files:**
- Modify: `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx`
- Modify: `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx`

- [ ] **Step 1: Update NewOpportunityForm props and currency dropdown**

The form already has a `currency` field in its schema and reset values. Currently it's a text input or free select. Change it to a dropdown populated from enabled currencies.

Add a `currencies` prop to the component:

```typescript
type NewTaskFormProps = {
  accounts: crm_Accounts[];
  contacts: crm_Contacts[];
  salesType: crm_Opportunities_Type[];
  saleStages: crm_Opportunities_Sales_Stages[];
  campaigns: crm_campaigns[];
  currencies: { code: string; name: string; symbol: string }[];
  selectedStage?: string;
  accountId?: string;
  onDialogClose: () => void;
};
```

Replace the currency form field with a Select dropdown (same pattern as the existing sales_stage or type dropdowns):

```tsx
<FormField
  control={form.control}
  name="currency"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t("currency")}</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={t("selectCurrency")} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {currencies.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.symbol} {c.code} — {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

- [ ] **Step 2: Update the parent page that renders NewOpportunityForm**

Find where `NewOpportunityForm` is rendered and pass the `currencies` prop. This will require importing `getEnabledCurrencies` from `@/lib/currency` in the parent server component and passing the result.

- [ ] **Step 3: Update UpdateOpportunityForm similarly**

Add `currencies` prop and replace the currency field with the same Select dropdown pattern. The `initialData.currency` should be set as the default value.

- [ ] **Step 4: Verify forms work**

Run: `pnpm dev`, create a new opportunity, verify currency dropdown shows EUR/USD/CZK. Update an existing opportunity, verify currency persists.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/opportunities/
git commit -m "feat(opportunities): add currency dropdown to create/update forms"
```

---

### Task 10: Update Contract Forms — Currency Dropdown

**Files:**
- Modify: `app/[locale]/(routes)/crm/contracts/_forms/create-contract.tsx`
- Modify: `app/[locale]/(routes)/crm/contracts/_forms/update-contract.tsx`

- [ ] **Step 1: Add currency dropdown to create-contract form**

Same pattern as opportunity forms. Add `currencies` prop, add a Select field for currency. The currency should default to the default currency.

- [ ] **Step 2: Add currency dropdown to update-contract form**

Same pattern. Default value from `initialData.currency`.

- [ ] **Step 3: Update parent pages to pass currencies prop**

Import `getEnabledCurrencies` in the parent server components and pass to the forms.

- [ ] **Step 4: Verify contract forms work**

Run: `pnpm dev`, create/update a contract, verify currency dropdown works.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/contracts/
git commit -m "feat(contracts): add currency dropdown to create/update forms"
```

---

### Task 11: Update Dashboard — Currency-Aware Revenue

**Files:**
- Modify: `actions/crm/opportunity/get-expected-revenue.ts`
- Modify: `app/[locale]/(routes)/page.tsx`

- [ ] **Step 1: Update getExpectedRevenue to accept display currency**

Replace the entire file:

```typescript
import { prismadb } from "@/lib/prisma";
import { getExchangeRates, convertAmount } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/library";

export const getExpectedRevenue = async (displayCurrency: string) => {
  const activeOpportunities = await prismadb.crm_Opportunities.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
    },
    select: {
      budget: true,
      currency: true,
    },
  });

  const rates = await getExchangeRates();

  let total = new Decimal(0);
  for (const opp of activeOpportunities) {
    const budget = new Decimal(opp.budget?.toString() ?? "0");
    const from = opp.currency || displayCurrency;
    const converted = convertAmount(budget, from, displayCurrency, rates);
    total = total.add(converted ?? budget);
  }

  return total.toNumber();
};
```

- [ ] **Step 2: Update dashboard page to pass display currency**

In `app/[locale]/(routes)/page.tsx`, add imports:

```typescript
import { cookies } from "next/headers";
import { getDefaultCurrency } from "@/lib/currency";
import { formatCurrency as formatCurrencyUtil } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/library";
```

Get display currency from cookie (same pattern as layout.tsx):

```typescript
  const cookieStore = await cookies();
  const defaultCurrency = await getDefaultCurrency();
  const displayCurrency = cookieStore.get("display_currency")?.value || defaultCurrency;
```

Change the `getExpectedRevenue()` call to pass the display currency:

```typescript
  const revenue = await getExpectedRevenue(displayCurrency);
```

Update the revenue display to use `formatCurrencyUtil` instead of `toLocaleString`:

```typescript
  {formatCurrencyUtil(new Decimal(revenue), displayCurrency)}
```

- [ ] **Step 3: Verify dashboard shows converted revenue**

Run: `pnpm dev`, switch currency in header, verify revenue value changes.

- [ ] **Step 4: Commit**

```bash
git add actions/crm/opportunity/get-expected-revenue.ts app/\[locale\]/\(routes\)/page.tsx
git commit -m "feat(dashboard): display expected revenue in selected display currency"
```

---

### Task 12: Update Sales Reports — Currency-Aware Aggregation

**Files:**
- Modify: `actions/reports/sales.ts`
- Modify: `app/[locale]/(routes)/reports/sales/page.tsx`

- [ ] **Step 1: Update sales report actions**

In `actions/reports/sales.ts`, add imports:

```typescript
import { getExchangeRates, convertAmount } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/library";
```

Replace `getRevenue` — can no longer use `aggregate` with `_sum` since we need per-record conversion:

```typescript
export async function getRevenue(filters: ReportFilters, displayCurrency: string): Promise<number> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: { ...dateRangeWhere(filters), status: "CLOSED" },
    select: { budget: true, currency: true },
  });
  const rates = await getExchangeRates();
  let total = new Decimal(0);
  for (const opp of opps) {
    const budget = new Decimal(opp.budget?.toString() ?? "0");
    const from = opp.currency || displayCurrency;
    const converted = convertAmount(budget, from, displayCurrency, rates);
    total = total.add(converted ?? budget);
  }
  return total.toNumber();
}
```

Replace `getPipelineValue` with the same pattern (filter `status: "ACTIVE"` instead of `"CLOSED"`):

```typescript
export async function getPipelineValue(filters: ReportFilters, displayCurrency: string): Promise<number> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: { ...dateRangeWhere(filters), status: "ACTIVE" },
    select: { budget: true, currency: true },
  });
  const rates = await getExchangeRates();
  let total = new Decimal(0);
  for (const opp of opps) {
    const budget = new Decimal(opp.budget?.toString() ?? "0");
    const from = opp.currency || displayCurrency;
    const converted = convertAmount(budget, from, displayCurrency, rates);
    total = total.add(converted ?? budget);
  }
  return total.toNumber();
}
```

Replace `getAvgDealSize`:

```typescript
export async function getAvgDealSize(filters: ReportFilters, displayCurrency: string): Promise<number> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: { ...dateRangeWhere(filters), status: "CLOSED" },
    select: { budget: true, currency: true },
  });
  if (opps.length === 0) return 0;
  const rates = await getExchangeRates();
  let total = new Decimal(0);
  for (const opp of opps) {
    const budget = new Decimal(opp.budget?.toString() ?? "0");
    const from = opp.currency || displayCurrency;
    const converted = convertAmount(budget, from, displayCurrency, rates);
    total = total.add(converted ?? budget);
  }
  return total.div(opps.length).toDecimalPlaces(2).toNumber();
}
```

Leave `getOppsByStage`, `getOppsByMonth`, `getWinLossRate`, `getSalesCycleLength` unchanged — they don't deal with money values.

- [ ] **Step 2: Update sales report page**

In `app/[locale]/(routes)/reports/sales/page.tsx`, add imports:

```typescript
import { cookies } from "next/headers";
import { getDefaultCurrency, formatCurrency as formatCurrencyUtil } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/library";
```

Get display currency from cookie:

```typescript
  const cookieStore = await cookies();
  const defaultCurrency = await getDefaultCurrency();
  const displayCurrency = cookieStore.get("display_currency")?.value || defaultCurrency;
```

Remove the hardcoded `currencyFormatter`:

```typescript
// DELETE THIS:
// const currencyFormatter = new Intl.NumberFormat("en-US", {
//   style: "currency",
//   currency: "USD",
//   maximumFractionDigits: 0,
// });
```

Pass `displayCurrency` to the data fetching calls:

```typescript
  const [revenue, pipeline, oppsByStage, oppsByMonth, winLoss, avgDeal, cycleLength] =
    await Promise.all([
      getRevenue(filters, displayCurrency),
      getPipelineValue(filters, displayCurrency),
      getOppsByStage(filters),
      getOppsByMonth(filters),
      getWinLossRate(filters),
      getAvgDealSize(filters, displayCurrency),
      getSalesCycleLength(filters),
    ]);
```

Replace `currencyFormatter.format(revenue)` calls with:

```typescript
  {formatCurrencyUtil(new Decimal(revenue), displayCurrency)}
```

Do the same for `pipeline` and `avgDeal` displays.

- [ ] **Step 3: Verify reports show converted values**

Run: `pnpm dev`, go to Reports > Sales. Switch currency in header, verify revenue/pipeline/avg deal change.

- [ ] **Step 4: Commit**

```bash
git add actions/reports/sales.ts app/\[locale\]/\(routes\)/reports/sales/page.tsx
git commit -m "feat(reports): convert sales report values to display currency"
```

---

### Task 13: Update Opportunity Display — BasicView + Table Columns

**Files:**
- Modify: `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/BasicView.tsx`
- Modify: `app/[locale]/(routes)/crm/opportunities/table-components/columns.tsx`

- [ ] **Step 1: Update Opportunity BasicView**

In `BasicView.tsx`, import currency formatting:

```typescript
import { formatCurrency } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/library";
```

Replace the hardcoded currency formatting for budget and expected_revenue display with:

```typescript
{data.currency
  ? formatCurrency(new Decimal(data.budget?.toString() ?? "0"), data.currency)
  : data.budget?.toString() ?? "0"}
```

Apply the same pattern to `expected_revenue`.

- [ ] **Step 2: Update opportunity table columns**

In `columns.tsx`, find where budget/expected_revenue are formatted and replace the hardcoded USD formatting with dynamic formatting using the row's `currency` field:

```typescript
{
  accessorKey: "budget",
  header: "Budget",
  cell: ({ row }) => {
    const budget = row.original.budget;
    const currency = row.original.currency || "EUR";
    if (!budget) return "—";
    return formatCurrency(new Decimal(budget.toString()), currency);
  },
}
```

Add the import at the top:

```typescript
import { formatCurrency } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/library";
```

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/opportunities/
git commit -m "feat(opportunities): display budget and revenue with currency formatting"
```

---

### Task 14: Update Contract Display — BasicView

**Files:**
- Modify: `app/[locale]/(routes)/crm/contracts/[contractId]/components/BasicView.tsx`

- [ ] **Step 1: Replace hardcoded USD formatting**

In `BasicView.tsx`, find the `formatCurrency` local function:

```typescript
  const formatCurrency = (value: number | null | undefined) =>
    value != null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(value)
      : "N/A";
```

Replace it with a version that uses the contract's currency:

```typescript
import { formatCurrency as formatCurrencyUtil } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/library";
```

```typescript
  const formatValue = (value: number | string | null | undefined) =>
    value != null
      ? formatCurrencyUtil(new Decimal(value.toString()), data.currency || "EUR")
      : "N/A";
```

Update all calls from `formatCurrency(data.value)` to `formatValue(data.value)`.

- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/contracts/
git commit -m "feat(contracts): display contract value with dynamic currency formatting"
```

---

### Task 15: Inngest ECB Rate Sync Function

**Files:**
- Create: `inngest/functions/ecb/sync-exchange-rates.ts`
- Modify: `app/api/inngest/route.ts`

- [ ] **Step 1: Create the ECB sync function**

```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { ExchangeRateSource } from "@prisma/client";

export const syncExchangeRates = inngest.createFunction(
  { id: "ecb-sync-exchange-rates", name: "ECB Sync Exchange Rates" },
  { cron: "0 17 * * 1-5" },
  async ({ step }) => {
    const enabled = await step.run("check-ecb-enabled", async () => {
      const setting = await prismadb.crm_SystemSettings.findUnique({
        where: { key: "ecb_auto_update" },
      });
      return setting?.value === "true";
    });

    if (!enabled) {
      return { skipped: true, reason: "ECB auto-update is disabled" };
    }

    const ecbRates = await step.run("fetch-ecb-rates", async () => {
      const response = await fetch(
        "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
      );
      if (!response.ok) {
        throw new Error(`ECB fetch failed: ${response.status}`);
      }
      const xml = await response.text();
      return parseEcbXml(xml);
    });

    const updated = await step.run("update-rates", async () => {
      const enabledCurrencies = await prismadb.currency.findMany({
        where: { isEnabled: true },
        select: { code: true },
      });
      const enabledCodes = new Set(enabledCurrencies.map((c) => c.code));
      let count = 0;

      for (const [currency, rate] of Object.entries(ecbRates)) {
        if (!enabledCodes.has(currency)) continue;

        // EUR → X
        await prismadb.exchangeRate.upsert({
          where: {
            fromCurrency_toCurrency: { fromCurrency: "EUR", toCurrency: currency },
          },
          update: { rate, source: ExchangeRateSource.ECB, effectiveDate: new Date() },
          create: {
            fromCurrency: "EUR",
            toCurrency: currency,
            rate,
            source: ExchangeRateSource.ECB,
            effectiveDate: new Date(),
          },
        });

        // X → EUR (inverse)
        const inverse = parseFloat((1 / rate).toFixed(8));
        await prismadb.exchangeRate.upsert({
          where: {
            fromCurrency_toCurrency: { fromCurrency: currency, toCurrency: "EUR" },
          },
          update: { rate: inverse, source: ExchangeRateSource.ECB, effectiveDate: new Date() },
          create: {
            fromCurrency: currency,
            toCurrency: "EUR",
            rate: inverse,
            source: ExchangeRateSource.ECB,
            effectiveDate: new Date(),
          },
        });
        count += 2;
      }

      // Cross rates between non-EUR currencies
      const nonEurCodes = [...enabledCodes].filter((c) => c !== "EUR");
      for (const from of nonEurCodes) {
        for (const to of nonEurCodes) {
          if (from === to) continue;
          const fromRate = ecbRates[from];
          const toRate = ecbRates[to];
          if (!fromRate || !toRate) continue;

          // Skip if admin has manually overridden this pair
          const existing = await prismadb.exchangeRate.findUnique({
            where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
          });
          if (existing?.source === ExchangeRateSource.MANUAL) continue;

          const crossRate = parseFloat((toRate / fromRate).toFixed(8));
          await prismadb.exchangeRate.upsert({
            where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
            update: { rate: crossRate, source: ExchangeRateSource.ECB, effectiveDate: new Date() },
            create: {
              fromCurrency: from,
              toCurrency: to,
              rate: crossRate,
              source: ExchangeRateSource.ECB,
              effectiveDate: new Date(),
            },
          });
          count++;
        }
      }

      return count;
    });

    return { updated, ratesCount: Object.keys(ecbRates).length };
  }
);

function parseEcbXml(xml: string): Record<string, number> {
  const rates: Record<string, number> = {};
  const regex = /currency='([A-Z]{3})'\s+rate='([0-9.]+)'/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    rates[match[1]] = parseFloat(match[2]);
  }
  return rates;
}
```

- [ ] **Step 2: Register in Inngest route**

In `app/api/inngest/route.ts`, add import:

```typescript
import { syncExchangeRates } from "@/inngest/functions/ecb/sync-exchange-rates";
```

Add `syncExchangeRates` to the `functions` array:

```typescript
  functions: [
    // ... existing functions ...
    syncExchangeRates,
  ],
```

- [ ] **Step 3: Verify Inngest function registers**

Run: `pnpm dev` and check the Inngest dev server (if running) to confirm the function appears.

- [ ] **Step 4: Commit**

```bash
git add inngest/functions/ecb/sync-exchange-rates.ts app/api/inngest/route.ts
git commit -m "feat(inngest): add daily ECB exchange rate sync function"
```

---

### Task 16: Run Full Test Suite + Lint

**Files:** None (verification only)

- [ ] **Step 1: Run unit tests**

Run: `pnpm test`

Expected: All tests pass, including the new currency tests.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: No new errors.

- [ ] **Step 3: Run build**

Run: `pnpm build`

Expected: Build succeeds. This catches type errors in server components that unit tests don't cover.

- [ ] **Step 4: Fix any issues found, commit fixes**

If any tests fail or lint errors appear, fix them and commit:

```bash
git commit -m "fix: address test/lint issues from currency support"
```
