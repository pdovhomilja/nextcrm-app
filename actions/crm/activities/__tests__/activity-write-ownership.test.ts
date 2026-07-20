jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/crm/calendar/outbound-emit", () => ({
  emitCalendarOutbound: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Activities: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    crm_ActivityLinks: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { emitCalendarOutbound } from "@/lib/crm/calendar/outbound-emit";
import { updateActivity } from "../update-activity";
import { deleteActivity } from "../delete-activity";

const gs = getSession as jest.Mock;
const findUser = prismadb.users.findUnique as jest.Mock;
const findActivity = (prismadb as any).crm_Activities.findFirst as jest.Mock;
const updateActivityRow = (prismadb as any).crm_Activities.update as jest.Mock;
const findFullActivity = (prismadb as any).crm_Activities.findUnique as jest.Mock;
const findLinks = (prismadb as any).crm_ActivityLinks.findMany as jest.Mock;
const transaction = (prismadb as any).$transaction as jest.Mock;
const emit = emitCalendarOutbound as jest.Mock;

const ACTIVITY_ID = "22222222-2222-4222-8222-222222222222";

function signedInAs(id: string, role: "user" | "manager" | "admin" = "user") {
  gs.mockResolvedValue({ user: { id } });
  findUser.mockResolvedValue({ id, role });
}

beforeEach(() => {
  jest.clearAllMocks();
  findLinks.mockResolvedValue([]);
  updateActivityRow.mockResolvedValue({ id: ACTIVITY_ID, type: "meeting", deletedAt: new Date() });
  findFullActivity.mockResolvedValue({ id: ACTIVITY_ID, links: [] });
  // updateActivity runs its write inside $transaction — execute the callback
  // against the same mocked client.
  transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn(prismadb)
  );
});

// These writers push meeting changes to the owner's Google Calendar with
// sendUpdates:"all", so an unauthorized mutation mails a real customer. Both
// used to authorize on session presence alone.
describe("updateActivity ownership", () => {
  it("rejects an unauthenticated caller", async () => {
    gs.mockResolvedValue(null);
    expect(await updateActivity({ id: ACTIVITY_ID, title: "x" })).toEqual({
      error: "Unauthorized",
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("rejects a user who does not own the activity, without writing or emailing", async () => {
    signedInAs("attacker");
    findActivity.mockResolvedValue({ createdBy: "owner" });
    expect(await updateActivity({ id: ACTIVITY_ID, title: "hijacked" })).toEqual({
      error: "Forbidden",
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("rejects when the activity does not exist (no id enumeration)", async () => {
    signedInAs("someone");
    findActivity.mockResolvedValue(null);
    expect(await updateActivity({ id: ACTIVITY_ID, title: "x" })).toEqual({
      error: "Forbidden",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("allows the owner", async () => {
    signedInAs("owner");
    findActivity.mockResolvedValue({ createdBy: "owner" });
    const res = await updateActivity({ id: ACTIVITY_ID, title: "ok" });
    expect(res).toEqual({ data: { id: ACTIVITY_ID, links: [] } });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateActivityRow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ACTIVITY_ID },
        data: expect.objectContaining({ title: "ok", updatedBy: "owner" }),
      })
    );
  });

  it("allows a manager on someone else's activity", async () => {
    signedInAs("boss", "manager");
    findActivity.mockResolvedValue({ createdBy: "owner" });
    expect(await updateActivity({ id: ACTIVITY_ID, title: "ok" })).toEqual({
      data: { id: ACTIVITY_ID, links: [] },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

describe("deleteActivity ownership", () => {
  it("rejects an unauthenticated caller", async () => {
    gs.mockResolvedValue(null);
    expect(await deleteActivity(ACTIVITY_ID)).toEqual({ error: "Unauthorized" });
    expect(updateActivityRow).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("rejects a user who does not own the activity, without cancelling the Google event", async () => {
    signedInAs("attacker");
    findActivity.mockResolvedValue({ createdBy: "owner" });
    expect(await deleteActivity(ACTIVITY_ID)).toEqual({ error: "Forbidden" });
    expect(updateActivityRow).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("allows the owner and still emits the outbound cancel", async () => {
    signedInAs("owner");
    findActivity.mockResolvedValue({ createdBy: "owner" });
    expect(await deleteActivity(ACTIVITY_ID)).toEqual({ success: true });
    expect(updateActivityRow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ACTIVITY_ID },
        data: expect.objectContaining({ deletedBy: "owner" }),
      })
    );
    expect(emit).toHaveBeenCalledWith(ACTIVITY_ID, "cancel");
  });

  it("allows an admin on someone else's activity", async () => {
    signedInAs("root", "admin");
    findActivity.mockResolvedValue({ createdBy: "owner" });
    expect(await deleteActivity(ACTIVITY_ID)).toEqual({ success: true });
  });
});
