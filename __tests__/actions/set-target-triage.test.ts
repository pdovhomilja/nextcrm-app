jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/lib/audit-log", () => ({
  writeAuditLog: jest.fn(),
  diffObjects: jest.requireActual("@/lib/audit-log").diffObjects,
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit-log";
import { setTargetTriage } from "@/actions/crm/targets/set-target-triage";

const TARGET_ID = "11111111-1111-1111-1111-111111111111";

describe("setTargetTriage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "u1", role: "admin" });
    (assertCanWriteTarget as jest.Mock).mockResolvedValue(undefined);
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
      id: TARGET_ID,
      triage_status: "NEW",
      pass_reason: null,
      pass_note: null,
      revisit_at: null,
    });
    (prismadb.crm_Targets.update as jest.Mock).mockImplementation(({ data }: any) => ({
      id: TARGET_ID,
      ...data,
    }));
  });

  it("approving sets APPROVED, stamps triaged_by/at, and clears any prior pass fields", async () => {
    await setTargetTriage({ id: TARGET_ID, status: "APPROVED" });

    const data = (prismadb.crm_Targets.update as jest.Mock).mock.calls[0][0].data;
    expect(data.triage_status).toBe("APPROVED");
    expect(data.triaged_by).toBe("u1");
    expect(data.triaged_at).toEqual(expect.any(Date));
    expect(data.pass_reason).toBeNull();
    expect(data.pass_note).toBeNull();
    expect(data.revisit_at).toBeNull();
  });

  it("passing stores the reason, note, and revisit date", async () => {
    const revisit = new Date("2027-03-01T00:00:00.000Z");
    await setTargetTriage({
      id: TARGET_ID,
      status: "PASSED",
      pass_reason: "SCOPE_TOO_LARGE",
      pass_note: "Too many pages to redo right now",
      revisit_at: revisit,
    });

    const data = (prismadb.crm_Targets.update as jest.Mock).mock.calls[0][0].data;
    expect(data.triage_status).toBe("PASSED");
    expect(data.pass_reason).toBe("SCOPE_TOO_LARGE");
    expect(data.pass_note).toBe("Too many pages to redo right now");
    expect(data.revisit_at).toEqual(revisit);
    expect(data.triaged_by).toBe("u1");
  });

  it("rejects a PASSED decision with no reason and does not write", async () => {
    const result = await setTargetTriage({ id: TARGET_ID, status: "PASSED" });

    expect(result).toEqual({ error: expect.stringMatching(/reason/i) });
    expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
  });

  it("returns Unauthorized when not authenticated", async () => {
    (requireAuthenticated as jest.Mock).mockRejectedValue(new AuthenticationError());
    const result = await setTargetTriage({ id: TARGET_ID, status: "APPROVED" });
    expect(result).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
  });

  it("returns Forbidden when the caller cannot write the target", async () => {
    (assertCanWriteTarget as jest.Mock).mockRejectedValue(new AuthorizationError());
    const result = await setTargetTriage({ id: TARGET_ID, status: "APPROVED" });
    expect(result).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
  });

  it("writes a target audit-log entry on success", async () => {
    await setTargetTriage({ id: TARGET_ID, status: "APPROVED" });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "target",
        entityId: TARGET_ID,
        action: "updated",
        userId: "u1",
      })
    );
  });
});
