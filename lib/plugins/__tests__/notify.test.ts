const findMany = jest.fn();
const send = jest.fn();
jest.mock("@/lib/prisma-base", () => ({ prismaBase: { users: { findMany: (...a: unknown[]) => findMany(...a) } } }));
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn(async () => ({ emails: { send } })) }));
import { sendPluginNotification } from "@/lib/plugins/notify";

it("mails active users matching role (legacy roles mapped) or id, one message each (M8)", async () => {
  findMany.mockResolvedValue([
    { id: "u1", email: "a@x.cz", role: "admin" },
    { id: "u3", email: "c@x.cz", role: "user" },
    { id: "u4", email: "d@x.cz", role: "viewer" },
  ]);
  await sendPluginNotification("demo", { roles: ["admin"], userIds: ["u3"], subject: "S", text: "T" });
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userStatus: "ACTIVE" } }));
  const recipients = send.mock.calls.map((c) => c[0].to);
  expect(recipients.every((r) => typeof r === "string")).toBe(true);
  expect(recipients).toContain("a@x.cz");
  expect(recipients).toContain("c@x.cz");
  expect(recipients).not.toContain("d@x.cz");
});
