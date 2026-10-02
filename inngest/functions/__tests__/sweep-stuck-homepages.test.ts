jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((_config: unknown, handler: unknown) => handler) },
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Target_Homepage: { updateMany: jest.fn() } },
}));

import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { STUCK_AFTER_MS } from "../sweep-stuck-homepages";

const createFunctionMock = inngest.createFunction as jest.Mock;
const config = createFunctionMock.mock.calls[0][0] as {
  id: string;
  triggers: { cron?: string }[];
};
const handler = createFunctionMock.mock.results[0].value as (ctx: {
  step: { run: (name: string, fn: () => unknown) => Promise<unknown> };
}) => Promise<unknown>;

const step = { run: (_n: string, f: () => unknown) => Promise.resolve().then(f) };
const updateMany = prismadb.crm_Target_Homepage.updateMany as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

it("runs on a cron trigger", () => {
  expect(config.id).toBe("homepage-sweep-stuck");
  expect(config.triggers.some((t) => typeof t.cron === "string")).toBe(true);
});

it("fails only PENDING/RUNNING rows older than the stuck threshold (soft-delete filtered)", async () => {
  updateMany.mockResolvedValue({ count: 2 });
  const before = Date.now();
  const out = await handler({ step });
  const after = Date.now();

  expect(out).toEqual({ failed: 2 });
  expect(updateMany).toHaveBeenCalledTimes(1);
  const arg = updateMany.mock.calls[0][0];
  expect(arg.where).toMatchObject({
    deletedAt: null,
    status: { in: ["PENDING", "RUNNING"] },
  });
  expect(arg.data.status).toBe("FAILED");
  expect(typeof arg.data.error).toBe("string");
  // cutoff is ~STUCK_AFTER_MS in the past.
  const cutoff = (arg.where.updatedAt.lt as Date).getTime();
  expect(cutoff).toBeGreaterThanOrEqual(before - STUCK_AFTER_MS - 50);
  expect(cutoff).toBeLessThanOrEqual(after - STUCK_AFTER_MS + 50);
});

it("reports zero when nothing is stuck", async () => {
  updateMany.mockResolvedValue({ count: 0 });
  await expect(handler({ step })).resolves.toEqual({ failed: 0 });
});
