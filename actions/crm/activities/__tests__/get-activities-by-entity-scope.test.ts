jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_ActivityLinks: { findMany: jest.fn() },
    crm_Activities: { findMany: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getActivitiesByEntity } from "../get-activities-by-entity";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const fa = (prismadb as any).crm_Accounts.findFirst as jest.Mock;
const linksFm = (prismadb as any).crm_ActivityLinks.findMany as jest.Mock;
const actsFm = (prismadb as any).crm_Activities.findMany as jest.Mock;

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => jest.clearAllMocks());

describe("getActivitiesByEntity entity-scope", () => {
  it("returns empty when unauthenticated and does not query activities", async () => {
    gs.mockResolvedValue(null as any);
    const r = await getActivitiesByEntity("account", ACCOUNT_ID);
    expect(r).toEqual({ data: [], nextCursor: null });
    expect(linksFm).not.toHaveBeenCalled();
    expect(actsFm).not.toHaveBeenCalled();
  });

  it("returns empty when user cannot read the entity", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fa.mockResolvedValue(null); // assertCanReadAccount throws
    const r = await getActivitiesByEntity("account", ACCOUNT_ID);
    expect(r).toEqual({ data: [], nextCursor: null });
    expect(linksFm).not.toHaveBeenCalled();
    expect(actsFm).not.toHaveBeenCalled();
  });

  it("returns activities when user can read the entity", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fa.mockResolvedValue({ id: ACCOUNT_ID });
    linksFm.mockResolvedValue([{ activityId: "a1" }]);
    const act = {
      id: "a1",
      type: "note",
      title: "t",
      description: null,
      date: new Date("2026-01-01"),
      duration: null,
      outcome: null,
      status: "completed",
      metadata: null,
      createdAt: new Date(),
      createdBy: null,
      created_by_user: null,
      links: [],
    };
    actsFm.mockResolvedValue([act]);
    const r = await getActivitiesByEntity("account", ACCOUNT_ID);
    expect(r.data).toHaveLength(1);
    expect(actsFm).toHaveBeenCalledTimes(1);
  });

  it("manager can read any entity activity feed", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    fa.mockResolvedValue({ id: ACCOUNT_ID });
    linksFm.mockResolvedValue([]);
    const r = await getActivitiesByEntity("account", ACCOUNT_ID);
    expect(r).toEqual({ data: [], nextCursor: null });
  });
});
