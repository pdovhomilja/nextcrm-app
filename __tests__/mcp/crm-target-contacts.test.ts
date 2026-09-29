jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
    crm_Target_Contact: { create: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { crmTargetContactTools } from "@/lib/mcp/tools/crm-target-contacts";

const USER = "u1";
const TARGET_ID = "11111111-1111-1111-1111-111111111111";

const run = (name: string, args: any, userId = USER) => {
  const t = crmTargetContactTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return (t.handler as any)(args, userId);
};

beforeEach(() => {
  jest.clearAllMocks();
  (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({ id: TARGET_ID, created_by: USER });
  (prismadb.crm_Target_Contact.create as jest.Mock).mockImplementation(({ data }: any) => ({ id: "c1", ...data }));
});

describe("crm_create_target_contact", () => {
  it("creates a manual target contact scoped to an owned target", async () => {
    await run("crm_create_target_contact", {
      target_id: TARGET_ID,
      name: "Mike Bryant",
      email: "mike@mikebryanthvac.com",
      title: "Owner",
      phone: "+1 913 555 0100",
      linkedin_url: "https://linkedin.com/in/mikebryant",
    });
    const data = (prismadb.crm_Target_Contact.create as jest.Mock).mock.calls[0][0].data;
    expect(data.targetId).toBe(TARGET_ID);
    expect(data.name).toBe("Mike Bryant");
    expect(data.email).toBe("mike@mikebryanthvac.com");
    expect(data.title).toBe("Owner");
    expect(data.phone).toBe("+1 913 555 0100");
    expect(data.linkedinUrl).toBe("https://linkedin.com/in/mikebryant");
    expect(data.source).toBe("manual");
  });

  it("requires at least a name or an email", async () => {
    await expect(
      run("crm_create_target_contact", { target_id: TARGET_ID, phone: "x" })
    ).rejects.toThrow(/name or email/i);
    expect(prismadb.crm_Target_Contact.create).not.toHaveBeenCalled();
  });

  it("surfaces NOT_FOUND for a target the caller does not own", async () => {
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      run("crm_create_target_contact", { target_id: TARGET_ID, name: "X" })
    ).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_Target_Contact.create).not.toHaveBeenCalled();
  });
});
