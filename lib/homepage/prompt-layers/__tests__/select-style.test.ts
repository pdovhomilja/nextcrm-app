import { pickStyleDirection, resolveStyleDirection } from "../select-style";

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

  describe("resolveStyleDirection (one-shot override)", () => {
    it("returns the matching override regardless of the hash pick", () => {
      // Pick a style the deterministic hash would NOT choose for this seed.
      const auto = pickStyleDirection("target-123", styles)!;
      const other = styles.find((s) => s.id !== auto.id)!;
      const picked = resolveStyleDirection("target-123", styles, other.id);
      expect(picked).toEqual(other);
      expect(picked!.id).not.toBe(auto.id);
    });

    it("falls back to the deterministic pick when the override id is unknown", () => {
      expect(resolveStyleDirection("target-123", styles, "does-not-exist")).toEqual(
        pickStyleDirection("target-123", styles),
      );
    });

    it("falls back to the deterministic pick when no override is given", () => {
      expect(resolveStyleDirection("target-123", styles, null)).toEqual(
        pickStyleDirection("target-123", styles),
      );
      expect(resolveStyleDirection("target-123", styles)).toEqual(
        pickStyleDirection("target-123", styles),
      );
    });

    it("empty set -> null even with an override", () =>
      expect(resolveStyleDirection("x", [], "whatever")).toBeNull());
  });

  it("distributes roughly uniformly across styles for random UUID seeds", () => {
    const uuidStyles = Array.from({ length: 10 }, (_, i) => ({
      id: `00000000-0000-4000-8000-0000000057${i.toString(16).padStart(2, "0")}`,
      body: `b${i}`,
    }));
    const hex = () => Math.floor(Math.random() * 16).toString(16);
    const uuid4 = () =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) =>
        c === "x" ? hex() : (8 + Math.floor(Math.random() * 4)).toString(16)
      );
    const N = 5000;
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const id = pickStyleDirection(uuid4(), uuidStyles)!.id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const mean = N / uuidStyles.length; // 500
    for (const s of uuidStyles) {
      const c = counts.get(s.id) ?? 0;
      expect(c).toBeGreaterThan(mean * 0.6);
      expect(c).toBeLessThan(mean * 1.4);
    }
  });
});
