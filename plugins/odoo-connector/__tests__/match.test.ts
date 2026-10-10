import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { matchAccount, normalizeNumber, normalizeVat } from "../match";
import { accountFields, type OdooPartner } from "../map";
import { settingsSchema, type Ctx } from "../settings";
import { K } from "../store";

const S = settingsSchema.parse({ url: "https://odoo.example.com", database: "db" });
const mk = (accounts: RecordData[]) => createTestContext({ pluginId: "odoo-connector", settings: S, data: { accounts } }) as unknown as Ctx;
const fields = (over: Partial<OdooPartner> = {}) =>
  accountFields({ id: 5, name: "Nora", company_registry: "7082440", vat: "CZ 07082440", country_id: false, write_date: "x", ...over }, () => null, "CZ");

it("normalizes numbers like account protection (CZ pads to 8) and VAT", () => {
  expect(normalizeNumber("CZ", " 7082440 ")).toBe("07082440");
  expect(normalizeNumber("SK", "36 421 928")).toBe("36421928");
  expect(normalizeNumber("CZ", null)).toBeNull();
  expect(normalizeVat("cz 070 82440")).toBe("CZ07082440");
});

it("prefers the link, then the number, then the VAT", async () => {
  const ctx = mk([
    { id: "a1", name: "X", company_id: "07082440", vat: null, billing_country: "Czechia", deletedAt: null },
    { id: "a2", name: "Y", company_id: null, vat: "CZ07082440", billing_country: "CZ", deletedAt: null },
  ]);
  await expect(matchAccount(ctx, 5, fields())).resolves.toEqual({ kind: "number", accountId: "a1" });
  await expect(matchAccount(ctx, 5, fields({ company_registry: false }))).resolves.toEqual({ kind: "vat", accountId: "a2" });
  await ctx.store.set(K.partner(5), { accountId: "a2" });
  await expect(matchAccount(ctx, 5, fields())).resolves.toEqual({ kind: "linked", accountId: "a2" });
});

it("reports a conflict when two accounts match (Review Focus 2)", async () => {
  const ctx = mk([
    { id: "a1", name: "X", company_id: "07082440", deletedAt: null },
    { id: "a3", name: "Z", company_id: "7082440", deletedAt: null },
  ]);
  await expect(matchAccount(ctx, 5, fields())).resolves.toEqual({ kind: "conflict", reason: "number", candidates: ["a1", "a3"] });
});

it("creates when nothing matches, and ignores deleted or stale links (Review Focus 5)", async () => {
  const ctx = mk([{ id: "gone", name: "Old", company_id: "07082440", deletedAt: "2026-01-01" }]);
  await ctx.store.set(K.partner(5), { accountId: "gone" });
  await expect(matchAccount(ctx, 5, fields())).resolves.toEqual({ kind: "new" });
});
