jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Report_Config: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), update: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { saveConfig, loadConfigs, deleteConfig, duplicateConfig, toggleShare } from "@/actions/reports/config";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("report config scope", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("unauthenticated", () => {
    beforeEach(() => {
      (getSession as jest.Mock).mockResolvedValue(null);
    });

    it.each([
      ["saveConfig", () => saveConfig({ name: "x", category: "sales", filters: {}, isShared: false })],
      ["loadConfigs", () => loadConfigs("sales")],
      ["deleteConfig", () => deleteConfig("c1")],
      ["duplicateConfig", () => duplicateConfig("c1", "n")],
      ["toggleShare", () => toggleShare("c1", true)],
    ])("rejects %s when no session", async (_name, fn) => {
      await expect(fn()).rejects.toThrow();
    });
  });

  describe("loadConfigs", () => {
    it("user sees own + shared filter", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findMany as jest.Mock).mockResolvedValue([]);
      await loadConfigs("sales");
      expect(prismadb.crm_Report_Config.findMany).toHaveBeenCalledWith({
        where: { category: "sales", OR: [{ createdBy: "u1" }, { isShared: true }] },
        orderBy: { createdAt: "desc" },
      });
    });

    it("manager sees all in category", async () => {
      mockUser("manager", "m1");
      (prismadb.crm_Report_Config.findMany as jest.Mock).mockResolvedValue([]);
      await loadConfigs("sales");
      expect(prismadb.crm_Report_Config.findMany).toHaveBeenCalledWith({
        where: { category: "sales" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("admin sees all in category", async () => {
      mockUser("admin", "a1");
      (prismadb.crm_Report_Config.findMany as jest.Mock).mockResolvedValue([]);
      await loadConfigs("sales");
      expect(prismadb.crm_Report_Config.findMany).toHaveBeenCalledWith({
        where: { category: "sales" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("saveConfig", () => {
    it("forces createdBy = session user.id (ignores caller-supplied)", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.create as jest.Mock).mockResolvedValue({});
      await saveConfig({ name: "x", category: "sales", filters: {}, isShared: false });
      expect(prismadb.crm_Report_Config.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ createdBy: "u1" }),
      });
    });
  });

  describe("deleteConfig", () => {
    it("user can delete own config", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u1" });
      (prismadb.crm_Report_Config.delete as jest.Mock).mockResolvedValue({});
      await deleteConfig("c1");
      expect(prismadb.crm_Report_Config.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    });

    it("user cannot delete other user's config", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u2" });
      await expect(deleteConfig("c1")).rejects.toThrow(/Forbidden/i);
      expect(prismadb.crm_Report_Config.delete).not.toHaveBeenCalled();
    });

    it("throws Not found when missing", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(deleteConfig("c1")).rejects.toThrow(/Not found/i);
    });

    it("manager can delete others' configs", async () => {
      mockUser("manager", "m1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u2" });
      (prismadb.crm_Report_Config.delete as jest.Mock).mockResolvedValue({});
      await deleteConfig("c1");
      expect(prismadb.crm_Report_Config.delete).toHaveBeenCalled();
    });

    it("admin can delete others' configs", async () => {
      mockUser("admin", "a1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u2" });
      (prismadb.crm_Report_Config.delete as jest.Mock).mockResolvedValue({});
      await deleteConfig("c1");
      expect(prismadb.crm_Report_Config.delete).toHaveBeenCalled();
    });
  });

  describe("toggleShare", () => {
    it("user cannot toggle other user's config", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u2" });
      await expect(toggleShare("c1", true)).rejects.toThrow(/Forbidden/i);
    });
  });

  describe("duplicateConfig", () => {
    it("user can duplicate shared config (read access)", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u2", isShared: true, category: "sales", filters: {} });
      (prismadb.crm_Report_Config.create as jest.Mock).mockResolvedValue({});
      await duplicateConfig("c1", "copy");
      expect(prismadb.crm_Report_Config.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ createdBy: "u1", isShared: false }),
      });
    });

    it("user cannot duplicate other user's private config", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u2", isShared: false, category: "sales", filters: {} });
      await expect(duplicateConfig("c1", "copy")).rejects.toThrow(/Forbidden/i);
    });
  });
});
