import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { oxoClient } from "../oxo";
import { settingsSchema, type Ctx } from "../settings";
import { emptyOxo, fakeOxo, type FakeOxo } from "./fake-oxo";

export type TestCtx = Ctx & { notifications: { roles?: string[]; subject: string; text: string }[]; logs: { level: string; message: string }[] };
export const now = new Date("2026-10-18T09:00:00Z");
export const KEY = `oxo_${"a".repeat(40)}`;

type Tables = "accounts" | "users" | "products" | "productCategories" | "priceLists" | "priceListRules" | "orders";

/** A context whose fetch is a fake OXO ERP; returns the live fake state and the in-memory CRM tables. */
export function mk(oxo: Partial<FakeOxo> = {}, data: Partial<Record<Tables, RecordData[]>> = {}, settings: Record<string, unknown> = {}) {
  const s: FakeOxo = { ...emptyOxo(), ...oxo };
  const d: Record<Tables, RecordData[]> = { accounts: [], users: [], products: [], productCategories: [], priceLists: [], priceListRules: [], orders: [], ...data };
  const ctx = createTestContext({
    pluginId: "oxo-erp-connector",
    settings: settingsSchema.parse({ url: "https://erp.example.com", dryRun: false, ...settings }),
    secrets: { apiKey: KEY }, fetch: fakeOxo(s), data: d,
  }) as unknown as TestCtx;
  return { ctx, client: oxoClient(ctx), oxo: s, data: d };
}
