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
