import { capImapUids } from "@/lib/email/sync-limits";

describe("capImapUids", () => {
  it("returns all uids when under max", () => {
    expect(capImapUids([1, 2, 3], 0, 10)).toEqual([1, 2, 3]);
  });

  it("keeps newest uids on first import", () => {
    expect(capImapUids([1, 2, 3, 4, 5], 0, 3)).toEqual([3, 4, 5]);
  });

  it("processes oldest new uids incrementally", () => {
    expect(capImapUids([10, 11, 12, 13], 9, 2)).toEqual([10, 11]);
  });
});
