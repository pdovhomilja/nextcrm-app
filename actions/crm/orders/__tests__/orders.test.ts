jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prismadb: { users: { findUnique: jest.fn() } } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/orders/service", () => ({ createOrder: jest.fn(), updateDraft: jest.fn(), deleteDraft: jest.fn(), quoteLine: jest.fn() }));
jest.mock("@/lib/orders/workflow", () => ({ submitOrder: jest.fn(), decideApproval: jest.fn(), changeStatus: jest.fn() }));
jest.mock("@/lib/plugins/action-errors", () => ({ pluginRuleErrorMessage: jest.fn(async (e: unknown) => ((e as Error)?.message === "rule" ? "Company is protected until 1 Dec" : null)) }));

import { readFileSync } from "node:fs";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import * as svc from "@/lib/orders/service";
import * as wf from "@/lib/orders/workflow";
import { OrderError, ORDER_ERROR_CODES } from "@/lib/orders/types";
import { createOrder, decideOrderApproval, submitOrder } from "../orders";

const signIn = (role: string) => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
  ((prismadb as any).users.findUnique as jest.Mock).mockResolvedValue({ id: "u1", role, userStatus: "ACTIVE" });
};

beforeEach(() => jest.clearAllMocks());

it("refuses signed-out callers", async () => {
  (getSession as jest.Mock).mockResolvedValue(null);
  await expect(createOrder({ accountId: "a", lines: [] })).resolves.toEqual({ error: "Unauthorized" });
});

it("maps domain errors to keys and pricing errors to their message", async () => {
  signIn("user");
  (svc.createOrder as jest.Mock).mockRejectedValue(new OrderError("notFound"));
  await expect(createOrder({ accountId: "a", lines: [] })).resolves.toEqual({ error: "notFound" });
  (wf.submitOrder as jest.Mock).mockRejectedValue(new OrderError("pricing", "No exchange rate EUR → CZK"));
  await expect(submitOrder("o1")).resolves.toEqual({ error: "pricing:No exchange rate EUR → CZK" });
  (wf.decideApproval as jest.Mock).mockResolvedValue({ status: "READY" });
  await expect(decideOrderApproval("o1", "APPROVED")).resolves.toEqual({ data: { status: "READY" } });
});

it("has a translation for every error key in all four locales", () => {
  for (const loc of ["en", "cz", "de", "uk"]) {
    const errors = JSON.parse(readFileSync(`locales/${loc}.json`, "utf8")).OrdersPage.error;
    for (const code of [...ORDER_ERROR_CODES, "Unauthorized"]) expect([loc, code, typeof errors[code]]).toEqual([loc, code, "string"]);
  }
});

it("turns plugin rule rejections into a message instead of crashing (review I6)", async () => {
  signIn("user");
  (wf.submitOrder as jest.Mock).mockRejectedValue(new Error("rule"));
  await expect(submitOrder("o1")).resolves.toEqual({ error: "rule:Company is protected until 1 Dec" });
});
