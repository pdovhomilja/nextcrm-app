import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { SDK_VERSION } from "@nextcrm/plugin-sdk";

const mockQueryRaw = jest.fn();
jest.mock("@/lib/prisma-base", () => ({ prismaBase: { $queryRaw: (...a: unknown[]) => mockQueryRaw(...a) } }));

import { createStore } from "@/lib/plugins/store";

beforeEach(() => mockQueryRaw.mockReset());

it("is SDK 0.2.6 (additive)", () => expect(SDK_VERSION).toBe("0.2.6"));

it("claims through one INSERT … ON CONFLICT statement and reports whether a row came back", async () => {
  mockQueryRaw.mockResolvedValueOnce([{ key: "sending:o1" }]).mockResolvedValueOnce([]);
  const store = createStore("demo");
  await expect(store.claim("sending:o1", 600_000)).resolves.toBe(true);
  await expect(store.claim("sending:o1", 600_000)).resolves.toBe(false);
  const sql = (mockQueryRaw.mock.calls[0][0] as TemplateStringsArray).join("?");
  expect(sql).toContain('INSERT INTO "PluginData"');
  expect(sql).toContain("ON CONFLICT");
  expect(sql).toContain("RETURNING");
  expect(mockQueryRaw.mock.calls[0].slice(1)).toEqual(["demo", "", "", "sending:o1", 600_000]);
});

it("scopes record claims to the record", async () => {
  mockQueryRaw.mockResolvedValueOnce([{ key: "k" }]);
  await createStore("demo").forRecord("order", "o9").claim("k", 1000);
  expect(mockQueryRaw.mock.calls[0].slice(1)).toEqual(["demo", "order", "o9", "k", 1000]);
});

it("testing store: one caller wins until the claim expires", async () => {
  const ctx = createTestContext();
  const t0 = Date.now();
  const spy = jest.spyOn(Date, "now").mockReturnValue(t0);
  expect(await ctx.store.claim("x", 1000)).toBe(true);
  expect(await ctx.store.claim("x", 1000)).toBe(false);
  spy.mockReturnValue(t0 + 1001);
  expect(await ctx.store.claim("x", 1000)).toBe(true);
  await ctx.store.delete("x");
  expect(await ctx.store.claim("x", 1000)).toBe(true);
  spy.mockRestore();
});

it("testing store: parallel claims, exactly one wins", async () => {
  const ctx = createTestContext();
  const won = await Promise.all([ctx.store.claim("y", 1000), ctx.store.claim("y", 1000), ctx.store.claim("y", 1000)]);
  expect(won.filter(Boolean)).toHaveLength(1);
});
