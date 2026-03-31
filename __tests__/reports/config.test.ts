jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Report_Config: { create: jest.fn(), findMany: jest.fn(), delete: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

import { prismadb } from "@/lib/prisma";
import { saveConfig, loadConfigs, deleteConfig, duplicateConfig, toggleShare } from "@/actions/reports/config";

describe("report config actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getServerSession } = require("next-auth");
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1", email: "test@example.com" } });
  });

  describe("saveConfig", () => {
    it("creates a new config", async () => {
      const mockConfig = { id: "config-1", name: "Q1 Sales", category: "sales", filters: {}, isShared: false, createdBy: "user-1" };
      (prismadb.crm_Report_Config.create as jest.Mock).mockResolvedValue(mockConfig);
      const result = await saveConfig({ name: "Q1 Sales", category: "sales", filters: {}, isShared: false });
      expect(prismadb.crm_Report_Config.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: "Q1 Sales", category: "sales", createdBy: "user-1" }) });
      expect(result).toEqual(mockConfig);
    });
  });

  describe("loadConfigs", () => {
    it("returns own and shared configs for category", async () => {
      const configs = [{ id: "1", name: "My Report" }, { id: "2", name: "Team Report" }];
      (prismadb.crm_Report_Config.findMany as jest.Mock).mockResolvedValue(configs);
      const result = await loadConfigs("sales");
      expect(prismadb.crm_Report_Config.findMany).toHaveBeenCalledWith({
        where: { category: "sales", OR: [{ createdBy: "user-1" }, { isShared: true }] },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(configs);
    });
  });

  describe("deleteConfig", () => {
    it("deletes config owned by user", async () => {
      (prismadb.crm_Report_Config.delete as jest.Mock).mockResolvedValue({});
      await deleteConfig("config-1");
      expect(prismadb.crm_Report_Config.delete).toHaveBeenCalledWith({ where: { id: "config-1", createdBy: "user-1" } });
    });
  });

  describe("toggleShare", () => {
    it("toggles isShared flag", async () => {
      (prismadb.crm_Report_Config.update as jest.Mock).mockResolvedValue({ isShared: true });
      await toggleShare("config-1", true);
      expect(prismadb.crm_Report_Config.update).toHaveBeenCalledWith({ where: { id: "config-1", createdBy: "user-1" }, data: { isShared: true } });
    });
  });
});
