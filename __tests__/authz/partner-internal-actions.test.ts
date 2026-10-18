/**
 * Partners are refused by default (partner-role spec, ticket 4). A server
 * action can be called by its id from any page, so proxy.ts cannot stop it;
 * instead getSession() and requireAuthenticated() refuse a partner unless the
 * call site opts in with { partner: true }. Here the real getSession() runs
 * (only better-auth and the database are stood in for), and actions that were
 * authorized by "signed in" alone refuse a partner without reading or writing.
 */
const mockCalls: string[] = [];
jest.mock("@/lib/prisma", () => {
  const model = (modelName: string) =>
    new Proxy({} as Record<string, jest.Mock>, {
      get: (target, name: string) =>
        (target[name] ??= jest.fn(async () => {
          if (modelName === "users" && name === "findUnique") return { id: "p1", role: "partner" };
          mockCalls.push(`${modelName}.${name}`);
          if (name === "count") return 0;
          if (name.startsWith("findMany") || name === "createManyAndReturn") return [];
          return { id: "row-1" };
        })),
    });
  const models: Record<string, unknown> = {};
  return { prismadb: new Proxy(models, { get: (t, n: string) => (t[n] ??= model(n)) }) };
});
jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: jest.fn(async () => ({ user: { id: "p1", role: "partner", userStatus: "ACTIVE" } })) } },
}));
jest.mock("next/headers", () => ({ headers: jest.fn(async () => new Headers()) }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { getPriceLists, getPriceList, getPriceListOptions } from "@/actions/crm/price-lists/queries";
import { getProductsFull } from "@/actions/crm/products/get-products";
import { getProductOptions, getOrderFormData } from "@/actions/crm/orders/queries";
import { getUserById } from "@/actions/user/get-user-by-id";
import { createTemplate } from "@/actions/campaigns/templates/create-template";
import { createTarget } from "@/actions/crm/targets/create-target";
import { createProject } from "@/actions/projects/create-project";

const calls: [string, () => Promise<unknown>][] = [
  ["getPriceLists", () => getPriceLists()],
  ["getPriceList", () => getPriceList("pl-1")],
  ["getPriceListOptions", () => getPriceListOptions()],
  ["getProductsFull", () => getProductsFull()],
  ["getProductOptions", () => getProductOptions()],
  ["getOrderFormData", () => getOrderFormData("acc-1")],
  ["getUserById (another user)", () => getUserById("u-2")],
  ["createTemplate", () => createTemplate({ name: "T", content_html: "<p/>", content_json: {} })],
  ["createTarget", () => createTarget({ last_name: "Novák", email: "n@example.com" })],
  ["createProject", () => createProject({ title: "P", description: "D", visibility: "private" })],
];

beforeEach(() => (mockCalls.length = 0));

it.each(calls)("%s refuses a partner without touching the database", async (_name, call) => {
  const result = await call().catch((e: Error) => ({ thrown: e.message }));
  expect(mockCalls).toEqual([]);
  expect(JSON.stringify(result ?? null)).toMatch(/Unauthori[sz]ed|Unauthenticated|null|^\[\]$/);
});
