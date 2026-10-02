import { pickStyleDirection } from "../select-style";

const styles = Array.from({ length: 10 }, (_, i) => ({
  id: `s${i}`,
  body: `b${i}`,
}));

describe("pickStyleDirection", () => {
  it("is deterministic and order-independent", () => {
    const a = pickStyleDirection("target-123", styles);
    const b = pickStyleDirection("target-123", [...styles].reverse());
    expect(a).toEqual(b);
    expect(a).not.toBeNull();
  });

  it("empty set -> null", () =>
    expect(pickStyleDirection("x", [])).toBeNull());

  it("spreads across seeds", () => {
    const picks = new Set(
      Array.from({ length: 50 }, (_, i) =>
        pickStyleDirection(`t${i}`, styles)!.id
      )
    );
    expect(picks.size).toBeGreaterThan(3);
  });
});
