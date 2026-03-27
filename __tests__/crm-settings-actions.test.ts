// Jest runs in node environment — mock Prisma
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Industry_Type: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    crm_Contact_Types: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    crm_Lead_Sources: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    crm_Lead_Statuses: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    crm_Lead_Types: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    crm_Opportunities_Type: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    crm_Opportunities_Sales_Stages: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    crm_Contacts: { updateMany: jest.fn() },
    crm_Leads: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb as prisma } from "@/lib/prisma";
import {
  getConfigValues,
  createConfigValue,
  updateConfigValue,
  deleteConfigValue,
} from "@/app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("getConfigValues", () => {
  it("returns contact types with usageCount", async () => {
    (mockPrisma.crm_Contact_Types.findMany as jest.Mock).mockResolvedValue([
      { id: "1", name: "Customer", _count: { contacts: 5 } },
    ]);
    const result = await getConfigValues("contactType");
    expect(result).toEqual([{ id: "1", name: "Customer", usageCount: 5 }]);
  });

  it("returns lead statuses with usageCount", async () => {
    (mockPrisma.crm_Lead_Statuses.findMany as jest.Mock).mockResolvedValue([
      { id: "2", name: "New", _count: { leads: 3 } },
    ]);
    const result = await getConfigValues("leadStatus");
    expect(result).toEqual([{ id: "2", name: "New", usageCount: 3 }]);
  });
});

describe("createConfigValue", () => {
  it("creates a new contact type", async () => {
    (mockPrisma.crm_Contact_Types.create as jest.Mock).mockResolvedValue({});
    await createConfigValue("contactType", "Investor");
    expect(mockPrisma.crm_Contact_Types.create).toHaveBeenCalledWith({
      data: { name: "Investor" },
    });
  });

  it("rejects empty name", async () => {
    await expect(createConfigValue("contactType", "")).rejects.toThrow();
  });

  it("rejects name over 100 characters", async () => {
    await expect(createConfigValue("contactType", "x".repeat(101))).rejects.toThrow();
  });
});

describe("deleteConfigValue", () => {
  it("deletes directly when no replacement needed", async () => {
    (mockPrisma.crm_Contact_Types.delete as jest.Mock).mockResolvedValue({});
    await deleteConfigValue("contactType", "id-1");
    expect(mockPrisma.crm_Contact_Types.delete).toHaveBeenCalledWith({
      where: { id: "id-1" },
    });
  });

  it("reassigns and deletes in transaction when replacementId provided", async () => {
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([]);
    await deleteConfigValue("contactType", "id-1", "id-2");
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("rejects if replacementId equals id", async () => {
    await expect(deleteConfigValue("contactType", "id-1", "id-1")).rejects.toThrow();
  });
});
