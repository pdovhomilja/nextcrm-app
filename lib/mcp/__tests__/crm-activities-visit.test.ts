jest.mock("@/lib/prisma", () => ({ prismadb: {} }));
jest.mock("@/lib/crm/calendar/outbound-emit", () => ({ emitCalendarOutbound: jest.fn() }));

import { crmActivityTools } from "@/lib/mcp/tools/crm-activities";

const tool = (name: string) => crmActivityTools.find((t) => t.name === name)!;

it("accepts the visit type when listing and creating activities", () => {
  expect(tool("crm_list_activities").schema.safeParse({ type: "visit" }).success).toBe(true);
  const create = tool("crm_create_activity").schema.safeParse({ type: "visit", title: "Visit", date: new Date().toISOString(), links: [] });
  expect(create.error?.issues.find((i) => i.path[0] === "type")).toBeUndefined();
});
