const send = jest.fn(async () => ({}));
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn(async () => ({ emails: { send } })) }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_SystemSettings: { findUnique: jest.fn(async () => null) },
    users: { findMany: jest.fn(async () => [{ email: "a@oxo.test" }, { email: "b@oxo.test" }, { email: null }]) },
  },
}));

import { notifyApprovers } from "@/lib/orders/notify";

it("sends one approval mail per manager, so managers don't see each other's addresses (F4)", async () => {
  await notifyApprovers({ id: "o1", number: "ORD-1" });
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls.map((c: unknown[]) => (c[0] as { to: string[] }).to)).toEqual([["a@oxo.test"], ["b@oxo.test"]]);
});
