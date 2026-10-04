import { definePlugin, z } from "@nextcrm/plugin-sdk";

const pluginData = new Map<string, unknown>();
jest.mock("@/lib/prisma-base", () => ({
  prismaBase: {
    pluginLog: { create: jest.fn().mockResolvedValue({}) },
    pluginData: {
      findUnique: jest.fn(async ({ where }: any) => {
        const k = JSON.stringify(where.pluginId_entityType_entityId_key);
        return pluginData.has(k) ? { value: pluginData.get(k) } : null;
      }),
      upsert: jest.fn(async ({ where, create }: any) => { pluginData.set(JSON.stringify(where.pluginId_entityType_entityId_key), create.value); }),
      deleteMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));
jest.mock("@/lib/plugins/state", () => ({ getPluginState: jest.fn(async () => ({ id: "demo", settings: { days: "x" }, secrets: null })) }));
jest.mock("@/lib/email-crypto", () => ({ encrypt: (s: string) => s, decrypt: (s: string) => s }));
jest.mock("@/lib/net/host-guard", () => ({ assertPublicHost: jest.fn() }));
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/lib/plugins/i18n", () => ({ translatePluginMessage: (_p: string, k: string) => k }));

import { createPluginContext } from "@/lib/plugins/context";
import { PluginPermissionError } from "@/lib/plugins/errors";

const plugin = {
  source: "public" as const, messages: {},
  definition: definePlugin({
    id: "demo", name: "Demo", version: "1.0.0", sdk: "^0.1.0", description: "", permissions: ["accounts:read"],
    settings: z.object({ days: z.number().default(90) }), extensions: () => {},
  }),
};

it("parses settings with fallback and scopes the store per record", async () => {
  const ctx = await createPluginContext({ plugin, actor: { type: "system" } });
  expect(ctx.settings).toEqual({ days: 90 });
  await ctx.store.forRecord("account", "a1").set("until", "2027-01-01");
  expect(await ctx.store.forRecord("account", "a1").get("until")).toBe("2027-01-01");
  expect(await ctx.store.forRecord("account", "a2").get("until")).toBeNull();
  expect(await ctx.store.get("until")).toBeNull();
});

it("enforces permissions", async () => {
  const ctx = await createPluginContext({ plugin, actor: { type: "system" } });
  await expect(ctx.data.accounts.update("a1", { name: "x" })).rejects.toBeInstanceOf(PluginPermissionError);
  expect(() => ctx.http.fetch("https://example.com")).toThrow(PluginPermissionError);
  await expect(ctx.notify({ roles: ["manager"], subject: "s", text: "t" })).rejects.toBeInstanceOf(PluginPermissionError);
});

it("rejects oversized store values", async () => {
  const ctx = await createPluginContext({ plugin, actor: { type: "system" } });
  await expect(ctx.store.set("big", "x".repeat(256 * 1024 + 1))).rejects.toThrow("exceeds 256 KB");
});
