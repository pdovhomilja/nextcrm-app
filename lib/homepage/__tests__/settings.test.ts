jest.mock("@/lib/prisma", () => ({ prismadb: { crm_SystemSettings: { findMany: jest.fn() } } }));
import { prismadb } from "@/lib/prisma";
import { resolveModel, clampMaxTokens, getHomepageSettings, DEFAULT_HOMEPAGE_MODEL, DEFAULT_MAX_TOKENS, MAX_TOKENS_FLOOR } from "@/lib/homepage/settings";
const rows = (o: Record<string,string>) => (prismadb.crm_SystemSettings.findMany as jest.Mock)
  .mockResolvedValue(Object.entries(o).map(([key,value])=>({key,value})));
beforeEach(() => jest.clearAllMocks());

it("resolveModel: known passes, unknown/blank -> default", () => {
  expect(resolveModel("claude-opus-5-5")).toBe("claude-opus-5-5");
  expect(resolveModel("gpt-4")).toBe(DEFAULT_HOMEPAGE_MODEL);
  expect(resolveModel(null)).toBe(DEFAULT_HOMEPAGE_MODEL);
});
it("clampMaxTokens: clamps to [floor, model ceiling]", () => {
  expect(clampMaxTokens("claude-sonnet-5-5", 999)).toBe(MAX_TOKENS_FLOOR);
  expect(clampMaxTokens("claude-sonnet-5-5", 10_000_000)).toBe(64000);
  expect(clampMaxTokens("claude-sonnet-5-5", 20000)).toBe(20000);
  expect(clampMaxTokens("claude-haiku-4-5-20251001", 10_000_000)).toBe(32000);
});
it("clampMaxTokens: NaN falls back to default then clamps", () => {
  expect(clampMaxTokens("claude-sonnet-5-5", NaN)).toBe(DEFAULT_MAX_TOKENS);
  expect(clampMaxTokens("claude-haiku-4-5-20251001", NaN)).toBe(DEFAULT_MAX_TOKENS);
});
it("getHomepageSettings: defaults when unset", async () => {
  rows({});
  expect(await getHomepageSettings()).toEqual({ model: DEFAULT_HOMEPAGE_MODEL, maxTokens: DEFAULT_MAX_TOKENS, basePromptId: null });
});
it("getHomepageSettings: reads + clamps stored values", async () => {
  rows({ "homepage.model":"claude-opus-5-5", "homepage.max_tokens":"999", "homepage.base_prompt_id":"p1" });
  const s = await getHomepageSettings();
  expect(s.model).toBe("claude-opus-5-5");
  expect(s.maxTokens).toBe(MAX_TOKENS_FLOOR);
  expect(s.basePromptId).toBe("p1");
});
it("getHomepageSettings: bad max_tokens falls back to default", async () => {
  rows({ "homepage.max_tokens":"abc" });
  expect((await getHomepageSettings()).maxTokens).toBe(DEFAULT_MAX_TOKENS);
});
