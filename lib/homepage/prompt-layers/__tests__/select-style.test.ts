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

  describe("resolveStyleDirection (override > remembered > auto)", () => {
    it("returns the matching explicit override regardless of the hash pick", () => {
      // Pick a style the deterministic hash would NOT choose for this seed.
      const auto = pickStyleDirection("target-123", styles)!;
      const other = styles.find((s) => s.id !== auto.id)!;
      const picked = resolveStyleDirection("target-123", styles, { overrideId: other.id });
      expect(picked).toEqual(other);
      expect(picked!.id).not.toBe(auto.id);
    });

    it("an explicit override beats a remembered style", () => {
      const remembered = styles[2];
      const override = styles[7];
      const picked = resolveStyleDirection("target-123", styles, {
        overrideId: override.id,
        rememberedId: remembered.id,
      });
      expect(picked).toEqual(override);
    });

    it("reuses the remembered style when no override is given (not the hash)", () => {
      // Choose a remembered style the hash would NOT pick, to prove it wins over auto.
      const auto = pickStyleDirection("target-123", styles)!;
      const remembered = styles.find((s) => s.id !== auto.id)!;
      const picked = resolveStyleDirection("target-123", styles, { rememberedId: remembered.id });
      expect(picked).toEqual(remembered);
      expect(picked!.id).not.toBe(auto.id);
    });

    it("falls back to the deterministic pick when override and remembered are unknown/absent", () => {
      expect(
        resolveStyleDirection("target-123", styles, {
          overrideId: "nope",
          rememberedId: "also-nope",
        }),
      ).toEqual(pickStyleDirection("target-123", styles));
      expect(resolveStyleDirection("target-123", styles, null as never)).toEqual(
        pickStyleDirection("target-123", styles),
      );
      expect(resolveStyleDirection("target-123", styles)).toEqual(
        pickStyleDirection("target-123", styles),
      );
    });

    it("empty set -> null even with an override", () =>
      expect(resolveStyleDirection("x", [], { overrideId: "whatever" })).toBeNull());
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
