jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/emails/InviteUser", () => ({ __esModule: true, default: jest.fn(() => null) }));
const send = jest.fn();
jest.mock("@/lib/resend", () => ({
  __esModule: true,
  default: jest.fn(async () => ({ emails: { send } })),
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { inviteUser } from "../invite-user";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const ff = prismadb.users.findFirst as jest.MockedFunction<typeof prismadb.users.findFirst>;
const create = prismadb.users.create as jest.MockedFunction<typeof prismadb.users.create>;

const input = { name: "New User", email: "new@example.com", language: "en" };

// requireRole reads the actor, then the action reads the inviter's name.
function asAdmin() {
  gs.mockResolvedValue({ user: { id: "a" } } as any);
  fu.mockResolvedValueOnce({ id: "a", role: "admin" } as any);
  fu.mockResolvedValueOnce({ name: "Admin" } as any);
}

beforeEach(() => jest.clearAllMocks());

describe("inviteUser", () => {
  it("returns Forbidden when not admin, and writes no audit row", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    const res = await inviteUser(input);
    expect(res).toEqual({ error: "Forbidden" });
    expect(create).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("records the invite as a created audit row naming the inviting admin", async () => {
    asAdmin();
    ff.mockResolvedValue(null);
    create.mockResolvedValue({ id: "new-1", name: "New User", email: "new@example.com" } as any);

    const res = await inviteUser(input);
    expect(res).toEqual({ data: expect.objectContaining({ id: "new-1" }) });
    expect(writeAuditLog).toHaveBeenCalledTimes(1);
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "user",
      entityId: "new-1",
      action: "created",
      changes: [{ field: "invitedBy", old: null, new: "a" }],
      userId: "a",
    });
  });

  it("keeps the audit row when the invite email fails, since the user exists", async () => {
    asAdmin();
    ff.mockResolvedValue(null);
    create.mockResolvedValue({ id: "new-1", name: "New User", email: "new@example.com" } as any);
    send.mockRejectedValueOnce(new Error("resend down"));

    const res = await inviteUser(input);
    expect(res).toEqual({ error: "Failed to invite user" });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "user", entityId: "new-1", action: "created", userId: "a" })
    );
  });

  it("writes no audit row when the user already exists", async () => {
    asAdmin();
    ff.mockResolvedValue({ id: "old" } as any);

    const res = await inviteUser(input);
    expect(res).toEqual({ error: "User already exists!" });
    expect(create).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });
});
