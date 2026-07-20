jest.mock("@/lib/authz", () => {
  class AuthorizationError extends Error {}
  return {
    requireRole: jest.fn(),
    AuthorizationError,
  };
});
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    systemServices: {
      create: jest.fn().mockResolvedValue({ id: "svc-1" }),
      update: jest.fn().mockResolvedValue({ id: "svc-1" }),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { setResendKey } from "@/actions/admin/system/set-resend-key";

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => jest.clearAllMocks());

describe("setResendKey authorization", () => {
  it("does not write the credential when the caller is not an admin", async () => {
    mockRequireRole.mockRejectedValue(new AuthorizationError());

    await expect(
      setResendKey(form({ id: "svc-1", serviceKey: "attacker-key" }))
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(mockRequireRole).toHaveBeenCalledWith(["admin"]);
    expect(prismadb.systemServices.update).not.toHaveBeenCalled();
    expect(prismadb.systemServices.create).not.toHaveBeenCalled();
  });

  it("updates the existing row for an admin", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);

    await setResendKey(form({ id: "svc-1", serviceKey: "new-key" }));

    expect(prismadb.systemServices.update).toHaveBeenCalledWith({
      where: { id: "svc-1" },
      data: { serviceKey: "new-key" },
    });
    expect(prismadb.systemServices.create).not.toHaveBeenCalled();
  });

  it("creates a row for an admin when no id is present", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);

    await setResendKey(form({ id: "", serviceKey: "first-key" }));

    expect(prismadb.systemServices.create).toHaveBeenCalledWith({
      data: { v: 0, name: "resend_smtp", serviceKey: "first-key" },
    });
    expect(prismadb.systemServices.update).not.toHaveBeenCalled();
  });
});
