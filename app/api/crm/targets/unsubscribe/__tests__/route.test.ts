jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Target_Email: { findUnique: jest.fn() },
    crm_Targets: { update: jest.fn() },
  },
}));
import { prismadb } from "@/lib/prisma";
import { GET } from "@/app/api/crm/targets/unsubscribe/route";

beforeEach(() => jest.clearAllMocks());

it("sets do_not_email for a valid token", async () => {
  (prismadb.crm_Target_Email.findUnique as jest.Mock).mockResolvedValue({ id: "e1", targetId: "t1" });
  const res = await GET(new Request("https://x/api/crm/targets/unsubscribe?token=tok"));
  expect(res.status).toBe(200);
  expect(prismadb.crm_Targets.update).toHaveBeenCalledWith({
    where: { id: "t1" },
    data: { do_not_email: true, do_not_email_at: expect.any(Date) },
  });
});

it("does not update for an unknown token", async () => {
  (prismadb.crm_Target_Email.findUnique as jest.Mock).mockResolvedValue(null);
  const res = await GET(new Request("https://x/api/crm/targets/unsubscribe?token=nope"));
  expect(res.status).toBe(200);
  expect(prismadb.crm_Targets.update).not.toHaveBeenCalled();
});
