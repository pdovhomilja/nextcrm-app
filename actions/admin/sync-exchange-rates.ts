"use server";

import { getSession } from "@/lib/auth-server";
import { persistFrankfurterRates } from "@/lib/currency/persist-frankfurter-rates";
import { revalidatePath } from "next/cache";

export async function syncExchangeRatesFromFrankfurter(): Promise<{
  ok: boolean;
  updated: number;
  error?: string;
}> {
  const session = await getSession();
  if (session?.user?.role !== "admin") {
    return { ok: false, updated: 0, error: "Admin only" };
  }

  try {
    const updated = await persistFrankfurterRates();
    revalidatePath("/admin/currencies");
    return { ok: true, updated };
  } catch (e) {
    return {
      ok: false,
      updated: 0,
      error: e instanceof Error ? e.message : "Sync failed",
    };
  }
}

export async function syncExchangeRatesFromCurrencyApiAction(): Promise<{
  ok: boolean;
  updated: number;
  base?: string;
  error?: string;
}> {
  const session = await getSession();
  if (session?.user?.role !== "admin") {
    return { ok: false, updated: 0, error: "Admin only" };
  }

  try {
    const { syncExchangeRatesFromCurrencyApi } = await import(
      "@/lib/currency/currencyapi"
    );
    const res = await syncExchangeRatesFromCurrencyApi();
    revalidatePath("/admin/currencies");
    return res;
  } catch (e) {
    return {
      ok: false,
      updated: 0,
      error: e instanceof Error ? e.message : "CurrencyAPI sync failed",
    };
  }
}

export async function syncGlobalCurrenciesAction(): Promise<{
  ok: boolean;
  total: number;
  added: number;
  updated: number;
  error?: string;
}> {
  const session = await getSession();
  if (session?.user?.role !== "admin") {
    return { ok: false, total: 0, added: 0, updated: 0, error: "Admin only" };
  }

  try {
    const { syncAllCurrenciesFromCurrencyApi } = await import(
      "@/lib/currency/currencyapi"
    );
    const res = await syncAllCurrenciesFromCurrencyApi();
    revalidatePath("/admin/currencies");
    return { ok: true, ...res };
  } catch (e) {
    return {
      ok: false,
      total: 0,
      added: 0,
      updated: 0,
      error: e instanceof Error ? e.message : "Currency sync failed",
    };
  }
}

