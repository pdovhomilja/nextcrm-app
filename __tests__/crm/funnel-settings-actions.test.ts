jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(),
  AuthorizationError: class AuthorizationError extends Error {},
  AuthenticationError: class AuthenticationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_FunnelSettings: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { DEFAULT_FUNNEL_SETTINGS } from "@/lib/crm/funnel-timers";
import { updateFunnelSettings } from "@/app/[locale]/(routes)/admin/funnel-settings/_actions/funnel-settings";

describe("updateFunnelSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({ id: "admin1", role: "admin" });
  });

  it("creates the singleton row on first save", async () => {
    (prismadb.crm_FunnelSettings.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_FunnelSettings.create as jest.Mock).mockResolvedValue({});
    const res = await updateFunnelSettings({ ...DEFAULT_FUNNEL_SETTINGS, killAfterDays: 30 });
    expect(res).toEqual({});
    const data = (prismadb.crm_FunnelSettings.create as jest.Mock).mock.calls[0][0].data;
    expect(data.kill_after_days).toBe(30);
    expect(data.recycle_after_days).toBe(90);
    expect(data.updatedBy).toBe("admin1");
  });

  it("updates the existing singleton row", async () => {
    (prismadb.crm_FunnelSettings.findFirst as jest.Mock).mockResolvedValue({ id: "row1" });
    (prismadb.crm_FunnelSettings.update as jest.Mock).mockResolvedValue({});
    await updateFunnelSettings({ ...DEFAULT_FUNNEL_SETTINGS, renewalWindowDays: 14 });
    const call = (prismadb.crm_FunnelSettings.update as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ id: "row1" });
    expect(call.data.renewal_window_days).toBe(14);
  });

  it("rejects out-of-range values", async () => {
    const res = await updateFunnelSettings({ ...DEFAULT_FUNNEL_SETTINGS, killAfterDays: 0 });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_FunnelSettings.create).not.toHaveBeenCalled();
  });

  it("returns error for non-admins", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    (requireRole as jest.Mock).mockRejectedValue(new AuthorizationError());
    const res = await updateFunnelSettings(DEFAULT_FUNNEL_SETTINGS);
    expect(res.error).toBeDefined();
  });
});
