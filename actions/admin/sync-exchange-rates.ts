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
