jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prismadb: {} }));
jest.mock("@/lib/orders/service", () => ({ listOrders: jest.fn(), loadOrder: jest.fn(), createOrder: jest.fn(), updateDraft: jest.fn() }));
jest.mock("@/lib/orders/workflow", () => ({ submitOrder: jest.fn(), decideApproval: jest.fn(), changeStatus: jest.fn() }));

import { readFileSync } from "node:fs";
import * as svc from "@/lib/orders/service";
import * as wf from "@/lib/orders/workflow";
import { OrderError } from "@/lib/orders/types";
import { crmOrderTools } from "@/lib/mcp/tools/crm-orders";

const tool = (name: string) => crmOrderTools.find((t) => t.name === name)!;
const rep = { id: "rep", role: "user" as const };

beforeEach(() => jest.clearAllMocks());

it("is registered in allTools", () => {
  const index = readFileSync("lib/mcp/tools/index.ts", "utf8");
  expect(index).toContain('import { crmOrderTools } from "./crm-orders";');
  expect(index).toContain("...crmOrderTools,");
  expect(crmOrderTools.map((t) => t.name)).toEqual([
    "crm_list_orders", "crm_get_order", "crm_create_order", "crm_update_order",
    "crm_submit_order", "crm_decide_order_approval", "crm_set_order_status", "crm_cancel_order",
  ]);
});

it("hides other reps' orders as NOT_FOUND (Review Focus 3)", async () => {
  (svc.loadOrder as jest.Mock).mockRejectedValue(new OrderError("notFound"));
  await expect(tool("crm_get_order").handler({ id: "o9" } as never, "rep", rep)).rejects.toThrow("NOT_FOUND");
});

it("routes a rep's submit through the same approval rule", async () => {
  (wf.submitOrder as jest.Mock).mockResolvedValue({ status: "PENDING_APPROVAL" });
  await expect(tool("crm_submit_order").handler({ id: "o1" } as never, "rep", rep)).resolves.toEqual({ data: { status: "PENDING_APPROVAL" } });
  expect(wf.submitOrder).toHaveBeenCalledWith(rep, "o1");
});

it("maps forbidden, changed and pricing errors (Review Focus 4)", async () => {
  (wf.decideApproval as jest.Mock).mockRejectedValue(new OrderError("forbidden"));
  await expect(tool("crm_decide_order_approval").handler({ id: "o1", decision: "APPROVED" } as never, "rep", rep)).rejects.toThrow("FORBIDDEN");
  (wf.changeStatus as jest.Mock).mockRejectedValue(new OrderError("changed"));
  await expect(tool("crm_cancel_order").handler({ id: "o1" } as never, "rep", rep)).rejects.toThrow("CONFLICT");
  (svc.createOrder as jest.Mock).mockRejectedValue(new OrderError("pricing", "No exchange rate EUR → CZK"));
  await expect(tool("crm_create_order").handler({ accountId: "a", lines: [] } as never, "rep", rep)).rejects.toThrow("VALIDATION_ERROR: No exchange rate EUR → CZK");
});

it("passes status actions through", async () => {
  (wf.changeStatus as jest.Mock).mockResolvedValue({ status: "SENT" });
  await tool("crm_set_order_status").handler({ id: "o1", action: "advance", to: "SENT" } as never, "m", { id: "m", role: "manager" });
  expect(wf.changeStatus).toHaveBeenCalledWith({ id: "m", role: "manager" }, "o1", "advance", "SENT");
});
