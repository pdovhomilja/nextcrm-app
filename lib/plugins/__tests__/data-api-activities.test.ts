const findMany = jest.fn(async (_args: unknown) => [{ id: "act-1" }]);
jest.mock("@/lib/prisma", () => ({ prismadb: { crm_Activities: { findMany: (a: unknown) => findMany(a) } } }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));

import { createDataApi } from "@/lib/plugins/data-api";
import { PluginPermissionError } from "@/lib/plugins/errors";
import { SDK_VERSION } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";

beforeEach(() => findMany.mockClear());

it("finds a record's activities through links, newest first, capped at 100", async () => {
  const api = createDataApi("demo", ["activities:read"]);
  const since = new Date("2026-10-01T00:00:00Z");
  await expect(api.activities.findForRecord("account", "acc-1", { types: ["visit", "meeting"], status: "completed", since, take: 500 }))
    .resolves.toEqual([{ id: "act-1" }]);
  expect(findMany).toHaveBeenCalledWith({
    where: { deletedAt: null, links: { some: { entityType: "account", entityId: "acc-1" } }, type: { in: ["visit", "meeting"] }, status: "completed", date: { gte: since } },
    orderBy: { date: "desc" },
    take: 100,
    skip: undefined,
  });
});

it("needs activities:read", async () => {
  const api = createDataApi("demo", []);
  await expect(api.activities.findForRecord("account", "acc-1")).rejects.toBeInstanceOf(PluginPermissionError);
});

it("bumps the SDK to 0.1.1", () => expect(SDK_VERSION).toBe("0.1.1"));

it("test context filters activities by link, type, status and date", async () => {
  const ctx = createTestContext({ data: { activities: [
    { id: "a1", type: "visit", status: "completed", date: "2026-10-05T10:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] },
    { id: "a2", type: "note", status: "completed", date: "2026-10-06T10:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] },
    { id: "a3", type: "visit", status: "completed", date: "2026-10-07T10:00:00Z", links: [{ entityType: "account", entityId: "acc-2" }] },
    { id: "a4", type: "visit", status: "completed", date: "2026-09-01T10:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] },
  ] } });
  const rows = await ctx.data.activities.findForRecord("account", "acc-1", { types: ["visit"], status: "completed", since: new Date("2026-10-01T00:00:00Z") });
  expect(rows.map((r) => r.id)).toEqual(["a1"]);
});
