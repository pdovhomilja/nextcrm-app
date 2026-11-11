// Every MCP tool that pages with limit/offset must sort by a total order, or
// rows tied on the sort column (a bulk import shares one createdAt) can repeat
// or go missing between pages. PR #444 fixed crm_list_products; this covers
// the rest and fails when a new paged tool is added without an entry here.

jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

// Any prismadb delegate/method: findMany -> [], count -> 0, single reads -> a
// stub row. The delegates are cached so a test can swap in an implementation.
jest.mock("@/lib/prisma", () => {
  const delegates: Record<string, Record<string, jest.Mock>> = {};
  const result = (method: string) =>
    method === "findMany"
      ? []
      : method === "count"
        ? 0
        : { id: "x", targets: [], _count: {}, assigned_section: { board_relation: { id: "x" } } };
  const delegate = (name: string) =>
    (delegates[name] ??= new Proxy({} as Record<string, jest.Mock>, {
      get: (target, method: string) =>
        (target[method] ??= jest.fn(async () => result(method))),
    }));
  return {
    prismadb: new Proxy({}, { get: (_t, name: string) => delegate(name) }),
  };
});

import { prismadb } from "@/lib/prisma";
import { allTools } from "@/lib/mcp/tools";
import { tiedRowsFindMany } from "./tied-rows-find-many";

const ADMIN = { id: "a1", role: "admin" as const };
const UUID = "00000000-0000-4000-8000-000000000001";

// tool -> [prisma delegate, orderBy it must page with]
const expected: Record<string, [string, unknown]> = {
  crm_list_accounts: ["crm_Accounts", [{ createdAt: "desc" }, { id: "desc" }]],
  crm_search_accounts: ["crm_Accounts", [{ createdAt: "desc" }, { id: "desc" }]],
  crm_list_contacts: ["crm_Contacts", [{ created_on: "desc" }, { id: "desc" }]],
  crm_search_contacts: ["crm_Contacts", [{ created_on: "desc" }, { id: "desc" }]],
  crm_list_leads: ["crm_Leads", [{ createdAt: "desc" }, { id: "desc" }]],
  crm_search_leads: ["crm_Leads", [{ createdAt: "desc" }, { id: "desc" }]],
  crm_list_opportunities: ["crm_Opportunities", [{ createdAt: "desc" }, { id: "desc" }]],
  crm_search_opportunities: ["crm_Opportunities", [{ createdAt: "desc" }, { id: "desc" }]],
  crm_list_targets: ["crm_Targets", [{ created_on: "desc" }, { id: "desc" }]],
  crm_search_targets: ["crm_Targets", [{ created_on: "desc" }, { id: "desc" }]],
  crm_list_products: ["crm_Products", [{ createdAt: "desc" }, { id: "desc" }]],
  crm_list_price_lists: ["crm_PriceLists", [{ name: "asc" }, { id: "asc" }]],
  crm_list_orders: ["crm_Orders", [{ createdAt: "desc" }, { id: "desc" }]],
  crm_list_users: ["users", [{ name: "asc" }, { id: "asc" }]],
  crm_list_contracts: ["crm_Contracts", [{ createdAt: "desc" }, { id: "desc" }]],
  crm_list_activities: ["crm_Activities", [{ date: "desc" }, { id: "desc" }]],
  crm_list_documents: ["documents", [{ createdAt: "desc" }, { id: "desc" }]],
  crm_list_target_lists: ["crm_TargetLists", [{ created_on: "desc" }, { id: "desc" }]],
  crm_list_email_accounts: ["emailAccount", [{ createdAt: "desc" }, { id: "desc" }]],
  campaigns_list: ["crm_campaigns", [{ created_on: "desc" }, { id: "desc" }]],
  campaigns_list_templates: ["crm_campaign_templates", [{ created_on: "desc" }, { id: "desc" }]],
  projects_list_boards: ["boards", [{ createdAt: "desc" }, { id: "desc" }]],
  projects_list_tasks: ["tasks", [{ createdAt: "desc" }, { id: "desc" }]],
  projects_list_comments: ["tasksComments", [{ createdAt: "desc" }, { id: "desc" }]],
  reports_list: ["crm_Report_Config", [{ createdAt: "desc" }, { id: "desc" }]],
};

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const tool = (name: string) => allTools.find((t) => t.name === name)!;
const call = (name: string, args: object) =>
  (tool(name).handler as any)(
    { query: "x", id: UUID, task: UUID, limit: 100, offset: 0, ...args },
    ADMIN.id,
    ADMIN
  );

beforeEach(() => jest.clearAllMocks());

it("every tool with an offset argument is listed here", () => {
  const paged = allTools
    .filter((t) => "offset" in (t.schema as any).shape)
    .map((t) => t.name)
    .sort();
  // crm_get_target_list pages its members; checked separately below.
  expect(paged).toEqual(
    [...Object.keys(expected), "crm_get_target_list"].sort()
  );
});

it.each(Object.entries(expected))(
  "%s pages with a total order (id last)",
  async (name, [delegate, orderBy]) => {
    await call(name, {});
    const paged = db[delegate].findMany.mock.calls.find(
      ([args]) => args?.skip !== undefined
    );
    expect(paged?.[0].orderBy).toEqual(orderBy);
  }
);

it("crm_get_target_list pages its members by target_id", async () => {
  await call("crm_get_target_list", {});
  const [args] = db.crm_TargetLists.findFirst.mock.calls[0];
  expect(args.include.targets.orderBy).toEqual({ target_id: "asc" });
});

it("paging over contacts with the same created_on returns each contact exactly once", async () => {
  const importedOn = new Date("2026-10-30T12:00:00.000Z");
  const contacts = Array.from({ length: 250 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    created_on: importedOn,
  }));
  db.crm_Contacts.findMany.mockImplementation(tiedRowsFindMany(contacts));
  db.crm_Contacts.count.mockResolvedValue(contacts.length);

  const seen: string[] = [];
  for (let offset = 0; offset < contacts.length; offset += 100) {
    const res = await call("crm_list_contacts", { offset });
    seen.push(...res.data.map((c: { id: string }) => c.id));
  }

  expect(seen).toHaveLength(250);
  expect(new Set(seen).size).toBe(250);
});
