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
import { decrypt } from "@/lib/email-crypto";

const ORIGINAL_KEY = process.env.EMAIL_ENCRYPTION_KEY;
beforeAll(() => {
  process.env.EMAIL_ENCRYPTION_KEY = "b".repeat(64);
});
afterAll(() => {
  process.env.EMAIL_ENCRYPTION_KEY = ORIGINAL_KEY;
});

function storedKey(call: any): string {
  const value: string = call.data.serviceKey;
  expect(value.startsWith("enc:")).toBe(true);
  return decrypt(value.slice(4));
}

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

    const call = (prismadb.systemServices.update as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ id: "svc-1" });
    expect(call.data.serviceKey).not.toContain("new-key");
    expect(storedKey(call)).toBe("new-key");
    expect(prismadb.systemServices.create).not.toHaveBeenCalled();
  });

  it("creates a row for an admin when no id is present", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);

    await setResendKey(form({ id: "", serviceKey: "first-key" }));

    const call = (prismadb.systemServices.create as jest.Mock).mock.calls[0][0];
    expect(call.data).toMatchObject({ v: 0, name: "resend_smtp" });
    expect(storedKey(call)).toBe("first-key");
    expect(prismadb.systemServices.update).not.toHaveBeenCalled();
  });
});
