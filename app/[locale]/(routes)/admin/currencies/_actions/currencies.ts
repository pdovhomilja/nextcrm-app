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
