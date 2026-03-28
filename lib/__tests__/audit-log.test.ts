// lib/__tests__/audit-log.test.ts
import { diffObjects } from "../audit-log";

describe("diffObjects", () => {
  it("returns only changed fields", () => {
    const before = { name: "Acme", status: "Active", updatedAt: new Date() };
    const after  = { name: "Acme Corp", status: "Active", updatedAt: new Date() };
    const diff = diffObjects(before, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({ field: "name", old: "Acme", new: "Acme Corp" });
  });

  it("ignores internal fields", () => {
    const before = { name: "X", updatedAt: new Date("2020-01-01"), createdAt: new Date(), v: 0 };
    const after  = { name: "X", updatedAt: new Date("2025-01-01"), createdAt: new Date(), v: 1 };
    const diff = diffObjects(before, after);
    expect(diff).toHaveLength(0);
  });

  it("returns empty array when nothing changed", () => {
    const obj = { name: "Acme", status: "Active" };
    expect(diffObjects(obj, obj)).toHaveLength(0);
  });
});
