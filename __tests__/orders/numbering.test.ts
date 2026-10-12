import { allocateNumber, previewNumber } from "@/lib/orders/numbering";
import { OrderError } from "@/lib/orders/types";

const now = new Date("2026-10-12T08:00:00Z");

it("formats the counter returned by the atomic update", async () => {
  const tx = { $queryRaw: jest.fn().mockResolvedValue([{ id: "s1", template: "ORD-{YYYY}-{####}", counter: 42, currentYear: 2026 }]) };
  await expect(allocateNumber(tx as never, "order", now)).resolves.toEqual({ number: "ORD-2026-0042", seriesId: "s1" });
  const sql = tx.$queryRaw.mock.calls[0][0];
  const text = sql.strings.join("?");
  expect(text).toContain(`UPDATE "NumberSeries"`);
  expect(text).toContain(`IS DISTINCT FROM`);
  expect(text).toContain(`RETURNING`);
  expect(sql.values).toEqual([2026, 2026, "order"]);
});

it("fails cleanly without an active default series", async () => {
  const tx = { $queryRaw: jest.fn().mockResolvedValue([]) };
  await expect(allocateNumber(tx as never, "order", now)).rejects.toEqual(new OrderError("noSeries"));
});

it("previews the next number for the admin screen", () => {
  expect(previewNumber("ORD-{YYYY}-{####}", 7, now)).toBe("ORD-2026-0008");
  expect(previewNumber("{###}", 0, now)).toBe("001");
});
